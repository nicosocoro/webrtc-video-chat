import http from 'http';
import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Room } from './Room.js';
import { createRouter } from './router.js';
import { UserRoom, Role } from './UserRoom.js';
import { SERVER } from './config.js';
import { startWsServer } from './ws/ws-server.js';

const PORT = 3000;
const isSecure = process.argv.includes('--secure');

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

const handler = (req, res) => router.dispatch(req, res);

const server = isSecure
    ? (() => {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const tlsOptions = {
            key:  readFileSync(join(__dirname, '../certs/key.pem')),
            cert: readFileSync(join(__dirname, '../certs/cert.pem')),
        };
        return https.createServer(tlsOptions, handler);
    })()
    : http.createServer(handler);

server.listen(PORT, () => {
    console.log(`${isSecure ? 'HTTPS' : 'HTTP'} server running on ${SERVER}:${PORT}`);
});

startWsServer(rooms, _userSockets, server);
