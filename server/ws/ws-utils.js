import { Role } from '../UserRoom.js';
import * as WS from './ws-messages.js';

export function broadcast(room, sender, message) {
    if (!room) return;
    const data = JSON.stringify(message);
    room.members.forEach((member) => {
        if (member.ws && member.ws !== sender && member.ws.readyState === member.ws.OPEN) {
            member.ws.send(data);
        }
    });
}

export function notifyPeersReadyToConnectIfApplies(room) {
    if (!room) return;
    if (room.size < 2) return;
    if (![...room.members.values()].every((member) => member.ws && member.ws.readyState === member.ws.OPEN)) return;

    console.log(`Requesting ICE candidates from all peers in room: ${room.id}`);
    room.members.forEach((member) => {
        if (member.ws && member.ws.readyState === member.ws.OPEN) {
            const shouldCreateOffer = member.role === Role.ADMIN;
            member.ws.send(JSON.stringify({ type: WS.PEERS_READY_TO_START_CONNECTION, shouldCreateOffer }));
        }
    });
}
