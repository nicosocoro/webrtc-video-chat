import http from 'http';
import { Room } from './Room.js';
import { createRouter } from './router.js';
import { UserRoom, Role } from './UserRoom.js';
import { SERVER } from './config.js';
import { startWsServer } from './ws/ws-server.js';

const HTTP_PORT = 3000;

const rooms = new Set();
const _userSockets = new Map();
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
    console.log(`HTTP server running on ${SERVER}:${HTTP_PORT}`);
});

startWsServer(rooms, _userSockets);
