import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, Image, File } from 'lucide-react';

const Resources = ({ socket, roomId, username }) => {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        socket.emit('get_files', roomId);

        const handleFilesList = (files) => setFiles(files);
        const handleNewFile = (file) => setFiles(prev => [file, ...prev]);

        socket.on('files_list', handleFilesList);
        socket.on('new_file', handleNewFile);

        return () => {
            socket.off('files_list', handleFilesList);
            socket.off('new_file', handleNewFile);
        };
    }, [socket, roomId]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit file size to 2MB for this prototype to avoid base64 lag
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large. Max 2MB allowed.');
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const fileData = {
                roomId,
                sender: username,
                fileName: file.name,
                fileType: file.type,
                fileData: reader.result
            };
            socket.emit('share_file', fileData);
            setIsUploading(false);
        };
    };

    const getIcon = (type) => {
        if (type.includes('image')) return <Image size={20} color="#60a5fa" />;
        if (type.includes('pdf')) return <FileText size={20} color="#f87171" />;
        return <File size={20} color="#94a3b8" />;
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#f1f5f9', overflow: 'hidden' }}>
            {/* Header / Upload */}
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px dashed rgba(139, 92, 246, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#ddd6fe',
                    fontWeight: '600',
                    fontSize: '14px'
                }}>
                    <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <Upload size={18} />
                    {isUploading ? 'Uploading...' : 'Upload Resource'}
                </label>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                    Supports PDF, Images (Max 2MB)
                </div>
            </div>

            {/* File List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {files.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#475569', marginTop: '40px', fontSize: '13px' }}>
                        No resources shared yet.
                    </div>
                ) : (
                    files.map((file, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                            padding: '12px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                <div style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)'
                                }}>
                                    {getIcon(file.fileType)}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '160px'
                                    }}>
                                        {file.fileName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                        From {file.sender} • {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            <a
                                href={file.fileData}
                                download={file.fileName}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    textDecoration: 'none'
                                }}
                                title="Download"
                            >
                                <Download size={16} />
                            </a>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Resources;
