import { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';

const usePeer = (socket, roomId, username) => {
    const [peer, setPeer] = useState(null);
    const [myStream, setMyStream] = useState(null);
    const [peers, setPeers] = useState({}); // { socketId: { peerId, stream, username } }
    const peersRef = useRef({});

    useEffect(() => {
        const newPeer = new Peer(undefined, {
            host: '/',
            port: 3001, // PeerJS server usually runs elsewhere, but we can try default or specify
            path: '/peerjs'
        });

        // For simplicity in this local setup, let's use the default PeerJS cloud server if not hosting locally
        const peerInstance = new Peer();

        peerInstance.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setPeer(peerInstance);
            socket.emit('join-room', { roomId, peerId: id, username });
        });

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setMyStream(stream);

            peerInstance.on('call', (call) => {
                call.answer(stream);
                call.on('stream', (userVideoStream) => {
                    // How do we know which user this belongs to? 
                    // We'll handle this via socket events to match peerId with socketId/username
                });
            });
        });

        return () => {
            peerInstance.destroy();
        };
    }, []);

    // This hook needs to be more robust. I'll refine it as I build the Room.
    return { peer, myStream, peers };
};

export default usePeer;
