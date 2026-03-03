import { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';

const usePeer = (socket, roomId, username) => {
    const [peer, setPeer] = useState(null);
    const [myStream, setMyStream] = useState(null);
    const [peers, setPeers] = useState({}); // { socketId: { peerId, stream, username } }
    const peersRef = useRef({});

    useEffect(() => {
        const peerInstance = new Peer(undefined, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    {
                        urls: "turn:openrelay.metered.ca:80",
                        username: "openrelayproject",
                        credential: "openrelayproject",
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443",
                        username: "openrelayproject",
                        credential: "openrelayproject",
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443?transport=tcp",
                        username: "openrelayproject",
                        credential: "openrelayproject",
                    }
                ],
                iceCandidatePoolSize: 10
            }
        });

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
