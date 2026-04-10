const SIGNALING_SERVER = 'ws://localhost:3001';

let socket;
export let clientId = null;

export const connect = (onMessage) => new Promise((resolve) => {
    socket = new WebSocket(SIGNALING_SERVER);

    socket.onopen = () => {
        console.log('Connected to signaling server');
        resolve();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'connected') {
            clientId = message.clientId;
            console.log('Assigned client ID:', clientId);
            return;
        }
        console.log('Received:', message);
        onMessage(message);
    };

    socket.onclose = () => console.log('Disconnected from signaling server');
    socket.onerror = (err) => console.error('WebSocket error:', err);
});

export const join = (room, userId) => {
    socket.send(JSON.stringify({ type: 'join', room, userId }));
};

export const send = (type, payload) => {
    console.log('Sending:', { type, payload });
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload, clientId }));
    }
};
