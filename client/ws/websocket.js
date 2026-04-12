import * as WS from './ws-messages.js';
import { SERVER } from '../config.js';

const SIGNALING_SERVER = SERVER.replace(/^http/, 'ws') + ':3001';

let socket;

export const connect = (onMessage) => new Promise((resolve) => {
    socket = new WebSocket(SIGNALING_SERVER);

    socket.onopen = () => {
        console.log('Connected to signaling server');
        resolve();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received:', message);
        onMessage(message);
    };

    socket.onclose = () => console.log('Disconnected from signaling server');
    socket.onerror = (err) => console.error('WebSocket error:', err);
});

export const identify = (userId, roomId = null) => {
    socket.send(JSON.stringify({ type: WS.USER_IDENTIFY, userId, roomId }));
};

export const join = (roomId, userId) => {
    socket.send(JSON.stringify({ type: WS.JOIN_ROOM, roomId: roomId, userId: userId }));
};

export const sendIceCandidates = (roomId, userId) => {
    socket.send(JSON.stringify({ type: WS.ICE_CANDIDATE, roomId: roomId, userId: userId }));
};

export const send = (type, data = {}, logEnabled = true) => {
    const message = { type, ...data };
    if (logEnabled) {
        console.log('Sending:', message);
    }
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
};
