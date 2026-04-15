import * as WS from '../ws-messages.js';

export const handleIceCandidate = ({ message, room }) => {
    const peer = room?.peerOf(message.userId);
    peer?.ws?.send(JSON.stringify({ type: WS.ICE_CANDIDATE, candidate: message.candidate }));
};
