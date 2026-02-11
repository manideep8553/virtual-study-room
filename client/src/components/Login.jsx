import React, { useState } from 'react';

const Login = ({ onLogin, onToggle }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email) {
            onLogin(email);
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
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}>Login</button>
                    <button
                        onClick={onToggle}
                        style={{
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>Get Started</button>
                </div>
            </div>

            {/* Login Card */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '50px 40px',
                    width: '100%',
                    maxWidth: '420px',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)'
                }}>
                    {/* Icon */}
                    <div style={{
                        width: '50px',
                        height: '50px',
                        background: '#f3e8ff',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '25px'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                    </div>

                    <h2 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: '8px'
                    }}>Welcome Back!</h2>

                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '35px'
                    }}>Sign in to continue studying</p>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '8px'
                            }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        border: '1.5px solid #e5e7eb',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                />
                                <svg style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '13px',
                                    width: '18px',
                                    height: '18px'
                                }} fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '8px'
                            }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        border: '1.5px solid #e5e7eb',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                />
                                <svg style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '13px',
                                    width: '18px',
                                    height: '18px'
                                }} fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '13px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#7c3aed'}
                            onMouseLeave={(e) => e.target.style.background = '#8b5cf6'}
                        >
                            Sign In
                        </button>
                    </form>

                    <p style={{
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#6b7280',
                        marginTop: '25px'
                    }}>
                        Don't have an account? <span onClick={onToggle} style={{ color: '#8b5cf6', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Create one</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
