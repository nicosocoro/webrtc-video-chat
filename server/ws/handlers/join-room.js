import { UserRoom, Role } from '../../UserRoom.js';
import * as WS from '../ws-messages.js';
import { broadcast, notifyPeersReadyToConnectIfApplies } from '../ws-utils.js';

export const handleJoinRoom = ({ ws, message, room, _userSockets }) => {
    const { userId } = message;

    if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: `Room ${message.roomId} does not exist` }));
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

    _userSockets.set(ws.id, { userId, roomId: room.id });
    room.add(new UserRoom(userId, Role.GUEST, ws));

    console.log(`Client ${userId} joined room: ${room.id} (${room.size} [${[...room.members.keys()].join(', ')}] members)`);
    console.log('Broadcasting new guest to room members');
    broadcast(room, ws, { type: WS.ROOM_GUEST_JOINED });

    notifyPeersReadyToConnectIfApplies(room);
};
