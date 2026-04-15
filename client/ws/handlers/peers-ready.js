import { send } from '../websocket.js';
import * as WS from '../ws-messages.js';

export const handlePeersReady = async ({ message, state }) => {
    const { shouldCreateOffer } = message;
    console.log('Creating RTCPeerConnection');

    state.connection = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
    });

    state.audioTracks.forEach(track => state.connection.addTrack(track, state.stream));
    state.videoTracks.forEach(track => state.connection.addTrack(track, state.stream));

    state.connection.onconnectionstatechange = () => {
        console.log('Connection state changed:', state.connection.connectionState);
    };

    state.connection.onicecandidate = event => {
        send(WS.ICE_CANDIDATE, { userId: state.userId, roomId: state.roomId, candidate: event.candidate }, false);
    };

    state.connection.onicecandidateerror = event => {
        console.error('ICE candidate error:', event);
    };

    state.connection.onicegatheringstatechange = () => {
        console.log('ICE gathering state changed:', state.connection.iceGatheringState);
    };

    state.connection.ontrack = event => {
        console.log('Track received:', event.track.kind);
        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.addTrack(event.track);
        } else {
            remoteVideo.srcObject = new MediaStream([event.track]);
        }
    };

    if (shouldCreateOffer) {
        console.log('Creating an offer');
        const offer = await state.connection.createOffer();
        await state.connection.setLocalDescription(offer);
        send(WS.OFFER_CREATED, { userId: state.userId, roomId: state.roomId, offer });
    }
};
