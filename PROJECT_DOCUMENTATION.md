# Virtual Study Room - Complete Technical Documentation

## 1. Project Overview
The Virtual Study Room is a real-time collaborative web application designed to simulate a physical study environment. It allows users to create persistent rooms, join video calls, chat in real-time, and track their study statistics.

The core philosophy is **"Real-Time Interaction"**—changes made by one user (like turning off a camera, sending a message, or deleting a room) are instantly reflected for everyone else.

---

## 2. File Structure & Purpose

### Root Directory
*   **.gitignore**:
    *   **What it is**: A configuration file for Git (version control).
    *   **Purpose**: It tells Git which files **NOT** to upload to the code repository.
    *   **Why?**: We ignore `node_modules` (because it's huge and can be re-installed) and `.env` (because it contains secrets/passwords).
*   **package.json**:
    *   **What it is**: The project manifesto (like a recipe).
    *   **Purpose**: Lists all the libraries (`dependencies`) the project needs to run (like React, Socket.IO) and the scripts to start it (`npm run dev`).
*   **package-lock.json**:
    *   **What it is**: The detailed receipt.
    *   **Purpose**: While `package.json` might say simple things like "react", this file locks down the *exact* version (e.g., "react version 18.2.0") and every sub-dependency. This ensures that every developer working on the project has the exact same setup.
*   **node_modules/**:
    *   **What it is**: The Pantry.
    *   **Purpose**: This is where all the code for the libraries (React, Vite, etc.) actually lives. It contains thousands of files.
    *   **Note**: We **NEVER** edit files inside here. If you delete this folder, you can just run `npm install` to get it back (using the recipe from `package.json`).

### `client/` (The Frontend)
*   **`client/src/main.jsx`**: The entry point. It finds the HTML element `<div id="root">` and injects our React app into it.
*   **`client/src/App.jsx`**: The main container. It decides *which* page to show (Login vs. Dashboard vs. Room).
*   **`client/src/components/`**: The detailed building blocks.
    *   **`Room.jsx`**: The complex video-calling screen.
    *   **`RoomList.jsx`**: The dashboard showing all available rooms.
    *   **`Login.jsx`**: The entry screen.

### `server/` (The Backend)
*   **`server/index.js`**: The brains of the operation. It runs the web server, connects to the database, and manages all real-time traffic.
*   **`server/.env`**: Secret configuration variables (like the Database URL).

---

## 3. Frontend Code Deep Dive (Client)

### A. HTML Structure (`index.html`)
This is the skeleton. It is very empty because React builds the interface dynamically.
*   **`<div id="root"></div>`**: The single empty container where our entire React app lives.

### B. CSS & Styling
We use **Inline CSS** (JavaScript objects style) and **Glassmorphism**.
*   **Glassmorphism**: This gives the "frosted glass" look.
    *   Code: `backdropFilter: 'blur(20px)', background: 'rgba(255, 255, 255, 0.1)'`
    *   **How it works**: It blurs whatever is *behind* the element, making it look like a floating glass pane.
*   **Responsiveness**: We use **Media Queries**.
    *   Code: `@media (max-width: 768px) { ... }`
    *   **Purpose**: If the screen is smaller than a tablet (768px), we change the layout (e.g., hiding the side panel, stacking the video grid).

### C. JavaScript & React Logic

#### 1. `Room.jsx` (The Video Engine)
This file handles the hardest part: **Video Calls**.
*   **`useEffect()`**:
    *   **Role**: Runs code *after* the screen loads. We use this to ask for camera permission (`getUserMedia`) and connect to the socket server.
    *   **Cleanup**: When you leave the page, the `return () => { ... }` function runs. This stops your camera (`track.stop()`) so the light goes off on your laptop.
*   **`useRef()`**:
    *   **Role**: A "Box" that holds values that don't trigger a re-render.
    *   **Why use it?**: Storing the video stream in `ref` is faster and prevents glitches when the UI updates.

#### 2. `RoomList.jsx` (The Lobby)
*   **Socket Listeners**:
    *   `socket.on('rooms_list', ...)`: When the server sends the list of rooms, this updates the screen.
    *   `socket.on('room_created', ...)`: When *someone else* makes a room, it pops up on your screen instantly.

---

## 4. Backend Code Deep Dive (Server)

### A. Node.js & Express
*   **`express()`**: Creates the web server application.
*   **`server.listen(3001)`**: Opens a "door" on port 3001 so the frontend can connect.

### B. Socket.IO (The Real-Time Manager)
Socket.IO creates a persistent "Tunnel" between every user and the server.
*   **`io.on('connection', (socket) => ...)`**: Runs every time a new user opens the website.
*   **`socket.join(roomId)`**: specific command that puts a user in a "Room". Messages sent to this room (`io.to(roomId).emit(...)`) only go to people in that room.

### C. Database (MongoDB & Mongoose)
*   **`mongoose.connect(...)`**: Connects the server to your MongoDB database.
*   **Schemas**:
    *   **`RoomModel`**: Defines what a "Room" looks like (name, description, participants).
    *   **`UserModel`**: Defines what a "User" looks like (name, email).
*   **Operations**:
    *   **`.create()`**: Saves new data (e.g., creating a new room).
    *   **`.find()`**: Gets all data (e.g., showing the room list).
    *   **`.deleteOne()`**: Deletes data (e.g., removing a room).

---

## 5. How Video Calling Works (The "Magic")

Video calling is achieved using **WebRTC (Web Real-Time Communication)** via the **PeerJS** library. Here is the step-by-step flow:

1.  **Media Access**:
    *   Code: `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
    *   Action: The browser asks for permission and gets the raw video/audio stream from your hardware.

2.  **Peer Identification**:
    *   Code: `new Peer()`
    *   Action: Each user connects to a public PeerJS server and receives a unique "Peer ID" (like a phone number).

3.  **Signaling (The Handshake)**:
    *   WebRTC needs a way for computers to find each other. We use **Socket.IO** as the "Signal Server".
    *   Event: When User A joins, they emit `join_room` with their `peerId`.
    *   Server: Broadcasts `new_participant` to everyone else in the room.

4.  **The Call**:
    *   Existing users receive the `new_participant` event.
    *   Code: `peer.call(newUserId, myStream)`
    *   Action: They "call" the new user using their Peer ID, sending their video stream.

5.  **Answering**:
    *   User A receives the call.
    *   Code: `call.answer(myStream)`
    *   Action: User A answers and sends *their* video stream back.
    *   Result: Both users can now see and hear each other (Peer-to-Peer).

6.  **Media State Management**:
    *   When you toggle your mic/camera, we don't just stop the track locally.
    *   Event: `emit('toggle_media', { type: 'video', status: false })`
    *   Server: Forwards this to everyone.
    *   Client: Other users receive `media_status_changed` and update their UI to show your "Camera Off" avatar instead of a black screen.
