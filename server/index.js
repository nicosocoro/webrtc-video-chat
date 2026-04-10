import http from 'http';
import { WebSocketServer } from 'ws';
import { createRouter } from './router.js';
import { UserRoom, Role } from './UserRoom.js';
import { Room } from './Room.js';

const HTTP_PORT = 3000;
const WS_PORT = 3001;

const rooms = new Set();
const router = createRouter();

router.post('/users/(?<userId>[^/]+)/rooms', (req, res) => {
    const { userId } = req.params;
    const room = new Room(crypto.randomUUID());
    room.add(new UserRoom(userId, Role.ADMIN));
    rooms.add(room);
    console.log(`Room created: ${room.id} by user: ${userId}`);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ roomId: room.id }));
});

const httpServer = http.createServer((req, res) => router.dispatch(req, res));

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP server running on http://localhost:${HTTP_PORT}`);
});

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID();
    let currentRoom = null;

    ws.send(JSON.stringify({ type: 'connected', clientId }));
    console.log(`Client connected: ${clientId}`);

    ws.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(data);
            console.log('Received:', message);
        } catch {
            console.error('Invalid JSON received');
            return;
        }

        const { type, room, payload } = message;

        if (type === 'join') {
            const found = [...rooms].find((r) => r.id === room);
            if (!found) {
                ws.send(JSON.stringify({ type: 'error', message: `Room ${room} does not exist` }));
                return;
            }
            currentRoom = found;
            const existing = found.get(clientId);
            if (existing) {
                existing.ws = ws;
            } else {
                found.add(new UserRoom(clientId, Role.GUEST, ws));
            }
            console.log(`Client ${clientId} joined room: ${found.id} (${found.size} members)`);
            broadcast(found, ws, { type: 'peer-joined', clientId });
            return;
        }

        // Relay offer, answer, ice-candidate to all other peers in the room
        if (['offer', 'answer', 'ice-candidate'].includes(type)) {
            console.log(`Relaying ${type} to room: ${currentRoom?.id}`);
            broadcast(currentRoom, ws, { type, payload });
        }
    });

    ws.on('close', () => {
        if (currentRoom) {
            currentRoom.remove(clientId);
            if (currentRoom.size === 0) {
                rooms.delete(currentRoom);
            } else {
                broadcast(currentRoom, ws, { type: 'peer-left', clientId });
            }
            console.log(`Client ${clientId} left room: ${currentRoom.id}`);
        }
    });
});

function broadcast(room, sender, message) {
    if (!room) return;
    const data = JSON.stringify(message);
    room.members.forEach((member) => {
        if (member.ws && member.ws !== sender && member.ws.readyState === member.ws.OPEN) {
            member.ws.send(data);
        }
    });
}

console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
