import http from 'http';
import { WebSocketServer } from 'ws';
import { createRouter } from './router.js';
import { UserRoom, Role } from './UserRoom.js';
import { Room } from './Room.js';
import * as WS from './ws-messages.js';

const HTTP_PORT = 3000;
const WS_PORT = 3001;

const rooms = new Set();
const router = createRouter();

router.post('/users/anonymous-session', (_req, res) => {
    const userId = crypto.randomUUID();
    console.log(`Anonymous session created: ${userId}`);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ userId }));
});

router.post('/users/(?<userId>[^/]+)/rooms/create', (req, res) => {
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
    console.log('Client connected');

    ws.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(data);
            console.log('Received:', message);
        } catch {
            console.error('Invalid JSON received');
            return;
        }

        const { type, userId, roomId, payload } = message;

        if (type === 'identify') {
            const room = [...rooms].find((r) => r.id === roomId);
            const member = room?.get(userId);
            if (!room || !member) {
                ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} does not exist or user is not a member` }));
                return;
            }
            member.ws = ws;

            return;
        }

        if (type === 'join') {
            const room = [...rooms].find((r) => r.id === roomId);
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} does not exist` }));
                return;
            }
            const existing = room.get(userId);
            if (existing?.ws) {
                ws.send(JSON.stringify({ type: 'ROOM_REQUEST_REJECTED', message: `User ${userId} is already in room ${room.id}` }));
                return;
            }

            if (existing) {
                existing.ws = ws; // admin reconnecting
            } else {
                room.add(new UserRoom(userId, Role.GUEST, ws));
            }
            console.log(`Client ${userId} joined room: ${room.id} (${room.size} members)`);
            console.log('Broadcasting new guest to room members');
            broadcast(room, ws, { type: WS.ROOM_GUEST_JOINED });

            notifyPeersReadyToConnectIfApplies(room);

            return;
        }

        // Relay offer, answer, ice-candidate to all other peers in the room
        // if (['offer', 'answer', 'ice-candidate'].includes(type)) {
        //     // console.log(`Relaying ${type} to room: ${currentRoom?.id}`);
        //     // broadcast(currentRoom, ws, { type, payload });
        // }
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

function notifyPeersReadyToConnectIfApplies(room) {
    if (!room) return;
    if (room.size < 2) return; // No need to exchange candidates if only one peer
    if (![...room.members.values()].every((member) => member.ws && member.ws.readyState === member.ws.OPEN)) return;

    console.log(`Requesting ICE candidates from all peers in room: ${room.id}`);
    room.members.forEach((member) => {
        if (member.ws && member.ws.readyState === member.ws.OPEN) {
            member.ws.send(JSON.stringify({ type: WS.PEERS_READY_TO_START_CONNECTION }));
        }
    });
}

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
