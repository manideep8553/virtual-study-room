import React, { useState } from 'react';

const Register = ({ onRegister, onToggle }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email && name) {
            onRegister(email, name);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Top Navigation */}
            <div style={{
                padding: '20px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '35px',
                        height: '35px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>StudyRoom</span>
                </div>
            </div>

            {/* Register Card */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.1)',
                    border: '1px solid #f3e8ff'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        background: '#f3e8ff',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>

                    <h2 style={{
                        fontSize: '28px',
                        fontWeight: '800',
                        color: '#111827',
                        marginBottom: '8px'
                    }}>Join StudyRoom</h2>

                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '32px'
                    }}>Start collaborating with students worldwide</p>

                    <form onSubmit={handleSubmit}>
                        {/* Name */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #f3f4f6',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: '#f9fafb'
                                }}
                            />
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #f3f4f6',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: '#f9fafb'
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                            <input
                                type="password"
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #f3f4f6',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: '#f9fafb'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            Create Account
                        </button>
                    </form>

                    <p style={{
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginTop: '24px'
                    }}>
                        Already have an account? <span onClick={onToggle} style={{ color: '#8b5cf6', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>Sign In</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
