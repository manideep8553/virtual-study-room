import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Shield, User, LayoutGrid, Timer, Monitor, XCircle } from 'lucide-react';
import Chat from './Chat';
import PomodoroTimer from './PomodoroTimer';
import Resources from './Resources';

const Room = ({ socket, roomId, roomName, username, onLeave, onRename }) => {
    // State
    const [myStream, setMyStream] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVidOn, setIsVidOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(username);
    const [showSidePanel, setShowSidePanel] = useState(window.innerWidth > 768);
    const [activeTab, setActiveTab] = useState('chat');
    const [status, setStatus] = useState('Connecting...');

    // Refs
    const myVideoRef = useRef();
    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const callsRef = useRef({});
    const screenTrackRef = useRef(null);
    const audioContextRef = useRef(null);

    // Audio Unblocker for mobile browsers
    useEffect(() => {
        const unlockAudio = () => {
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    audioContextRef.current = new AudioContext();
                }
            }
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            // Keep-alive heartbeat: Play a tiny silent oscillation to keep hardware active
            const osc = audioContextRef.current?.createOscillator();
            const gain = audioContextRef.current?.createGain();
            if (osc && gain) {
                gain.gain.value = 0.0001; // Inaudible
                osc.connect(gain);
                gain.connect(audioContextRef.current.destination);
                osc.start();
                setTimeout(() => osc.stop(), 100);
            }
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);
        const interval = setInterval(unlockAudio, 20000); // Periodic keep-alive
        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        let peer = null;
        let myMediaStream = null;
        let isMounted = true;

        const init = async () => {
            try {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: 'user'
                        },
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });
                    if (!isMounted) {
                        stream.getTracks().forEach(track => track.stop());
                        return;
                    }

                    streamRef.current = stream;
                    setMyStream(stream);
                    if (myVideoRef.current) {
                        myVideoRef.current.srcObject = stream;
                    }
                    myMediaStream = stream;
                } catch (err) {
                    if (!isMounted) return;
                    myMediaStream = new MediaStream();
                    streamRef.current = myMediaStream;
                }

                // 2. Create Peer
                setStatus('Establishing connection...');
                peer = new Peer(undefined, {
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' },
                            { urls: 'stun:stun3.l.google.com:19302' },
                            { urls: 'stun:stun4.l.google.com:19302' },
                            // Add public TURN servers from Open Relay Project (metered.ca)
                            // Note: For production it's highly recommended to use private TURN servers like Twilio or your own CoTURN instance
                            {
                                urls: "turn:openrelay.metered.ca:80",
                                username: "openrelayproject",
                                credential: "openrelayproject",
                            },
                            {
                                urls: "turn:openrelay.metered.ca:443",
                                username: "openrelayproject",
                                credential: "openrelayproject",
                            },
                            {
                                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                                username: "openrelayproject",
                                credential: "openrelayproject",
                            }
                        ],
                        iceCandidatePoolSize: 10
                    }
                });
                peerRef.current = peer;

                peer.on('open', (myPeerId) => {
                    setStatus('Live');
                    socket.emit('join_room', {
                        roomId,
                        username,
                        peerId: myPeerId
                    });
                });

                peer.on('error', () => {
                    setStatus('Connection issue');
                });

                // 3. Handle incoming calls
                peer.on('call', (call) => {
                    const callerPeerId = call.peer;
                    const callerUsername = call.metadata?.username || 'Peer';

                    console.log(`[Call] Incoming from ${callerUsername}. Tracks:`, myMediaStream?.getTracks().length);

                    call.on('stream', (remoteStream) => {
                        console.log(`[Stream] Received from: ${callerUsername}. Audio tracks: ${remoteStream.getAudioTracks().length}`);
                        setRemoteStreams(prev => ({
                            ...prev,
                            [callerPeerId]: {
                                stream: remoteStream,
                                username: callerUsername,
                                isVideoOn: call.metadata?.isVideoOn !== false,
                                isMicOn: call.metadata?.isMicOn !== false
                            }
                        }));
                    });

                    call.on('error', (err) => console.error("Call error:", err));
                    call.on('close', () => {
                        setRemoteStreams(prev => {
                            const updated = { ...prev };
                            delete updated[callerPeerId];
                            return updated;
                        });
                    });

                    callsRef.current[callerPeerId] = call;

                    // Critical: Answer with the stream only if it's ready, or Wait
                    const answerWithRetry = (attempts = 0) => {
                        if (myMediaStream && myMediaStream.getTracks().length > 0) {
                            call.answer(myMediaStream);
                        } else if (attempts < 5) {
                            setTimeout(() => answerWithRetry(attempts + 1), 500);
                        } else {
                            call.answer(new MediaStream()); // Fallback
                        }
                    };
                    answerWithRetry();
                });

                // 4. Socket events
                socket.on('existing_participants', (existingPeople) => {
                    console.log("Calling existing participants:", existingPeople.length);
                    existingPeople.forEach((person, idx) => {
                        setTimeout(() => {
                            console.log(`Calling ${person.username}...`);
                            const call = peer.call(person.peerId, myMediaStream, {
                                metadata: { username, isVideoOn: isVidOn, isMicOn: isMicOn }
                            });

                            if (call) {
                                call.on('stream', (remoteStream) => {
                                    console.log(`[Stream] Connected to: ${person.username}`);
                                    setRemoteStreams(prev => ({
                                        ...prev,
                                        [person.peerId]: {
                                            stream: remoteStream,
                                            username: person.username,
                                            isVideoOn: person.isVideoOn !== false,
                                            isMicOn: person.isMicOn !== false
                                        }
                                    }));
                                });
                                call.on('error', (err) => console.error("Peer call error:", err));
                                call.on('close', () => {
                                    setRemoteStreams(prev => {
                                        const updated = { ...prev };
                                        delete updated[person.peerId];
                                        return updated;
                                    });
                                });
                                callsRef.current[person.peerId] = call;
                            }
                        }, idx * 400);
                    });
                });

                socket.on('room_update', ({ participants: allParticipants }) => {
                    const others = allParticipants.filter(p => p.peerId !== peerRef.current?.id);
                    setParticipants(others);
                });

                socket.on('participant_left', (peerId) => {
                    setRemoteStreams(prev => {
                        const updated = { ...prev };
                        delete updated[peerId];
                        return updated;
                    });
                    if (callsRef.current[peerId]) {
                        callsRef.current[peerId].close();
                        delete callsRef.current[peerId];
                    }
                    setParticipants((prev) => prev.filter(p => p.peerId !== peerId));
                });

                socket.on('media_status_changed', ({ peerId, type, status }) => {
                    setParticipants(prev => prev.map(p => {
                        if (p.peerId === peerId) {
                            return type === 'audio' ? { ...p, isMicOn: status } : { ...p, isVideoOn: status };
                        }
                        return p;
                    }));

                    setRemoteStreams(prev => {
                        if (!prev[peerId]) return prev;
                        return {
                            ...prev,
                            [peerId]: {
                                ...prev[peerId],
                                [type === 'audio' ? 'isMicOn' : 'isVideoOn']: status
                            }
                        };
                    });
                });

                socket.on('nickname_changed', ({ peerId, newName }) => {
                    setRemoteStreams(prev => {
                        if (!prev[peerId]) return prev;
                        return {
                            ...prev,
                            [peerId]: { ...prev[peerId], username: newName }
                        };
                    });
                    setParticipants(prev => prev.map(p =>
                        p.peerId === peerId ? { ...p, username: newName } : p
                    ));
                });

            } catch (err) {
                console.error('Core Init Error:', err);
                setStatus('Failed to load');
            }
        };

        if (roomId && username) {
            init();
        }

        return () => {
            isMounted = false;
            console.log("Cleaning up room...");
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => {
                    t.stop();
                    console.log(`Stopped track: ${t.kind}`);
                });
            }
            if (peer) peer.destroy();
            socket.off('nickname_changed');
            socket.emit('leave_room', roomId);
        };
    }, [roomId, username, socket]);

    // Screen Share Logic
    const handleScreenShare = async () => {
        if (isScreenSharing) {
            // STOP SCREEN SHARE
            if (screenTrackRef.current) {
                screenTrackRef.current.stop();
            }
            if (streamRef.current) {
                const videoTrack = streamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                    Object.values(callsRef.current).forEach(call => {
                        const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                        if (sender) sender.replaceTrack(videoTrack);
                    });
                    if (myVideoRef.current) myVideoRef.current.srcObject = streamRef.current;
                }
            }
            setIsScreenSharing(false);
            socket.emit('toggle_media', { roomId, peerId: peerRef.current?.id, type: 'video', status: true });
        } else {
            // START SCREEN SHARE
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                screenTrack.onended = () => handleScreenShare(); // Handle UI stop button

                Object.values(callsRef.current).forEach(call => {
                    const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });

                if (myVideoRef.current) {
                    myVideoRef.current.srcObject = screenStream;
                }
                setIsScreenSharing(true);
                // Notify others that "Video" is on (even if camera was off, screen is now feeding)
                socket.emit('toggle_media', { roomId, peerId: peerRef.current?.id, type: 'video', status: true });

            } catch (err) {
                console.error("Failed to share screen", err);
            }
        }
    };

    const toggleMic = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            const micStatus = streamRef.current.getAudioTracks()[0]?.enabled ?? false;
            setIsMicOn(micStatus);
            socket.emit('toggle_media', {
                roomId,
                peerId: peerRef.current?.id,
                type: 'audio',
                status: micStatus
            });
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            const vidStatus = streamRef.current.getVideoTracks()[0]?.enabled ?? false;
            setIsVidOn(vidStatus);
            socket.emit('toggle_media', {
                roomId,
                peerId: peerRef.current?.id,
                type: 'video',
                status: vidStatus
            });
        }
    };

    const participantCount = Object.keys(remoteStreams).length + 1;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            display: 'flex'
        }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Minimal Overlay Header */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '24px 32px',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pointerEvents: 'none'
                }}>
                    <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {isRenaming ? (
                                <input
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onBlur={() => { setIsRenaming(false); if (newName !== username) onRename(newName); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setIsRenaming(false); if (newName !== username) onRename(newName); } }}
                                    style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', outline: 'none', width: '120px' }}
                                />
                            ) : (
                                <span onClick={() => setIsRenaming(true)} style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '0.02em', cursor: 'pointer' }}>
                                    {roomName ? roomName.toUpperCase() : roomId.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>{participantCount} LIVE</span>
                        </div>
                    </div>
                </div>

                {/* ZOOM-STYLE VIDEO GRID */}
                <div className="video-grid">
                    {/* My Video */}
                    <div className="video-cell self-video">
                        <video
                            ref={myVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', background: '#000' }}
                        />
                        {!isVidOn && (
                            <div className="camera-off-overlay">
                                <div className="avatar">{username.charAt(0).toUpperCase()}</div>
                                <span style={{ color: '#666', fontSize: '12px', marginTop: '12px', fontWeight: '600' }}>Camera Off</span>
                            </div>
                        )}
                        <div className="participant-tag">{username} (You)</div>
                        {!isMicOn && <div className="mic-off-tag"><MicOff size={14} /></div>}
                    </div>

                    {/* Remote Videos */}
                    {Object.entries(remoteStreams).map(([peerId, data]) => (
                        <div key={peerId} className="video-cell">
                            {/* 
                                IMPORTANT: VideoPlayer must ALWAYS be mounted for the audio to play, 
                                even if the camera (video track) is turned off. 
                            */}
                            <VideoPlayer
                                key={data.stream.id}
                                stream={data.stream}
                                isVideoOn={data.isVideoOn}
                                username={data.username}
                            />

                            {!data.isVideoOn && (
                                <div className="camera-off-overlay">
                                    <div className="avatar">{data.username?.charAt(0).toUpperCase()}</div>
                                    <span style={{ color: '#666', fontSize: '12px', marginTop: '12px', fontWeight: '600' }}>Camera Off</span>
                                </div>
                            )}
                            <div className="participant-tag">{data.username}</div>
                            {!data.isMicOn && <div className="mic-off-tag"><MicOff size={14} /></div>}
                        </div>
                    ))}

                    {/* Connecting Slots */}
                    {participants.filter(p => !remoteStreams[p.peerId]).map(p => (
                        <div key={p.peerId} className="video-cell connecting">
                            <div style={{ textAlign: 'center' }}>
                                <div className="avatar" style={{ margin: '0 auto 16px' }}>
                                    <Users size={32} />
                                </div>
                                <div style={{ color: '#f8fafc', fontWeight: '700', fontSize: '14px' }}>{p.username}</div>
                                <div style={{ color: '#444', fontSize: '10px', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase' }}>Connecting...</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FLOATING CONTROLS */}
                <div className="floating-controls" style={{
                    position: 'absolute',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    background: 'rgba(20, 20, 20, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '100px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                    zIndex: 200
                }}>
                    <button onClick={toggleMic} className={`control-btn ${!isMicOn ? 'off' : ''}`} title="Mute/Unmute">
                        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button onClick={toggleVideo} className={`control-btn ${!isVidOn ? 'off' : ''}`} title="Camera On/Off">
                        {isVidOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>

                    <div className="control-divider"></div>

                    <button onClick={() => { setActiveTab('chat'); setShowSidePanel(true); }} className={`control-btn ${showSidePanel && activeTab === 'chat' ? 'active' : ''}`} title="Chat">
                        <MessageSquare size={20} />
                    </button>
                    <button onClick={() => { setActiveTab('tools'); setShowSidePanel(true); }} className={`control-btn ${showSidePanel && activeTab === 'tools' ? 'active' : ''}`} title="Focus Timer">
                        <Timer size={20} />
                    </button>
                    <button onClick={() => { setActiveTab('share'); setShowSidePanel(true); }} className={`control-btn ${showSidePanel && activeTab === 'share' ? 'active' : ''}`} title="Resources & Screen">
                        <Monitor size={20} />
                    </button>

                    <button onClick={onLeave} className="control-btn hangup" title="Leave Room">
                        <PhoneOff size={20} />
                    </button>
                </div>
            </div>

            {/* Side Panel */}
            {showSidePanel && (
                <div style={{
                    width: '380px',
                    background: '#0f0f0f',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInRight 0.3s ease-out',
                    zIndex: 300
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em', color: '#888' }}>{activeTab}</span>
                        <XCircle size={20} onClick={() => setShowSidePanel(false)} style={{ cursor: 'pointer', color: '#666' }} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        {activeTab === 'chat' && <Chat socket={socket} roomId={roomId} username={username} />}
                        {activeTab === 'tools' && <div style={{ padding: '20px' }}><PomodoroTimer socket={socket} roomId={roomId} /></div>}
                        {activeTab === 'share' && (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px' }}>
                                    <button
                                        onClick={handleScreenShare}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: isScreenSharing ? '#ef4444' : '#333', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {isScreenSharing ? <><XCircle size={18} /> Stop Sharing</> : <><Monitor size={18} /> Share Screen</>}
                                    </button>
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <Resources socket={socket} roomId={roomId} username={username} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }

                .video-grid {
                    display: grid;
                    gap: 2px;
                    width: 100%;
                    height: 100vh;
                    background: #000;
                    grid-template-columns: ${participantCount === 1 ? '1fr' :
                    participantCount === 2 ? 'repeat(2, 1fr)' :
                        participantCount <= 4 ? 'repeat(2, 1fr)' :
                            'repeat(auto-fit, minmax(360px, 1fr))'};
                    grid-auto-rows: ${participantCount <= 2 ? '1fr' : '1fr'};
                }

                .video-cell {
                    position: relative;
                    background: #0a0a0a;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .participant-tag {
                    position: absolute;
                    bottom: 12px;
                    left: 12px;
                    background: rgba(0, 0, 0, 0.4);
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    color: white;
                    backdrop-filter: blur(8px);
                    z-index: 10;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .mic-off-tag {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(239, 68, 68, 0.9);
                    padding: 4px;
                    border-radius: 50%;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .camera-off-overlay {
                    position: absolute;
                    inset: 0;
                    background: #0a0a0a;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 5;
                }

                .avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: 700;
                    color: #555;
                }

                .control-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255, 255, 255, 0.08);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .control-btn:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-2px); }
                .control-btn.active { background: #8b5cf6; }
                .control-btn.off { background: #ef4444; }
                .control-btn.hangup { background: #ef4444; padding: 0 20px; border-radius: 100px; width: auto; }
                .control-btn.hangup:hover { background: #dc2626; }

                .control-divider {
                    width: 1px;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 0 4px;
                }

                @media (max-width: 768px) {
                    .video-grid { grid-template-columns: 1fr !important; }
                    .video-cell { aspect-ratio: 16/9; height: auto; }
                    .control-btn { width: 40px; height: 40px; }
                    .control-btn svg { width: 18px; height: 18px; }
                    .control-btn.hangup { padding: 0 12px; }
                    .floating-controls { 
                        padding: 6px 10px !important; 
                        gap: 4px !important;
                        bottom: 12px !important;
                        width: auto;
                        max-width: 98%;
                        justify-content: center;
                    }
                    .control-divider { margin: 0 2px; }
                }

                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

const VideoPlayer = ({ stream, isVideoOn, username }) => {
    const videoRef = useRef();
    const [needsInteraction, setNeedsInteraction] = useState(false);
    const [isAudioDetected, setIsAudioDetected] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (video && stream) {
            console.log(`[VideoPlayer:${username}] Attaching stream. Video: ${isVideoOn}`);

            // Check tracks
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log(`[VideoPlayer:${username}] Found audio track. Enabled: ${audioTracks[0].enabled}`);
                setIsAudioDetected(true);
                // Ensure audio track is enabled on the receiving end
                audioTracks.forEach(t => t.enabled = true);
            }

            video.srcObject = stream;

            const handlePlay = async () => {
                try {
                    video.volume = 1.0; // Ensure full volume
                    await video.play();
                    setNeedsInteraction(false);
                    console.log(`[VideoPlayer:${username}] Playback success. Tracks active:`, stream.getTracks().every(t => t.readyState === 'live'));
                } catch (e) {
                    console.warn(`[VideoPlayer:${username}] Autoplay blocked:`, e);
                    setNeedsInteraction(true);
                }
            };

            video.onloadedmetadata = handlePlay;
            if (video.readyState >= 1) handlePlay();

            // Listen for changes in stream (like tracks being added)
            stream.onactive = () => console.log(`[VideoPlayer:${username}] Stream active`);
            stream.oninactive = () => console.log(`[VideoPlayer:${username}] Stream inactive`);
        }
    }, [stream, username, isVideoOn]);

    const forcePlay = () => {
        if (videoRef.current) {
            videoRef.current.play().then(() => {
                setNeedsInteraction(false);
                console.log(`[VideoPlayer:${username}] Playback resumed after click`);
            }).catch(err => {
                console.error(`[VideoPlayer:${username}] Force play failed:`, err);
            });
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} onClick={forcePlay}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={false} // NEVER mute remote streams or you won't hear them!
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#000',
                    opacity: 1, // Keep ALWAYS visible to browser to avoid audio throttling
                    transition: 'opacity 0.3s ease-out',
                    pointerEvents: 'none'
                }}
            />
            {needsInteraction && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#8b5cf6',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '700',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ marginBottom: '8px', fontSize: '18px' }}>🔇 AUDIO BLOCKED</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>BROWSER REQUIRES A CLICK TO HEAR {username?.toUpperCase()}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Room;
