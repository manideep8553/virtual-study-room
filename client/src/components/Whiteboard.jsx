import React, { useRef, useEffect, useState } from 'react';
import { Share2, Users, Lock, XCircle } from 'lucide-react';

const Whiteboard = ({ socket, roomId, username }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#8b5cf6');
    const [tool, setTool] = useState('pen'); // 'pen', 'marker', 'highlighter', 'eraser'
    const [shareMode, setShareMode] = useState('private'); // 'private' | 'view' | 'edit'
    const [sharedBy, setSharedBy] = useState(null);
    const contextRef = useRef(null);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        if (!canvas || !parent) return;

        const resizeCanvas = () => {
            const rect = parent.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const tempImage = canvas.toDataURL();
            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const context = canvas.getContext('2d');
            context.scale(2, 2);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            contextRef.current = context;

            const img = new Image();
            img.src = tempImage;
            img.onload = () => {
                context.drawImage(img, 0, 0, rect.width, rect.height);
            };
        };

        const resizeObserver = new ResizeObserver(() => resizeCanvas());
        resizeObserver.observe(parent);

        const handleDraw = ({ x0, y0, x1, y1, color, thickness, opacity }) => {
            const ctx = contextRef.current;
            if (!ctx) return;
            ctx.beginPath();
            ctx.globalAlpha = opacity || 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            ctx.closePath();
            ctx.globalAlpha = 1.0;
        };

        const handleClear = () => {
            const ctx = contextRef.current;
            const cvs = canvasRef.current;
            if (ctx && cvs) ctx.clearRect(0, 0, cvs.width, cvs.height);
        };

        const handleWhiteboardUpdate = ({ shareMode: mode, sharedBy: by, image }) => {
            if (mode) setShareMode(mode);
            if (by) setSharedBy(by);
            if (image) {
                const img = new Image();
                img.src = image;
                img.onload = () => {
                    const ctx = contextRef.current;
                    const c = canvasRef.current;
                    ctx.clearRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0, c.width / 2, c.height / 2);
                };
            }
        };

        socket.on('draw-line', handleDraw);
        socket.on('clear-canvas', handleClear);
        socket.on('whiteboard_update', handleWhiteboardUpdate);

        resizeCanvas();

        return () => {
            resizeObserver.disconnect();
            socket.off('draw-line');
            socket.off('clear-canvas');
            socket.off('whiteboard_update');
        };
    }, [socket, roomId]);

    const handleShareMode = (mode) => {
        setShareMode(mode);
        setSharedBy(username);
        
        // Sync current canvas state to newcomers when we share
        const canvas = canvasRef.current;
        const image = canvas ? canvas.toDataURL() : null;

        socket?.emit('whiteboard_update', {
            roomId,
            shareMode: mode,
            sharedBy: username,
            image
        });
    };

    const getToolSettings = () => {
        switch (tool) {
            case 'marker': return { thickness: 8, opacity: 1, strokeColor: color };
            case 'highlighter': return { thickness: 25, opacity: 0.35, strokeColor: color === '#000000' ? '#eab308' : color };
            case 'eraser': return { thickness: 40, opacity: 1, strokeColor: '#ffffff' };
            default: return { thickness: 3, opacity: 1, strokeColor: color };
        }
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const isReadOnly = shareMode === 'view' && sharedBy !== username;
    const canDraw = shareMode === 'private' || shareMode === 'edit' || sharedBy === username;

    const handleStart = (e) => {
        if (!canDraw) return;
        if (e.type === 'touchstart') e.preventDefault();
        const { x, y } = getCoordinates(e);
        lastPos.current = { x, y };
        setIsDrawing(true);
    };

    const handleMove = (e) => {
        if (!isDrawing || !canDraw) return;
        if (e.type === 'touchmove') e.preventDefault();

        const { x, y } = getCoordinates(e);
        const { thickness, opacity, strokeColor } = getToolSettings();
        const x0 = lastPos.current.x;
        const y0 = lastPos.current.y;

        const ctx = contextRef.current;
        if (!ctx) return;

        ctx.beginPath();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = thickness;
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.closePath();
        ctx.globalAlpha = 1.0;

        if (shareMode !== 'private') {
            socket.emit('draw-line', { roomId, x0, y0, x1: x, y1: y, color: strokeColor, thickness, opacity });
        }

        lastPos.current = { x, y };
    };

    const handleEnd = () => setIsDrawing(false);

    const clearCanvas = () => {
        if (!canDraw) return;
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (shareMode !== 'private') socket.emit('clear-canvas', roomId);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            
            {/* ── Read-only Banner ── */}
            {isReadOnly && (
                <div style={{ padding: '8px 16px', background: 'rgba(31, 111, 235, 0.1)', borderBottom: '1px solid rgba(31, 111, 235, 0.3)', fontSize: '12px', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={12} /> You are viewing {sharedBy}'s whiteboard — read only. They can enable "Edit" to let everyone draw.
                </div>
            )}

            {/* Toolbar Top */}
            <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                    {[
                        { id: 'pen', label: 'Pen' },
                        { id: 'marker', label: 'Marker' },
                        { id: 'highlighter', label: 'Highlight' },
                        { id: 'eraser', label: 'Eraser' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTool(t.id)}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', border: 'none',
                                background: tool === t.id ? '#fff' : 'transparent',
                                color: tool === t.id ? '#0f172a' : '#64748b',
                                fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                boxShadow: tool === t.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            {t.label.toUpperCase()}
                        </button>
                    ))}
                </div>

                {tool !== 'eraser' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#000000', '#f59e0b'].map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                style={{
                                    width: '20px', height: '20px', borderRadius: '50%', background: c,
                                    border: color === c ? '2px solid #fff' : 'none',
                                    boxShadow: color === c ? '0 0 0 2px #8b5cf6' : 'none', cursor: 'pointer'
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Share Mode Buttons */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', marginLeft: 'auto' }}>
                    {[
                        { mode: 'private', icon: <Lock size={13} />, label: 'Private', color: '#64748b' },
                        { mode: 'view',    icon: <Share2 size={13} />, label: 'Share', color: '#10b981' },
                        { mode: 'edit',    icon: <Users size={13} />, label: 'Edit', color: '#1f6feb' },
                    ].map(({ mode, icon, label, color }) => (
                        <button
                            key={mode}
                            onClick={() => handleShareMode(mode)}
                            title={label}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                                background: shareMode === mode ? color : 'transparent',
                                color: shareMode === mode ? '#fff' : '#64748b',
                                transition: 'all 0.15s'
                            }}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={clearCanvas}
                    style={{ padding: '8px 12px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
                >
                    CLEAR
                </button>
            </div>

            <div style={{ flex: 1, position: 'relative', cursor: isReadOnly ? 'not-allowed' : (tool === 'eraser' ? 'cell' : 'crosshair'), background: '#fff', touchAction: 'none' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    style={{ touchAction: 'none', display: 'block' }}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
