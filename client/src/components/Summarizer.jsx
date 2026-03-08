import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, ListCheck, Clock, BookOpen, Wand2, RefreshCw } from 'lucide-react';

const Summarizer = ({ socket, roomId }) => {
    const [summary, setSummary] = useState(null);
    const [status, setStatus] = useState('idle'); // 'idle', 'analyzing', 'generating', 'ready'
    const [progress, setProgress] = useState(0);

    const generateSummary = () => {
        setStatus('analyzing');
        setProgress(0);

        // Simulation of AI effort
        let p = 0;
        const interval = setInterval(() => {
            p += Math.random() * 20;
            if (p >= 100) {
                p = 100;
                clearInterval(interval);
                setStatus('generating');

                // Request summary from server
                socket.emit('get_study_summary', roomId);
            }
            setProgress(Math.round(p));
        }, 400);
    };

    useEffect(() => {
        const handleResult = (data) => {
            setSummary(data);
            setStatus('ready');
        };
        socket.on('summary_result', handleResult);
        return () => socket.off('summary_result', handleResult);
    }, [socket]);

    const renderContent = () => {
        if (status === 'idle') {
            return (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        animation: 'pulse 2s infinite'
                    }}>
                        <Wand2 size={40} color="#8b5cf6" />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: '#fff' }}>AI Study Companion</h3>
                    <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', maxWidth: '280px', margin: '0 auto 32px' }}>
                        I'll analyze your chat transcript and shared resources to create a condensed recap of your study session.
                    </p>
                    <button
                        onClick={generateSummary}
                        style={{
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '15px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            margin: '0 auto',
                            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)'
                        }}
                    >
                        <Sparkles size={18} />
                        Analyze Session
                    </button>
                </div>
            );
        }

        if (status === 'analyzing' || status === 'generating') {
            return (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 32px' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="6"
                                strokeDasharray="283"
                                strokeDashoffset={283 - (283 * progress) / 100}
                                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: '800', color: '#fff', fontSize: '18px' }}>
                            {progress}%
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <RefreshCw size={16} className="spin" color="#8b5cf6" />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {status === 'analyzing' ? 'Analyzing Transcript...' : 'Generating Insights...'}
                        </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>Distilling your hard work into key points.</p>
                </div>
            );
        }

        if (status === 'ready' && summary) {
            return (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '20px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Clock size={16} color="#8b5cf6" />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase' }}>Session Length: {summary.duration}</span>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', lineHeight: '1.2' }}>{summary.topic}</h2>
                        <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>{summary.overview}</p>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <ListCheck size={18} color="#10b981" />
                            <h4 style={{ fontWeight: '700', color: '#fff' }}>Key Takeaways</h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summary.points.map((pt, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>{i + 1}</div>
                                    <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>{pt}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <BookOpen size={18} color="#3b82f6" />
                            <h4 style={{ fontWeight: '700', color: '#fff' }}>Resources Noted</h4>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {summary.references.map((ref, i) => (
                                <span key={i} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '6px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.2)' }}>{ref}</span>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={generateSummary}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Re-generate Summary
                    </button>
                </div>
            );
        }
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', background: '#0a0a0a', color: '#fff' }}>
            <style>
                {`
                    @keyframes pulse {
                        0% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    .spin {
                        animation: spin 1.5s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>

            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderRadius: '10px' }}>
                        <Sparkles size={18} color="white" />
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.02em' }}>STUDY SUMMARY</span>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default Summarizer;
