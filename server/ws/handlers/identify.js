export const handleIdentify = ({ ws, message, room, member, _userSockets }) => {
    const { userId, roomId } = message;

    if (!room || !member) {
        ws.send(JSON.stringify({ type: 'error', message: `Room ${roomId} does not exist or user is not a member` }));
        return;
    }

    member.ws = ws;
    _userSockets.set(ws.id, { userId, roomId });
};
