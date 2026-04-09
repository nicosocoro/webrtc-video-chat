import { WebSocketServer } from 'ws';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(data);
        } catch {
            console.error('Invalid JSON received');
            return;
        }

        const { type, room, payload } = message;

        if (type === 'join') {
            currentRoom = room;
            if (!rooms.has(room)) rooms.set(room, new Set());
            rooms.get(room).add(ws);
            console.log(`Client joined room: ${room} (${rooms.get(room).size} peers)`);

            // Notify other peers in the room that someone joined
            broadcast(room, ws, { type: 'peer-joined' });
            return;
        }

        // Relay offer, answer, ice-candidate to all other peers in the room
        if (['offer', 'answer', 'ice-candidate'].includes(type)) {
            broadcast(currentRoom, ws, { type, payload });
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
            } else {
                broadcast(currentRoom, ws, { type: 'peer-left' });
            }
            console.log(`Client left room: ${currentRoom}`);
        }
    });
});

function broadcast(room, sender, message) {
    if (!room || !rooms.has(room)) return;
    const data = JSON.stringify(message);
    rooms.get(room).forEach((client) => {
        if (client !== sender && client.readyState === client.OPEN) {
            client.send(data);
        }
    });
}

console.log(`Signaling server running on ws://localhost:${PORT}`);
