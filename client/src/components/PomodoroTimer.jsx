import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Bell } from 'lucide-react';

const PomodoroTimer = () => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // 'focus', 'shortBreak', 'longBreak'

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft => timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Optional: Play sound here
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        if (mode === 'focus') setTimeLeft(25 * 60);
        else if (mode === 'shortBreak') setTimeLeft(5 * 60);
        else setTimeLeft(15 * 60);
    };

    const changeMode = (newMode) => {
        setMode(newMode);
        setIsActive(false);
        if (newMode === 'focus') setTimeLeft(25 * 60);
        else if (newMode === 'shortBreak') setTimeLeft(5 * 60);
        else setTimeLeft(15 * 60);
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
