import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

const RoomList = ({ socket, currentUser, onJoinRoom }) => {
    const [rooms, setRooms] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoom, setNewRoom] = useState({ name: '', description: '', tag: 'Academic' });

    useEffect(() => {
        // Initial Fetch
        socket.emit('get_rooms');

        const handleRoomsList = (data) => {
            setRooms(data);
            // After getting list, start previewing counts
            data.forEach(room => socket.emit('preview_room', room.id));
        };

        const handleCount = (data) => {
            setRooms(prev => prev.map(r => r.id === data.roomId ? { ...r, participants: data.count } : r));
        };

        const handleRoomCreated = (roomData) => {
            setRooms(prev => [...prev.filter(r => r.id !== roomData.id), roomData]);
            socket.emit('preview_room', roomData.id);
        };

        const handleRoomDeleted = (roomId) => {
            setRooms(prev => prev.filter(r => r.id !== roomId));
        };

        socket.on('rooms_list', handleRoomsList);
        socket.on('room_count', handleCount);
        socket.on('room_deleted', handleRoomDeleted);
        socket.on('room_created', handleRoomCreated);

        const interval = setInterval(() => {
            rooms.forEach(room => socket.emit('preview_room', room.id));
        }, 3000);

        return () => {
            clearInterval(interval);
            socket.off('rooms_list', handleRoomsList);
            socket.off('room_count', handleCount);
            socket.off('room_deleted', handleRoomDeleted);
            socket.off('room_created', handleRoomCreated);
        };
    }, [socket, rooms.length]); // Re-run preview logic if count changes

    const handleDeleteRoom = (e, roomId) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this room?')) {
            setRooms(prev => prev.filter(r => r.id !== roomId));
            socket.emit('delete_room', roomId);
        }
    };

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!newRoom.name) return;

        const roomId = newRoom.name.toLowerCase().replace(/\s+/g, '-');
        const roomData = {
            id: roomId,
            name: newRoom.name,
            description: newRoom.description || 'A collaborative study space.',
            participants: 0,
            tag: newRoom.tag
        };

        // Persist to MongoDB through socket
        socket.emit('create_room', roomData);

        setIsCreateModalOpen(false);
        setNewRoom({ name: '', description: '', tag: 'Academic' });

        // Join the newly created room (it will trigger on the server)
        onJoinRoom(roomId, newRoom.name);
    };

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '40px 40px 80px',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Hero Section */}
            <div className="hero-section" style={{
                background: 'white',
                borderRadius: '40px',
                padding: '48px',
                marginBottom: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ maxWidth: '600px', zIndex: 1 }}>
                    <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#1e293b', marginBottom: '24px', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
                        Explore Study <span style={{ color: '#8b5cf6' }}>Rooms</span>
                    </h1>
                    <p style={{ fontSize: '18px', color: '#64748b', lineHeight: '1.6', marginBottom: '0' }}>
                        Join a collaborative space to boost your productivity with peers in real-time.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="create-btn"
                    style={{
                        padding: '20px 32px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '16px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span style={{ fontSize: '24px' }}>+</span> Create New Room
                </button>
            </div>

            {/* Search Bar Segment */}
            <div style={{ position: 'relative', marginBottom: '40px' }}>
                <input
                    type="text"
                    placeholder="Search for a specific subject or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '20px 24px 20px 60px',
                        border: '2px solid #f1f5f9',
                        borderRadius: '20px',
                        fontSize: '16px',
                        fontWeight: '600',
                        background: 'white',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                    }}
                    onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                    onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                />
                <svg style={{ position: 'absolute', left: '24px', top: '22px', color: '#94a3b8' }} width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* Premium Room Grid */}
            <div className="room-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '32px'
            }}>
                {filteredRooms.map((room) => (
                    <div
                        key={room.id}
                        className="room-card"
                        onClick={() => onJoinRoom(room.id, room.name)}
                        style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '28px',
                            padding: '32px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-8px)';
                            e.currentTarget.style.borderColor = '#8b5cf6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        {/* Room Header Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div style={{
                                padding: '6px 12px',
                                background: '#f5f3ff',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '800',
                                color: '#8b5cf6',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>{room.tag}</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: room.participants > 0 ? '#10b981' : '#cbd5e1' }}></div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Active Now</span>
                            </div>
                        </div>

                        <h3 className="room-title" style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{room.name}</h3>
                        <p className="room-desc" style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '32px', minHeight: '48px' }}>{room.description}</p>

                        {/* Card Footer */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '24px',
                            borderTop: '1px solid #f1f5f9'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                    {room.participants}/10 Joined
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={(e) => handleDeleteRoom(e, room.id)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: '#fee2e2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Trash2 size={18} />
                                </button>

                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#8b5cf6',
                                    transition: 'all 0.2s'
                                }}>
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .hero-section {
                        padding: 32px !important;
                        flex-direction: column !important;
                        text-align: center !important;
                        gap: 32px !important;
                        borderRadius: 24px !important;
                        marginBottom: 32px !important;
                    }
                    .hero-section h1 {
                        fontSize: 32px !important;
                        marginBottom: 16px !important;
                    }
                    .hero-section p {
                        fontSize: 15px !important;
                    }
                    .create-btn {
                        width: 100% !important;
                        justify-content: center !important;
                        padding: 16px !important;
                        borderRadius: 16px !important;
                    }
                    div[style*="maxWidth: '1280px'"] { padding: 16px !important; }
                    .room-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
                    .room-card { padding: 20px !important; borderRadius: 20px !important; }
                    .room-title { fontSize: 18px !important; }
                    .room-desc { fontSize: 13px !important; marginBottom: 16px !important; minHeight: auto !important; }
                }
            `}</style>

            {/* Create Room Modal */}
            {isCreateModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setIsCreateModalOpen(false)}>
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '32px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.02em' }}>Create a New Room</h2>
                        <p style={{ color: '#64748b', marginBottom: '32px', fontWeight: '500' }}>Set up a collaborative space for your study session.</p>

                        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. Quantum Physics Group"
                                    value={newRoom.name}
                                    onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        background: '#f8fafc',
                                        border: '2px solid #f1f5f9',
                                        borderRadius: '16px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                                    onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description (Optional)</label>
                                <textarea
                                    placeholder="What will you be studying?"
                                    value={newRoom.description}
                                    onChange={e => setNewRoom({ ...newRoom, description: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        background: '#f8fafc',
                                        border: '2px solid #f1f5f9',
                                        borderRadius: '16px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        minHeight: '100px',
                                        resize: 'none',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                                    onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {['Academic', 'Technical', 'Creative', 'Theory'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewRoom({ ...newRoom, tag: t })}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                border: '2px solid',
                                                borderColor: newRoom.tag === t ? '#8b5cf6' : '#f1f5f9',
                                                background: newRoom.tag === t ? '#f5f3ff' : 'white',
                                                color: newRoom.tag === t ? '#8b5cf6' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >{t}</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    style={{
                                        flex: 1,
                                        padding: '16px',
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontSize: '15px',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                    }}
                                >Cancel</button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1.5,
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontSize: '15px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 20px rgba(139, 92, 246, 0.2)'
                                    }}
                                >Create & Join</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default RoomList;
