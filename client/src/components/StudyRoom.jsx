import React from 'react';
import Room from './Room';

const StudyRoom = ({ socket, roomId, roomName, username, onLeave }) => {
    return (
        <Room
            socket={socket}
            roomId={roomId}
            roomName={roomName}
            username={username}
            onLeave={onLeave}
        />
    );
};

export default StudyRoom;
