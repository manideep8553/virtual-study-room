import React, { useRef, useEffect, useState } from 'react';

const Whiteboard = ({ socket, roomId }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#8b5cf6');
    const [thickness, setThickness] = useState(3);
    const contextRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const context = canvas.getContext('2d');
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = color;
        context.lineWidth = thickness;
        contextRef.current = context;

        // Socket listener for drawing from others
        const handleDraw = ({ x0, y0, x1, y1, color, thickness }) => {
            const ctx = contextRef.current;
            if (!ctx) return;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.stroke();
            ctx.closePath();
        };

        const handleClear = () => {
            const ctx = contextRef.current;
            const canvas = canvasRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        socket.on('draw-line', handleDraw);
        socket.on('clear-canvas', handleClear);

        return () => {
            socket.off('draw-line');
            socket.off('clear-canvas');
        };
    }, [socket]);

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = thickness;
        }
    }, [color, thickness]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const finishDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;

        // Get previous coordinates
        const x1 = offsetX;
        const y1 = offsetY;

        // We need previous position to draw a smooth line
        // For simplicity, we can use a temporary ref to store lastX/lastY
    };

    // Improved Draw Function
    const lastPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        lastPos.current = { x: offsetX, y: offsetY };
        setIsDrawing(true);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const x0 = lastPos.current.x;
        const y0 = lastPos.current.y;
        const x1 = offsetX;
        const y1 = offsetY;

        // Draw locally
        const ctx = contextRef.current;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.closePath();

        // Emit to others
        socket.emit('draw-line', { roomId, x0, y0, x1, y1, color, thickness });

        lastPos.current = { x: x1, y: y1 };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('clear-canvas', roomId);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#000000'].map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: c,
                                border: color === c ? '2px solid #fff' : 'none',
                                boxShadow: color === c ? '0 0 0 2px #8b5cf6' : 'none',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
                <input
                    type="range"
                    min="1" max="20"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    style={{ cursor: 'pointer' }}
                />
                <button
                    onClick={clearCanvas}
                    style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
                >
                    CLEAR ALL
                </button>
            </div>
            <div style={{ flex: 1, position: 'relative', cursor: 'crosshair', background: '#fdfdfd' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={finishDrawing}
                    onMouseLeave={finishDrawing}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
