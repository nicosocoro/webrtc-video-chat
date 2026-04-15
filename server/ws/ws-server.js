import { WebSocketServer } from 'ws';
import { SERVER } from '../config.js';
import * as WS from './ws-messages.js';
import { broadcast } from './ws-utils.js';
import { handleIdentify } from './handlers/identify.js';
import { handleJoinRoom } from './handlers/join-room.js';
import { handleOfferCreated } from './handlers/offer-created.js';
import { handleOfferAnswered } from './handlers/offer-answered.js';
import { handleIceCandidate } from './handlers/ice-candidate.js';

export const startWsServer = (rooms, _userSockets, httpsServer) => {
    const wss = new WebSocketServer({ server: httpsServer });

    wss.on('connection', (ws) => {
        console.log('Client connected');

        ws.on('message', (data) => {
            let message;
            try {
                message = JSON.parse(data);
            } catch {
                console.error('Invalid JSON received');
                return;
            }

            const { type, roomId } = message;
            const room = [...rooms].find((r) => r.id === roomId);
            const member = room?.get(message.userId);
            const ctx = { ws, message, room, member, _userSockets };

            switch (type) {
                case WS.USER_IDENTIFY:   return handleIdentify(ctx);
                case WS.JOIN_ROOM:       return handleJoinRoom(ctx);
                case WS.OFFER_CREATED:   return handleOfferCreated(ctx);
                case WS.OFFER_ANSWERED:  return handleOfferAnswered(ctx);
                case WS.ICE_CANDIDATE:   return handleIceCandidate(ctx);
                default: console.warn('Unknown message type:', type);
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
                    // TODO: Convert GUEST to ADMIN?
                    broadcast(currentRoom, ws, { type: WS.PEER_LEFT, userId });
                }
                console.log(`Client ${userId} left room: ${currentRoom.id}`);
            }
        });
    });

    console.log(`WebSocket server running on ${SERVER.replace(/^http/, 'ws')}:3000`);
};
