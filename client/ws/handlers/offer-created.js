import { send } from '../websocket.js';
import * as WS from '../ws-messages.js';

export const handleOfferCreated = async ({ message, state }) => {
    console.log('Answering offer');
    await state.connection.setRemoteDescription(new RTCSessionDescription(message.offer));
    const answer = await state.connection.createAnswer();
    await state.connection.setLocalDescription(answer);
    send(WS.OFFER_ANSWERED, { userId: state.userId, roomId: state.roomId, offerAnswer: answer });
};
