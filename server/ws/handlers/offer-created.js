import * as WS from '../ws-messages.js';

export const handleOfferCreated = ({ message, room }) => {
    const { userId, roomId } = message;
    console.log(`Offer received from user ${userId} in room ${roomId}`);
    const peer = room?.peerOf(userId);
    console.log(`Sending offer to peer ${peer?.id} in room ${roomId}`);
    peer?.ws?.send(JSON.stringify({ type: WS.OFFER_CREATED, offer: message.offer }));
};
