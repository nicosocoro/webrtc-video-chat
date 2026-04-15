import * as WS from '../ws-messages.js';

export const handleOfferAnswered = ({ message, room }) => {
    const { userId, roomId } = message;
    console.log(`Offer answered from user ${userId} in room ${roomId}`);
    const peer = room?.peerOf(userId);
    console.log(`Sending offer answered to peer ${peer?.id} in room ${roomId}`);
    peer?.ws?.send(JSON.stringify({ type: WS.OFFER_ANSWERED, offerAnswer: message.offerAnswer }));
};
