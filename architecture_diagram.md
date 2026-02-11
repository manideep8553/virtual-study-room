# Project Architecture Diagram

This diagram represents the technical structure of the **Virtual Study Room** project, highlighting the interaction between the React frontend, Node.js backend, and the P2P WebRTC communication layer.

```mermaid
flowchart LR
    Actor((Actor)) ==> Auth[Meeting ID / Auth]
    
    subgraph Clients [Devices]
        D[Desktop]
        M[Mobile]
    end
    
    Auth --> D & M
    D & M --- Net{Internet}
    Net --- Cloud([Global Cloud])
    
    subgraph System [Virtual Study Room]
        direction TB
        Hub[Signaling & Communication Hub]
        
        subgraph Features [Core Logic]
            direction LR
            RTC[P2P WebRTC Video]
            Sync[Pomodoro Timer]
            Share[Resource Sharing]
        end
        
        Hub --- Features
        Features --- G1[[Group Sessions]]
    end
    
    Cloud <==> Hub
    Features --- DB[(MongoDB)]

    style Actor fill:#f9f
    style Cloud fill:#e1f5fe
    style System fill:#f0f4f8,stroke-dasharray: 5 5
    style G1 fill:#e6fffa
```

### Component Details
- **Signaling & Communication Hub (Socket.io)**: Manages real-time data handover for video calls and event broadcasting for synchronized study tools.
- **WebRTC P2P Engine**: Enables direct peer-to-peer video/audio streaming for ultra-low latency communication.
- **Resource Sharing**: A centralized system for users to share PDFs, links, and study notes in real-time.
- **Pomodoro Timer**: A synchronized clock that keeps all participants on the same study-break schedule.
- **MongoDB Atlas**: Securely stores user profiles, room metadata, and shared resource links.
