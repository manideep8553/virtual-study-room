import React, { useState } from 'react';

const Landing = ({ onJoin, socket }) => {
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [roomOccupancy, setRoomOccupancy] = useState(0);

    React.useEffect(() => {
        if (roomId.trim() && roomId.length > 2) {
            socket.emit('preview_room', roomId);

            const interval = setInterval(() => {
                if (socket.connected) {
                    socket.emit('preview_room', roomId);
                }
            }, 2000);

            const handleRoomCount = (data) => {
                if (data.roomId === roomId) {
                    setRoomOccupancy(data.count);
                }
            };

            socket.on('room_count', handleRoomCount);

            return () => {
                clearInterval(interval);
                socket.off('room_count', handleRoomCount);
            };
        } else {
            setRoomOccupancy(0);
        }
    }, [roomId, socket]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (username && roomId) {
            onJoin(username, roomId);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '40px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '100%',
                maxWidth: '450px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '10px',
                    textAlign: 'center'
                }}>
                    Virtual Study Room
                </h1>

                <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    textAlign: 'center',
                    marginBottom: '30px',
                    fontSize: '14px'
                }}>
                    Join or create a room to start collaborating
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Username Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '14px',
                            marginBottom: '8px',
                            fontWeight: '500'
                        }}>
                            Username
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        />
                    </div>

                    {/* Room ID Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '14px',
                            marginBottom: '8px',
                            fontWeight: '500'
                        }}>
                            Room ID
                        </label>
                        <input
                            type="text"
                            placeholder="Enter room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontFamily: 'monospace',
                                letterSpacing: '1px'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        />

                        {/* Room Occupancy Display */}
                        {roomId && (
                            <div style={{
                                marginTop: '10px',
                                padding: '10px 14px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '13px'
                                }}>
                                    Room Status:
                                </span>
                                <span style={{
                                    color: '#6366f1',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}>
                                    {roomOccupancy}/10 PARTICIPANTS
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Join Button */}
                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '10px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#4f46e5';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#6366f1';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Landing;
