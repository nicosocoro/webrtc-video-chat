const SIGNALING_SERVER = 'ws://localhost:3001';

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
    socket.send(JSON.stringify({ type: 'identify', userId, roomId }));
};

export const join = (roomId, userId) => {
    socket.send(JSON.stringify({ type: 'join', roomId: roomId, userId: userId }));
};

export const send = (type, data = {}) => {
    const message = { type, ...data };
    console.log('Sending:', message);
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
};
