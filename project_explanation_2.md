# Virtual Study Room Project Explanation

This document provides a comprehensive overview of the **Virtual Study Room** project, including its architecture, core technologies, and implementation details for your reviewer.

---

## 1. Project Structure & Core Files

### **Frontend (React + Vite)**
*   **`index.html`**: The entry point of the application. It provides the `#root` div where the entire React app is mounted.
*   **`main.jsx`**: The Javascript entry point. It initializes React and renders the `<App />` component into the DOM.
*   **`App.jsx`**: The orchestrator of the frontend. It manages routing (Login, Dashboard, Room) and global state (User authentication).
*   **`index.css`**: The design system. It contains global variables (colors, fonts) and the base "Premium" styling used across the site.
*   **`App.css`**: Specific layout styling for the main application wrapper and navigation.

### **Backend (Node.js + Express)**
*   **`server/index.js`**: The heart of the backend. It manages:
    1.  **Database Connection**: Using Mongoose to connect to MongoDB.
    2.  **Socket.io Server**: Handling real-time messaging and video call signaling.
    3.  **Persistence**: Saving chat history, room metadata, and shared files.

---

## 2. Real-Time Communication (Video Calling)

The system uses a **Signaling + Peer-to-Peer** model.

### **The Technology Trio**
1.  **Socket.io (Signaling)**: In WebRTC, two people can't just talk directly without knowing each other's "addresses." Socket.io acts as the middleman (The Signaling Server). It exchanges "Peer IDs" between users so they can find each other.
2.  **WebRTC (The Engine)**: A browser-native technology that allows browsers to send video and audio directly to each other (Peer-to-Peer). This ensures low latency and high privacy as the video data never touches our server.
3.  **Peer.js (The Orchestrator)**: A library that wraps the complex WebRTC API into a simple "Call/Answer" flow. It generates a unique ID for your device and handles the connection handshake.

### **How Video Calling Works**
1.  **Capture**: Your browser requests camera/mic access via `navigator.mediaDevices.getUserMedia`.
2.  **Join**: When you enter a room, Socket.io broadcasts your `PeerID` to everyone already inside.
3.  **Connect**:
    *   Existing members "Call" your ID.
    *   Your device "Answers" and sends your video stream back.
    *   The `Room.jsx` component receives these streams and renders them in the dynamic grid.

---

## 3. Network Architecture (Hosts & Ports)

*   **Port 5173 (Vite/Frontend)**: This is the local development server for the user interface. It serves the HTML/CSS/JS files to your browser.
*   **Port 3001 / 5001 (Node.js Backend)**: 
    *   **3001** is the default port for our signaling server. 
    *   **5001** is often used as a fallback or for specialized services like the PeerJS server or a separate API. 
    *   In your setup, the Frontend (5173) talks to the Backend (3001/5001) to fetch room data and signal video calls.

---

## 4. Technical Efficiency & Synchronization

### **Real-Time Synergy**
The application is built on a high-concurrency model designed for zero-delay synchronization.

*   **Broadcast Algorithms**: We use custom event-based broadcasting via Socket.io to ensure that the Pomodoro Timer remains accurate across all participants. If the host starts a timer, the delay to other participants is measured in milliseconds.
*   **Latency vs. Quality**: 
    *   To maintain "Real-Time" communication, the system prioritizes **Latency** (Time-to-Ear/Eye) over visual perfection. 
    *   **Why is this efficient?** By utilizing adaptive bitrates, the virtual room remains stable even on weaker connections, ensuring the study session is never interrupted by buffering.

---

## 5. Why this project is Robust
*   **Race Condition Handling**: We implemented logic to ensure media listeners are active *before* a call is answered, preventing "silent calls."
*   **Dynamic Grid**: Uses a custom CSS Grid algorithm to rearrange participants side-by-side automatically based on counts (1, 2, 4, 6+).
*   **Cross-Device Audio**: Features explicit `.play()` triggers to bypass browser "Autoplay" blocks, ensuring users hear each other immediately.
---

**Summary for Reviewer:**
This is a **Full-Stack MERN (MongoDB, Express, React, Node)** application utilizing **WebRTC** for P2P communication. It solves complex real-time synchronization issues using a custom signaling layer implemented with **Socket.io**.
