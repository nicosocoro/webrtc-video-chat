export const handleOfferAnswered = async ({ message, state }) => {
    console.log('Offer answered');
    await state.connection.setRemoteDescription(new RTCSessionDescription(message.offerAnswer));
};
