import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import RoomList from './components/RoomList';

import StudyRoom from './components/StudyRoom';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
const socket = io(BACKEND_URL);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [currentPage, setCurrentPage] = useState('rooms');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);

  const [showProfile, setShowProfile] = useState(false);

  // Auto-login for dev if needed (keeping it off for production feel)
  useEffect(() => {
    const handleUserRegistered = (user) => {
      console.log(" Auth Success! Logged in as:", user.name);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setCurrentPage('rooms');
    };

    socket.on('user_registered', handleUserRegistered);

    // Connection Debugging
    socket.on('connect_error', (err) => {
      console.error("Socket Connection Error:", err.message);
      // alert("Network connection failed. Please check your server or IP."); 
    });

    socket.on('connect', () => {
      console.log("Socket Connected:", socket.id);
    });

    return () => {
      socket.off('user_registered', handleUserRegistered);
      socket.off('connect_error');
      socket.off('connect');
    };
  }, []);

  const handleAuth = (email, name, mode) => {
    // If name is passed (from Register), use it. otherwise send null for login
    const dataToSend = { email, mode };
    if (name) dataToSend.name = name;
    socket.emit('register_user', dataToSend);
  };

  useEffect(() => {
    const handleAuthError = (message) => {
      alert(message);
    };
    socket.on('auth_error', handleAuthError);
    return () => socket.off('auth_error', handleAuthError);
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage('rooms');
    setAuthMode('login');
    setShowProfile(false);
  };

  const handleJoinRoom = (roomId, roomName) => {
    setCurrentRoom({ id: roomId, name: roomName });
    setCurrentPage('room');
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPage('rooms');
  };

  if (!isLoggedIn) {
    if (authMode === 'login') {
      return <Login onLogin={(email) => handleAuth(email, null, 'login')} onToggle={() => setAuthMode('register')} />;
    }
    return <Register onRegister={(email, name) => handleAuth(email, name, 'register')} onToggle={() => setAuthMode('login')} />;
  }

  if (currentPage === 'room' && currentRoom) {
    return (
      <StudyRoom
        socket={socket}
        roomId={currentRoom.id}
        roomName={currentRoom.name}
        username={currentUser.name}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }} onClick={() => setShowProfile(false)}>
      {/* Premium Top Navigation */}
      <nav style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 40px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }} onClick={(e) => e.stopPropagation()}>
        <div className="nav-container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentPage('rooms')}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="logo-text" style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>StudyRoom</span>
            </div>

            {/* Nav Links */}
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setCurrentPage('rooms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: currentPage === 'rooms' ? '#f5f3ff' : 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: currentPage === 'rooms' ? '#8b5cf6' : '#64748b',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  transition: 'all 0.2s'
                }}
              >
                Rooms
              </button>

            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
            {/* User Profile */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setShowProfile(!showProfile);
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '800',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)'
              }}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Account Details Popup */}
            {showProfile && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                width: '260px',
                padding: '20px',
                zIndex: 200,
                animation: 'fadeInUp 0.2s ease-out'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                    fontSize: '20px',
                    fontWeight: '800'
                  }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{currentUser.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Student</div>
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>EMAIL</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{currentUser.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {currentPage === 'rooms' && (
          <RoomList socket={socket} currentUser={currentUser} onJoinRoom={handleJoinRoom} />
        )}

      </div>

      <style>{`
        @media (max-width: 768px) {
          nav { padding: 0 16px !important; height: 60px !important; }
          .logo-text { display: none; }
          .nav-links { gap: 0 !important; }
          .nav-container { gap: 8px; }
        }
      `}</style>
    </div>
  );
}

export default App;
