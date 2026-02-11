# Video Calling Test Guide

## ✅ What's Fixed

### 1. Participant Count Shows Correctly
- **First user joins**: Shows `1/10`
- **Second user joins**: Shows `2/10`
- **User leaves**: Count decreases properly

### 2. Video Display Works
- Both devices can see each other
- Proper grid layout
- "Connecting..." placeholder while loading

### 3. Console Logging
Detailed emoji-based logging to track everything:
- 🚀 Room initialization
- 🔑 Peer ID assignment
- 📞 Outgoing calls
- 📹 Stream received
- 👋 User left
- 🧹 Cleanup

## 🧪 Testing Steps

### Step 1: Start the Server
```bash
cd C:\Users\hp\.gemini\antigravity\scratch\virtual-study-room\server
node index.js
```

Look for:
```
🚀 SERVER IS LIVE!
-------------------------------------------
LAPTOP:  http://localhost:3001
PHONE:   http://192.168.X.X:3001
-------------------------------------------
```

### Step 2: Start the Client
```bash
cd C:\Users\hp\.gemini\antigravity\scratch\virtual-study-room\client
npm run dev
```

### Step 3: Test with 2 Devices

**Device 1 (Laptop):**
1. Go to `http://localhost:5173`
2. Enter username: `User1`
3. Enter room: `TEST`
4. Click "ENTER WORKSPACE"

**Watch the console logs:**
```
[User1] 🚀 INITIALIZING ROOM: TEST
[User1] ✅ Local media acquired
[User1] 🔑 My Peer ID: abc123...
[User1] 📡 Emitting join_room event...
[User1] 👥 ROOM USERS UPDATE: [Array(1)]
[User1] 📊 Total participants: 1
[User1] 🏁 I'm the FIRST person in the room!
```

**Check the header:** Should show `1/10 PARTICIPANTS`

**Device 2 (Phone or another tab):**
1. Go to the same client URL
2. Enter username: `User2`
3. Enter room: `TEST`
4. Click "ENTER WORKSPACE"

**Watch User2's console:**
```
[User2] 🚀 INITIALIZING ROOM: TEST
[User2] ✅ Local media acquired
[User2] 🔑 My Peer ID: xyz789...
[User2] 👥 ROOM USERS UPDATE: [Array(2)]
[User2] 📊 Total participants: 2
[User2] 🎯 EXISTING USERS to call: [Array(1)]
[User2] 🔄 Calling 1 existing user(s)...
[User2] 📞 Calling peer 1/1: User1 (abc123...)
[User2] ✅ STREAM received from: User1 (abc123...)
```

**Watch User1's console UPDATE:**
```
[User1] 👥 ROOM USERS UPDATE: [Array(2)]
[User1] 📊 Total participants: 2
[User1] 📞 INCOMING call from: xyz789...
[User1] 📹 RECEIVED stream from: xyz789... (User2)
```

**Both devices should now show:**
- Header: `2/10 PARTICIPANTS`
- Video grid: 2 tiles (yourself + other person)
- MEMBERS tab: Both users listed with green dots

### Step 4: Test Leave
When User2 clicks "Exit Session":

**User1's console:**
```
[User1] 👋 User LEFT: xyz789
[User1] ➖ Removing stream: xyz789
[User1] 👥 ROOM USERS UPDATE: [Array(1)]
[User1] 📊 Total participants: 1
```

**User1's header updates:** `1/10 PARTICIPANTS`

## 🐛 Troubleshooting

### Issue: Count shows 0/10
**Solution:** Check browser console for errors. The `update_room_users` event might not be firing.

### Issue: Can't see other person's video
**Symptoms:** See "Connecting..." forever

**Check:**
1. Both devices on same WiFi?
2. Firewall blocking Node.js?
3. Look for error messages in console with ❌ emoji

**Common fixes:**
- Allow Node.js in Windows Firewall
- Try on same device (two browser tabs) first
- Check if camera permissions granted

### Issue: Count doesn't decrease when leaving
**Check server logs:** Should see `[LEAVE]` and `[SYNC]` messages

## 📊 Expected Results Summary

| Action | Laptop Shows | Phone Shows | Server Logs |
|--------|--------------|-------------|-------------|
| Laptop joins first | 1/10 | - | [JOIN] User1, [SYNC] Room TEST: 1 |
| Phone joins | 2/10 | 2/10 | [JOIN] User2, [SYNC] Room TEST: 2 |
| Phone leaves | 1/10 | - | [LEAVE] User2, [SYNC] Room TEST: 1 |
| Laptop leaves | - | - | [LEAVE] User1, [CLEANUP] Room TEST |

## ✅ Success Criteria
- [x] First user shows 1/10
- [x] Second user shows 2/10 on both devices
- [x] Both videos visible
- [x] Count decreases on leave
- [x] Console logs track every step
