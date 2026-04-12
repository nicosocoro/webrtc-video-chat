import http from 'http';
import { WebSocketServer } from 'ws';
import { Room } from './Room.js';
import { createRouter } from './router.js';
import { Role, UserRoom } from './UserRoom.js';
import * as WS from './ws-messages.js';

const HTTP_PORT = 3000;
const WS_PORT = 3001;

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
    console.log(`HTTP server running on http://localhost:${HTTP_PORT}`);
});

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(data);
            // const VERBOSE_EVENTS = [
            //     WS.ICE_CANDIDATE,
            //     WS.OFFER_CREATED,
            //     WS.OFFER_ANSWERED
            // ];
            // if (!VERBOSE_EVENTS.includes(message.type)) {
            //     console.log('Received:', message);
            // }
        } catch {
            console.error('Invalid JSON received');
            return;
        }

        const { type, userId, roomId } = message;
        const room = [...rooms].find((r) => r.id === roomId);
        const member = room?.get(userId);

        if (type === WS.USER_IDENTIFY) {
            if (!room || !member) {
                ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} does not exist or user is not a member` }));
                return;
            }
            member.ws = ws;
            _userSockets.set(ws.id, { userId: userId, roomId: roomId });

            return;
        }

        if (type === WS.JOIN_ROOM) {
            if (!room) {
                ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} does not exist` }));
                return;
            }
            const existing = room.get(userId);

            if (existing) {
                console.log(`User ${userId} already joined to room ${room.id}`);
                if (existing?.ws) {
                    ws.send(JSON.stringify({ type: 'ROOM_REQUEST_REJECTED', message: `User ${userId} is already in room ${room.id}` }));
                }
                return;
            }

            _userSockets.set(ws.id, { userId: userId, roomId: roomId });
            room.add(new UserRoom(userId, Role.GUEST, ws));

            console.log(`Client ${userId} joined room: ${room.id} (${room.size} [${[...room.members.keys()].join(', ')}] members)`);
            console.log('Broadcasting new guest to room members');
            broadcast(room, ws, { type: WS.ROOM_GUEST_JOINED });

            notifyPeersReadyToConnectIfApplies(room);

            return;
        }

        if (type === WS.OFFER_CREATED) {
            console.log(`Offer received from user ${userId} in room ${roomId}`);
            const peer = room?.peerOf(userId);
            console.log(`Sending offer to peer ${peer?.id} in room ${roomId}`);
            const offer = message.offer;
            peer?.ws?.send(JSON.stringify({ type: WS.OFFER_CREATED, offer }));
            return;
        }

        if (type === WS.OFFER_ANSWERED) {
            console.log(`Offer answered from user ${userId} in room ${roomId}`);
            const peer = room?.peerOf(userId);
            console.log(`Sending offer answered to peer ${peer?.id} in room ${roomId}`);
            const offerAnswer = message.offerAnswer;
            peer?.ws?.send(JSON.stringify({ type: WS.OFFER_ANSWERED, offerAnswer: offerAnswer }));
            return;
        }

        if (type === WS.ICE_CANDIDATE) {
            const peer = room?.peerOf(userId);
            peer?.ws?.send(JSON.stringify({ type: WS.ICE_CANDIDATE, candidate: message.candidate }));
            return;
        }
    });

    ws.on('close', () => {
        const { userId, roomId } = _userSockets.get(ws.id) || {};
        const currentRoom = [...rooms].find((r) => r.id === roomId);

        const deleted = _userSockets.delete(ws.id);
        console.log(`Client ${userId} disconnected, socket removed: ${deleted}`);

        if (currentRoom) {
            currentRoom.remove(userId);
            if (currentRoom.size === 0) {
                rooms.delete(currentRoom);
            } else {
                broadcast(currentRoom, ws, { type: 'peer-left', userId });
            }
            console.log(`Client ${userId} left room: ${currentRoom.id}`);
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
            const shouldCreateOffer = member.role === Role.ADMIN;
            member.ws.send(JSON.stringify({ type: WS.PEERS_READY_TO_START_CONNECTION, shouldCreateOffer: shouldCreateOffer }));
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
