require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log(' MongoDB Connected Successfully'))
    .catch(err => console.log(' DB Connection Error:', err));
} else {
  console.log('⚠️  No MONGODB_URI found in .env. Persistence disabled.');
}

// Room Schema for DB Persistence
const roomSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  tag: String,
  participants: [{
    socketId: String,
    username: String,
    peerId: String
  }],
  createdAt: { type: Date, default: Date.now }
});

const RoomModel = mongoose.model('Room', roomSchema);

// Message Schema for Chat Persistence
const messageSchema = new mongoose.Schema({
  roomId: String,
  username: String,
  message: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});

const MessageModel = mongoose.model('Message', messageSchema);

// User Schema for Persistence
const userSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  email: String,
  avatar: String,
  joinedAt: { type: Date, default: Date.now }
});

const UserModel = mongoose.model('User', userSchema);

// Resource Schema for File Sharing
const resourceSchema = new mongoose.Schema({
  roomId: String,
  sender: String,
  fileName: String,
  fileType: String,
  fileData: String, // Base64 string
  createdAt: { type: Date, default: Date.now }
});

const ResourceModel = mongoose.model('Resource', resourceSchema);

// Seed Initial Rooms if DB is empty
async function seedRooms() {
  const count = await RoomModel.countDocuments();
  if (count === 0) {
    const defaultRooms = [
      { id: 'maths', name: 'Mathematics & Calculus', description: 'Advanced calculus and linear algebra collaboration group.', tag: 'Academic' },
      { id: 'social', name: 'Social Studies & History', description: 'Discussing world history and modern social structures.', tag: 'Theories' },
      { id: 'design', name: 'UI/UX Design Studio', description: 'Creative workspace for designers and front-end devs.', tag: 'Creative' },
      { id: 'coding', name: 'Competitive Coding', description: 'Algorithms, data structures and LeetCode problems.', tag: 'Technical' }
    ];
    await RoomModel.insertMany(defaultRooms);
    console.log('Default rooms seeded in MongoDB');
  }
}
seedRooms();

// In-Memory Fallback for active state (or you could use the DB directly)
// Handling active participants in-memory is usually faster for WebRTC signaling
const activeParticipants = new Map(); // roomId -> Set of participant objects

async function getRoomInfo(roomId) {
  const room = await RoomModel.findOne({ id: roomId });
  const active = activeParticipants.get(roomId) || new Set();
  return {
    participants: Array.from(active),
    count: active.size,
    dbInfo: room
  };
}

async function broadcastRoomUpdate(roomId) {
  const info = await getRoomInfo(roomId);

  // Send to people IN the room
  io.to(roomId).emit('room_update', {
    participants: info.participants,
    count: info.count
  });

  // Send count to people on lobby/explorer
  io.to(`lobby_${roomId}`).emit('room_count', {
    roomId,
    count: info.count
  });

  console.log(`Room [${roomId}]: ${info.count} active`);
}

io.on('connection', (socket) => {
  console.log(` Socket connected: ${socket.id}`);

  // User wants to preview room count
  socket.on('preview_room', async (roomId) => {
    socket.join(`lobby_${roomId}`);
    const info = await getRoomInfo(roomId);
    socket.emit('room_count', { roomId, count: info.count });
  });

  // User Auth / Persistence
  socket.on('register_user', async (userData) => {
    try {
      const mode = userData.mode || 'login'; // default to login for safety

      // Try finding by email
      let user = await UserModel.findOne({ email: userData.email });

      if (mode === 'login') {
        if (!user) {
          return socket.emit('auth_error', 'Account not found. Please register first.');
        }
        return socket.emit('user_registered', user);
      }

      if (mode === 'register') {
        if (user) {
          return socket.emit('auth_error', 'Account already exists. Please login instead.');
        }

        // Create new user
        const nameToUse = userData.name || userData.email.split('@')[0];
        user = await UserModel.create({
          name: nameToUse,
          email: userData.email,
          avatar: nameToUse.charAt(0).toUpperCase()
        });
        console.log(`👤 New user registered: ${user.name}`);
        return socket.emit('user_registered', user);
      }

    } catch (err) {
      console.log('❌ Error registering user:', err);
      socket.emit('auth_error', 'Authentication failed on server.');
    }
  });

  // Fetch Platform Stats
  socket.on('get_stats', async () => {
    try {
      const userCount = await UserModel.countDocuments();
      const roomCount = await RoomModel.countDocuments();
      const messageCount = await MessageModel.countDocuments();

      socket.emit('stats_data', {
        users: userCount,
        rooms: roomCount,
        messages: messageCount,
        activeNow: [...activeParticipants.values()].reduce((acc, set) => acc + set.size, 0)
      });
    } catch (err) {
      console.log(' Error fetching stats:', err);
    }
  });

  // Fetch all rooms from DB
  socket.on('get_rooms', async () => {
    const rooms = await RoomModel.find({});
    socket.emit('rooms_list', rooms);
  });

  // User joins a room
  socket.on('join_room', async ({ roomId, username, peerId, isVideoOn, isMicOn }) => {
    console.log(` ${username} joining room [${roomId}]`);

    socket.leave(`lobby_${roomId}`);
    socket.join(roomId);
    socket.peerId = peerId;
    socket.username = username;

    // Fetch message history
    const history = await MessageModel.find({ roomId }).sort({ createdAt: 1 }).limit(50);
    socket.emit('message_history', history);

    // Add to active memory
    if (!activeParticipants.has(roomId)) {
      activeParticipants.set(roomId, new Set());
    }

    const participants = activeParticipants.get(roomId);

    // Remove stale data for this peer/socket/username to prevent duplicates
    const participantsArray = Array.from(participants);
    const filtered = participantsArray.filter(p =>
      p.socketId !== socket.id &&
      p.peerId !== peerId &&
      p.username !== username
    );

    const newParticipant = {
      socketId: socket.id,
      username,
      peerId,
      isVideoOn: isVideoOn !== undefined ? isVideoOn : true,
      isMicOn: isMicOn !== undefined ? isMicOn : true
    };
    const updatedSet = new Set(filtered);
    updatedSet.add(newParticipant);
    activeParticipants.set(roomId, updatedSet);

    // Signaling
    socket.emit('existing_participants', filtered);
    socket.to(roomId).emit('new_participant', newParticipant);

    broadcastRoomUpdate(roomId);
  });

  socket.on('send_message', async ({ roomId, message, username }) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Save to DB
    await MessageModel.create({ roomId, username, message, time });

    io.to(roomId).emit('receive_message', {
      id: Date.now().toString(),
      username,
      message,
      time
    });
  });

  socket.on('delete_room', async (roomId) => {
    console.log(` Deleting room: ${roomId}`);
    try {
      await RoomModel.deleteOne({ id: roomId });
      activeParticipants.delete(roomId);

      // Notify everyone the room is gone
      io.emit('room_deleted', roomId);

      // Eject anyone inside
      const roomClients = io.sockets.adapter.rooms.get(roomId);
      if (roomClients) {
        io.to(roomId).emit('eject_from_room');
      }
    } catch (err) {
      console.log(' Error deleting room:', err);
    }
  });

  socket.on('create_room', async (roomData) => {
    console.log(`Creating room: ${roomData.name}`);
    try {
      await RoomModel.create(roomData);
      // Notify everyone about the new room
      io.emit('room_created', roomData);
    } catch (err) {
      console.log('Error creating room:', err);
    }
  });

  socket.on('toggle_media', ({ roomId, peerId, type, status }) => {
    socket.to(roomId).emit('media_status_changed', { peerId, type, status });

    // Update state in server
    const participants = activeParticipants.get(roomId);
    if (participants) {
      const pArray = Array.from(participants);
      const person = pArray.find(p => p.peerId === peerId);
      if (person) {
        if (type === 'video') person.isVideoOn = status;
        if (type === 'audio') person.isMicOn = status;
        activeParticipants.set(roomId, new Set(pArray));
      }
    }
  });

  // Resource Sharing
  socket.on('share_file', async (fileData) => {
    try {
      const resource = await ResourceModel.create(fileData);
      io.to(fileData.roomId).emit('new_file', resource);
    } catch (err) {
      console.log(' Error sharing file:', err);
    }
  });

  socket.on('get_files', async (roomId) => {
    try {
      const files = await ResourceModel.find({ roomId }).sort({ createdAt: -1 });
      socket.emit('files_list', files);
    } catch (err) {
      console.log(' Error fetching files:', err);
    }
  });

  socket.on('disconnecting', () => {
    const socketRooms = Array.from(socket.rooms);

    socketRooms.forEach(async (roomId) => {
      if (roomId === socket.id || roomId.startsWith('lobby_')) return;

      if (activeParticipants.has(roomId)) {
        const participants = activeParticipants.get(roomId);
        const pArray = Array.from(participants);
        const person = pArray.find(p => p.socketId === socket.id);

        if (person) {
          console.log(`👋 ${person.username} left [${roomId}]`);
          const filtered = pArray.filter(p => p.socketId !== socket.id);

          if (filtered.length === 0) {
            activeParticipants.delete(roomId);
          } else {
            activeParticipants.set(roomId, new Set(filtered));
          }

          socket.to(roomId).emit('participant_left', person.peerId);
          broadcastRoomUpdate(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n VIDEO CALL SERVER RUNNING ON PORT ${PORT}`);
});
