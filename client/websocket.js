const SIGNALING_SERVER = 'ws://localhost:3000';

let socket;

export const connect = (room, onMessage) => {
    socket = new WebSocket(SIGNALING_SERVER);

    socket.onopen = () => {
        console.log('Connected to signaling server');
        socket.send(JSON.stringify({ type: 'join', room }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received:', message);
        onMessage(message);
    };

    socket.onclose = () => console.log('Disconnected from signaling server');
    socket.onerror = (err) => console.error('WebSocket error:', err);
};

export const send = (type, payload) => {
    console.log('Sending:', { type, payload });
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload }));
    }
};
