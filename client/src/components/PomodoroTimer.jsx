import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Bell } from 'lucide-react';

const PomodoroTimer = ({ socket, roomId }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // 'focus', 'shortBreak', 'longBreak'

    useEffect(() => {
        if (!socket) return;

        const handleSync = (data) => {
            if (data.type === 'toggle') setIsActive(data.isActive);
            if (data.type === 'reset' || data.type === 'mode') {
                setIsActive(data.isActive);
                setMode(data.mode);
                setTimeLeft(data.timeLeft);
            }
            if (data.type === 'tick') setTimeLeft(data.timeLeft);
        };

        socket.on('sync_timer', handleSync);
        return () => socket.off('sync_timer', handleSync);
    }, [socket]);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    // Sync tick slightly less often to avoid network flood, or just let local tick handle it
                    // if (next % 10 === 0) socket.emit('timer_update', { roomId, type: 'tick', timeLeft: next });
                    return next;
                });
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, socket, roomId]);

    const toggleTimer = () => {
        const nextActive = !isActive;
        setIsActive(nextActive);
        socket?.emit('timer_update', { roomId, type: 'toggle', isActive: nextActive });
    };

    const resetTimer = () => {
        setIsActive(false);
        let time = 25 * 60;
        if (mode === 'focus') time = 25 * 60;
        else if (mode === 'shortBreak') time = 5 * 60;
        else time = 15 * 60;

        setTimeLeft(time);
        socket?.emit('timer_update', { roomId, type: 'reset', timeLeft: time, isActive: false, mode });
    };

    const changeMode = (newMode) => {
        setMode(newMode);
        setIsActive(false);
        let time = 25 * 60;
        if (newMode === 'focus') time = 25 * 60;
        else if (newMode === 'shortBreak') time = 5 * 60;
        else time = 15 * 60;

        setTimeLeft(time);
        socket?.emit('timer_update', { roomId, type: 'mode', timeLeft: time, isActive: false, mode: newMode });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', color: 'white' }}>
            {/* Timer Display */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '24px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{
                        height: '100%',
                        background: mode === 'focus' ? '#8b5cf6' : '#10b981',
                        width: `${(timeLeft / (mode === 'focus' ? 1500 : mode === 'shortBreak' ? 300 : 900)) * 100}%`,
                        transition: 'width 1s linear'
                    }}></div>
                </div>

                <div style={{ fontSize: '64px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '-2px', marginBottom: '8px' }}>
                    {formatTime(timeLeft)}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: mode === 'focus' ? '#a78bfa' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    {mode === 'focus' ? 'Focus Time' : 'Break Time'}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                    onClick={toggleTimer}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        border: `1px solid ${isActive ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
                        color: isActive ? '#f87171' : '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                </button>
                <button
                    onClick={resetTimer}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <RotateCcw size={24} />
                </button>
            </div>

            {/* Modes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                    { id: 'focus', label: 'Focus', icon: Brain, minutes: 25 },
                    { id: 'shortBreak', label: 'Short', icon: Coffee, minutes: 5 },
                    { id: 'longBreak', label: 'Long', icon: Bell, minutes: 15 }
                ].map(m => (
                    <button
                        key={m.id}
                        onClick={() => changeMode(m.id)}
                        style={{
                            padding: '12px',
                            background: mode === m.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            border: '1px solid',
                            borderColor: mode === m.id ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            borderRadius: '12px',
                            color: mode === m.id ? 'white' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            fontWeight: '700'
                        }}
                    >
                        <m.icon size={18} />
                        {m.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PomodoroTimer;
