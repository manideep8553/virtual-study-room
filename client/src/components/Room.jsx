import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Shield, User, LayoutGrid, Timer, Monitor, XCircle } from 'lucide-react';
import Chat from './Chat';
import PomodoroTimer from './PomodoroTimer';
import Resources from './Resources';

const Room = ({ socket, roomId, roomName, username, onLeave }) => {
    // State
    const [myStream, setMyStream] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVidOn, setIsVidOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState(window.innerWidth > 768);
    const [activeTab, setActiveTab] = useState('chat');
    const [status, setStatus] = useState('Connecting...');

    // Refs
    const myVideoRef = useRef();
    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const callsRef = useRef({});
    const screenTrackRef = useRef(null);

    useEffect(() => {
        let peer = null;
        let myMediaStream = null;
        let isMounted = true;

        const init = async () => {
            try {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
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
                            { urls: 'stun:stun2.l.google.com:19302' },
                            { urls: 'stun:stun3.l.google.com:19302' },
                            { urls: 'stun:stun4.l.google.com:19302' }
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

                    // Register stream handler BEFORE answering to ensure no events are missed
                    call.on('stream', (remoteStream) => {
                        console.log(`Incoming stream from ${callerUsername} (${callerPeerId})`);
                        setRemoteStreams(prev => {
                            // Deduplicate by username: Remove any old streams for the same user
                            const filtered = Object.fromEntries(
                                Object.entries(prev).filter(([id, data]) => data.username !== callerUsername)
                            );
                            return {
                                ...filtered,
                                [callerPeerId]: {
                                    stream: remoteStream,
                                    username: callerUsername,
                                    isVideoOn: true,
                                    isMicOn: true
                                }
                            };
                        });
                    });

                    call.on('close', () => {
                        setRemoteStreams(prev => {
                            const updated = { ...prev };
                            delete updated[callerPeerId];
                            return updated;
                        });
                    });

                    callsRef.current[callerPeerId] = call;

                    // Answer the call after setting up listeners
                    call.answer(myMediaStream);
                });

                // 4. Socket events
                socket.on('existing_participants', (existingPeople) => {
                    existingPeople.forEach((person, idx) => {
                        setTimeout(() => {
                            const call = peer.call(person.peerId, myMediaStream, {
                                metadata: { username }
                            });
                            if (call) {
                                call.on('stream', (remoteStream) => {
                                    setRemoteStreams(prev => {
                                        // Deduplicate by username: Remove any old streams for the same user
                                        const filtered = Object.fromEntries(
                                            Object.entries(prev).filter(([id, data]) => data.username !== person.username)
                                        );
                                        return {
                                            ...filtered,
                                            [person.peerId]: {
                                                stream: remoteStream,
                                                username: person.username,
                                                isVideoOn: true,
                                                isMicOn: true
                                            }
                                        };
                                    });
                                });
                                call.on('close', () => {
                                    setRemoteStreams(prev => {
                                        const updated = { ...prev };
                                        delete updated[person.peerId];
                                        return updated;
                                    });
                                });
                                callsRef.current[person.peerId] = call;
                            }
                        }, idx * 300);
                    });
                });

                socket.on('room_update', ({ participants: allParticipants }) => {
                    setParticipants(allParticipants);
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
                    if (peersRef.current[peerId]) peersRef.current[peerId].close();
                    setParticipants((prev) => prev.filter(p => p.peerId !== peerId));
                });

                socket.on('media_toggled', ({ peerId, type, status }) => {
                    setParticipants(prev => prev.map(p => {
                        if (p.peerId === peerId) {
                            return type === 'audio' ? { ...p, isMuted: !status } : { ...p, isVidOn: status };
                        }
                        return p;
                    }));
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
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (peer) peer.destroy();
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

    const participantCount = participants.length + 1; // +1 for self

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100%',
            background: '#0f172a',
            color: '#f8fafc',
            overflow: 'hidden',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Premium Header */}
                <header style={{
                    height: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 32px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}>
                            <Shield size={18} style={{ color: '#a78bfa' }} />
                            <span style={{ fontWeight: '800', fontSize: '14px', color: '#ddd6fe', letterSpacing: '0.02em' }}>
                                {roomName ? roomName.toUpperCase() : roomId.toUpperCase()}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'Live' ? '#10b981' : '#f59e0b', boxShadow: status === 'Live' ? '0 0 10px #10b981' : 'none' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: status === 'Live' ? '#34d399' : '#fbbf24', textTransform: 'uppercase' }}>
                                {participantCount} {status === 'Live' ? 'ONLINE' : status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onLeave}
                        style={{
                            padding: '10px 24px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#f87171'; }}
                    >
                        <PhoneOff size={18} /> Leave Room
                    </button>
                </header>

                {/* Video Grid */}
                <main style={{
                    flex: 1,
                    padding: '20px',
                    overflow: 'hidden',
                    background: '#0f172a',
                    display: 'block',
                    position: 'relative'
                }}>
                    <div className="video-grid">
                        {/* My Video Cell */}
                        <div className="video-cell" style={{
                            position: 'relative',
                            background: '#000',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            aspectRatio: participantCount === 1 ? '4/3' : '16/9', // Better for solo camera
                            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                            border: '2px solid rgba(139, 92, 246, 0.4)',
                            animation: 'fadeInUp 0.6s ease-out',
                            maxHeight: '75vh',
                            margin: '0 auto',
                            width: '100%'
                        }}>
                            <video
                                ref={myVideoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain', // Fixed cropping issue
                                    transform: 'scaleX(-1)',
                                    background: '#000'
                                }}
                            />
                            {!isVidOn && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        background: 'rgba(139, 92, 246, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid rgba(139, 92, 246, 0.4)'
                                    }}>
                                        <span style={{ fontSize: '40px', fontWeight: '800', color: '#a78bfa' }}>
                                            {username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#64748b' }}>Your Camera is Off</span>
                                </div>
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: '16px',
                                left: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    backdropFilter: 'blur(8px)',
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {username} (You)
                                </div>
                            </div>
                            {!isMicOn && (
                                <div style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(239, 68, 68, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                                }}>
                                    <MicOff size={16} style={{ color: 'white' }} />
                                </div>
                            )}
                        </div>

                        {/* Remote Video Cells */}
                        {Object.entries(remoteStreams)
                            .filter(([id]) => id !== peerRef.current?.id) // Strictly filter out myself
                            .map(([peerId, data]) => (
                                <div key={peerId} className="video-cell" style={{
                                    position: 'relative',
                                    background: '#1e293b',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    aspectRatio: '16/9',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                                    border: '2px solid rgba(255, 255, 255, 0.05)',
                                    animation: 'fadeInUp 0.6s ease-out'
                                }}>
                                    {data.isVideoOn ? (
                                        <VideoPlayer stream={data.stream} />
                                    ) : (
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                            gap: '16px'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '50%',
                                                background: 'rgba(139, 92, 246, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid rgba(139, 92, 246, 0.3)'
                                            }}>
                                                <span style={{ fontSize: '32px', fontWeight: '800', color: '#a78bfa' }}>
                                                    {data.username.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Camera Off</span>
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '16px',
                                        left: '16px',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        backdropFilter: 'blur(8px)',
                                        padding: '6px 14px',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {data.username}
                                    </div>

                                    {!data.isMicOn && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '16px',
                                            right: '16px',
                                            background: 'rgba(239, 68, 68, 0.8)',
                                            backdropFilter: 'blur(8px)',
                                            padding: '8px',
                                            borderRadius: '50%',
                                            boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                                        }}>
                                            <MicOff size={16} style={{ color: 'white' }} />
                                        </div>
                                    )}
                                </div>
                            ))}

                        {/* Connecting Slots - Only show if there are actual people connecting */}
                        {participants.length > 1 && participants.filter(p => p.peerId !== peerRef.current?.id && !remoteStreams[p.peerId]).map(p => (
                            <div key={p.peerId} style={{
                                position: 'relative',
                                background: 'rgba(30, 41, 59, 0.5)',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '2px dashed rgba(255, 255, 255, 0.1)',
                                aspectRatio: '16/9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 16px'
                                    }}>
                                        <Users size={24} style={{ color: '#475569' }} />
                                    </div>
                                    <div style={{ color: '#f8fafc', fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>{p.username}</div>
                                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Connecting...</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Floating Controls */}
                <footer style={{
                    position: 'absolute',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(16px)',
                    padding: '12px 24px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    zIndex: 20
                }}>
                    <button
                        onClick={toggleMic}
                        title={isMicOn ? "Turn Off Microphone" : "Turn On Microphone"}
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            background: isMicOn ? 'rgba(255, 255, 255, 0.05)' : '#ef4444',
                            border: '1px solid',
                            borderColor: isMicOn ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            color: 'white'
                        }}
                        onMouseEnter={e => { if (isMicOn) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { if (isMicOn) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                        {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        title={isVidOn ? "Turn Off Camera" : "Turn On Camera"}
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            background: isVidOn ? 'rgba(255, 255, 255, 0.05)' : '#ef4444',
                            border: '1px solid',
                            borderColor: isVidOn ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            color: 'white'
                        }}
                        onMouseEnter={e => { if (isVidOn) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { if (isVidOn) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                        {isVidOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>

                    <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>

                    <button
                        onClick={() => {
                            if (showSidePanel && activeTab === 'chat') {
                                setShowSidePanel(false);
                            } else {
                                setShowSidePanel(true);
                                setActiveTab('chat');
                            }
                        }}
                        title="Chat"
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            background: showSidePanel && activeTab === 'chat' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid',
                            borderColor: showSidePanel && activeTab === 'chat' ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            position: 'relative'
                        }}
                    >
                        <MessageSquare size={22} />
                        {!showSidePanel && <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', background: '#8b5cf6', borderRadius: '50%', border: '2px solid #0f172a' }}></div>}
                    </button>

                    <button
                        onClick={() => {
                            if (showSidePanel && (activeTab === 'members' || activeTab === 'tools' || activeTab === 'share')) {
                                setShowSidePanel(false);
                            } else {
                                setShowSidePanel(true);
                                setActiveTab('members');
                            }
                        }}
                        title="Options"
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            background: showSidePanel && (activeTab === 'members' || activeTab === 'tools' || activeTab === 'share') ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid',
                            borderColor: showSidePanel && (activeTab === 'members' || activeTab === 'tools' || activeTab === 'share') ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white'
                        }}
                    >
                        <LayoutGrid size={22} />
                    </button>
                </footer>
            </div >

            {/* Premium Side Panel */}
            <div className="side-panel" style={{
                width: '100%',
                maxWidth: '400px',
                height: '100%', // ensure full height on mobile
                position: 'absolute', // Absolute positioning for overlay on mobile
                right: 0,
                top: 0,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                display: showSidePanel ? 'flex' : 'none', // Toggle display based on showSidePanel
                flexDirection: 'column',
                // Persistent transform based on showSidePanel state
                transform: showSidePanel ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 1000,
                boxShadow: showSidePanel ? '-10px 0 40px rgba(0,0,0,0.5)' : 'none'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>
                        {activeTab === 'chat' ? 'CHAT SESSION' : activeTab === 'members' ? 'ROOM MEMBERS' : activeTab === 'share' ? 'SHARING' : 'STUDY TOOLS'}
                    </span>
                    <button
                        className="mobile-only"
                        onClick={() => setShowSidePanel(false)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '0 24px 24px' }}>
                    <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {activeTab === 'chat' ? (
                            <button
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: activeTab === 'chat' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                    color: activeTab === 'chat' ? '#a78bfa' : '#64748b'
                                }}
                            >CHAT</button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setActiveTab('members')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: activeTab === 'members' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                        color: activeTab === 'members' ? '#a78bfa' : '#64748b'
                                    }}
                                >PEOPLE</button>
                                <button
                                    onClick={() => setActiveTab('tools')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: activeTab === 'tools' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                        color: activeTab === 'tools' ? '#a78bfa' : '#64748b'
                                    }}
                                >TOOLS</button>
                                <button
                                    onClick={() => setActiveTab('share')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: activeTab === 'share' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                        color: activeTab === 'share' ? '#a78bfa' : '#64748b'
                                    }}
                                >SHARE</button>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* Chat Tab - Always Mounted, Hidden via Display */}
                    <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
                        <Chat socket={socket} roomId={roomId} username={username} />
                    </div>

                    {/* Members Tab */}
                    <div style={{ display: activeTab === 'members' ? 'flex' : 'none', height: '100%', flexDirection: 'column', padding: '24px', gap: '12px', overflowY: 'auto' }}>
                        {participants.map(p => (
                            <div key={p.peerId} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '800',
                                    boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)'
                                }}>
                                    {p.username.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                                        {p.username} {p.peerId === peerRef.current?.id && '(You)'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: remoteStreams[p.peerId] || p.peerId === peerRef.current?.id ? '#10b981' : '#f59e0b' }}></div>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                                            {remoteStreams[p.peerId] || p.peerId === peerRef.current?.id ? 'Connected' : 'Connecting...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tools Tab */}
                    <div style={{ display: activeTab === 'tools' ? 'flex' : 'none', height: '100%', flexDirection: 'column', overflowY: 'auto' }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <PomodoroTimer />
                            </div>
                        </div>
                    </div>

                    {/* Share Tab */}
                    <div style={{ display: activeTab === 'share' ? 'flex' : 'none', height: '100%', flexDirection: 'column', overflowY: 'auto' }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ padding: '20px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.1)', marginBottom: '24px' }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', letterSpacing: '0.05em' }}>
                                    <Monitor size={16} /> PRESENTATION
                                </h3>
                                <button
                                    onClick={handleScreenShare}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '14px',
                                        border: 'none',
                                        background: isScreenSharing ? '#ef4444' : '#8b5cf6',
                                        color: 'white',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                        boxShadow: isScreenSharing ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(139, 92, 246, 0.3)'
                                    }}
                                >
                                    {isScreenSharing ? (
                                        <><XCircle size={18} /> Stop Sharing</>
                                    ) : (
                                        <><Monitor size={18} /> Share Screen</>
                                    )}
                                </button>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '12px', color: '#64748b', fontWeight: '800', letterSpacing: '0.1em' }}>SHARED RESOURCES</h3>
                            </div>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <Resources socket={socket} roomId={roomId} username={username} />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                /* Overhauled Dynamic Video Grid System */
                .video-grid {
                    display: grid;
                    gap: 16px;
                    width: 100%;
                    height: 100%;
                    padding: 10px;
                    box-sizing: border-box;
                    align-items: center;
                    justify-content: center;
                    overflow-y: auto;
                    
                    /* Laptop Logic */
                    grid-template-columns: ${participantCount === 1 ? '1fr' :
                    participantCount === 2 ? 'repeat(2, 1fr)' :
                        participantCount === 3 ? 'repeat(2, 1fr)' :
                            'repeat(auto-fit, minmax(350px, 1fr))'
                };
                }

                .video-cell {
                    background: #111827;
                    border-radius: 16px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    margin: auto;
                    aspect-ratio: 16/9;
                    max-height: ${participantCount <= 2 ? '70vh' : '40vh'};
                }

                /* Special handling for the 3rd participant on Laptop (2 on top, 1 on bottom) */
                ${participantCount === 3 ? `
                    .video-cell:last-child {
                        grid-column: span 2;
                        max-width: 50%;
                        margin: 0 auto;
                    }
                ` : ''}

                .video-cell video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain; /* CRITICAL: Never cut the video */
                    background: #000;
                }

                /* Mobile Dynamic Adjustments */
                @media (max-width: 768px) {
                    .video-grid {
                        grid-template-columns: ${participantCount > 1 ? 'repeat(2, 1fr)' : '1fr'} !important;
                        grid-auto-rows: min-content;
                        padding: 8px !important;
                        gap: 8px !important;
                    }

                    .video-cell {
                        aspect-ratio: 1/1 !important; /* Square for mobile grid */
                        max-height: 30vh !important;
                    }

                    ${participantCount % 2 !== 0 ? `
                        .video-cell:last-child {
                            grid-column: span 2 !important;
                            max-width: 100% !important;
                        }
                    ` : ''}
                     main {
                        padding: 12px !important;
                        padding-bottom: 100px !important; 
                        overflow-y: auto !important;
                    }
                }
       /* Adjust header/footer for mobile */
                     header {
                        padding: 0 16px !important;
                    }
                    
                    footer {
                        width: calc(100% - 32px) !important;
                        bottom: 24px !important;
                    }
                }

                .mobile-only { display: none; }
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div >
    );
};

const VideoPlayer = ({ stream }) => {
    const videoRef = useRef();

    useEffect(() => {
        const video = videoRef.current;
        if (video && stream) {
            video.srcObject = stream;

            const handlePlay = () => {
                video.play().catch(err => {
                    console.error("Video play failed:", err);
                });
            };

            // Try to play immediately if metadata is loaded, otherwise wait
            if (video.readyState >= 1) {
                handlePlay();
            } else {
                video.onloadedmetadata = handlePlay;
            }
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false} // Explicitly ensure audio is ON for remote streams
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000'
            }}
        />
    );
};

export default Room;
