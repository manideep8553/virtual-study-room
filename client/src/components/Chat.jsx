import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash } from 'lucide-react';

const Chat = ({ socket, roomId, username }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const handleReceiveMessage = (data) => {
            setMessages((prev) => [...prev, {
                ...data,
                id: Date.now() + Math.random(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        };

        socket.on('receive_message', handleReceiveMessage);
        return () => socket.off('receive_message');
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('send_message', { roomId, message, username });
            setMessage('');
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'transparent'
        }}>
            {/* Message Feed */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {messages.length === 0 && (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.2,
                        color: '#94a3b8',
                        gap: '12px'
                    }}>
                        <Hash size={48} strokeWidth={1} />
                        <p style={{ fontSize: '11px', fontWeight: '800', uppercase: 'true', letterSpacing: '0.2em' }}>CLEAN SLATE</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.username === username ? 'flex-end' : 'flex-start',
                        animation: 'fadeInUp 0.3s ease-out'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                            padding: '0 4px'
                        }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>{msg.username}</span>
                            <span style={{ fontSize: '9px', color: '#475569' }}>{msg.time}</span>
                        </div>
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 18px',
                            borderRadius: msg.username === username ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            fontSize: '13.5px',
                            lineHeight: '1.5',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            background: msg.username === username ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.05)',
                            color: msg.username === username ? 'white' : '#cbd5e1',
                            border: '1px solid',
                            borderColor: msg.username === username ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)'
                        }}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '24px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <form onSubmit={sendMessage} style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        style={{
                            width: '100%',
                            height: '52px',
                            padding: '0 60px 0 20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            fontSize: '14px',
                            color: 'white',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim()}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: message.trim() ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                            color: message.trim() ? 'white' : '#475569'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
