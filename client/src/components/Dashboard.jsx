import React, { useState, useEffect } from 'react';

const Dashboard = ({ socket, currentUser }) => {
    const [stats, setStats] = useState({
        users: 0,
        rooms: 0,
        messages: 0,
        activeNow: 0
    });

    useEffect(() => {
        socket.emit('get_stats');

        const handleStats = (data) => {
            setStats(data);
        };

        socket.on('stats_data', handleStats);

        const interval = setInterval(() => {
            socket.emit('get_stats');
        }, 10000);

        return () => {
            clearInterval(interval);
            socket.off('stats_data', handleStats);
        };
    }, [socket]);
    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '40px 40px 80px',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Page Header */}
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
                        Welcome back, {currentUser.name}!
                    </h1>
                    <p style={{ fontSize: '16px', color: '#64748b', fontWeight: '500', margin: 0 }}>
                        Here's your study progress for the past 7 days.
                    </p>
                </div>

                <div style={{ padding: '12px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ w: '8px', h: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Academic Year 2026</span>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                {[
                    { label: 'Total Students', value: stats.users, change: '+100%', color: '#8b5cf6', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                    { label: 'Active Now', value: stats.activeNow, change: 'Live', color: '#10b981', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                    { label: 'Study Rooms', value: stats.rooms, change: 'Total', color: '#3b82f6', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Messages Sent', value: stats.messages, change: 'Historical', color: '#f59e0b', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' }
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        transition: 'transform 0.2s',
                        cursor: 'default'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: `${stat.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: stat.color
                            }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                </svg>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: stat.change.includes('+') ? '#10b981' : '#64748b', background: stat.change.includes('+') ? '#f0fdf4' : '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                                {stat.change}
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>{stat.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Charts and Progress Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Main Progress Chart (Placeholder Design) */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Focus Score Analytics</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['Week', 'Month', 'Year'].map(t => (
                                <button key={t} style={{ padding: '6px 12px', borderRadius: '8px', border: t === 'Week' ? 'none' : '1px solid #e2e8f0', background: t === 'Week' ? '#8b5cf6' : 'transparent', color: t === 'Week' ? 'white' : '#64748b', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{t}</button>
                            ))}
                        </div>
                    </div>

                    {/* Visual Chart Placeholder */}
                    <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '20px', padding: '10px 0' }}>
                        {[65, 85, 45, 90, 75, 80, 95].map((h, i) => (
                            <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '12px' }}>
                                <div style={{
                                    width: '100%',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    flex: 1,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        width: '100%',
                                        height: `${h}%`,
                                        background: 'linear-gradient(to top, #8b5cf6, #c084fc)',
                                        borderRadius: '8px',
                                        transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}></div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textAlign: 'center' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Side Content: Top Rooms / Achievements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', padding: '32px', color: 'white' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px' }}>Study Goals</h3>
                        <div style={{ spaceY: '20px' }}>
                            {[
                                { task: 'Complete Calculus', progress: 80 },
                                { task: 'World History Note', progress: 45 },
                                { task: 'React Project UI', progress: 95 }
                            ].map((goal, i) => (
                                <div key={i} style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: '700' }}>
                                        <span>{goal.task}</span>
                                        <span>{goal.progress}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: `${goal.progress}%`, height: '100%', background: '#8b5cf6', borderRadius: '10px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px', flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>Active Peers</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {['Mani', 'Sarah', 'Alex', 'David'].map(name => (
                                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#8b5cf6' }}>{name[0]}</div>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{name}</span>
                                    <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
