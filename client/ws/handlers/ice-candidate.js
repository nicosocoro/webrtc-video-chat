export const handleIceCandidate = ({ message, state }) => {
    if (message.candidate && state.connection) {
        state.connection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
};
