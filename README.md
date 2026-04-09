# Simple Video Chat

This is a simple video chat to learn WebRTC.

## Project Structure

## Client

Vanilla Javascript web site used by peers (caller and callee) to communicate with its respective peer.

```sh
npm install
npm run client
```

It will open a local server on a random port.

## Server

Node server which supports WebSocket for two-way real-time communication.

The `signaling server` that forwards networking information between peers to help them stablish the WebRTC connection.

```sh
npm install # If not done yet
npm run server
```

## WebRTC concepts

https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols

### ICE

Interactive Connectivity Establishment (ICE) is a framework to allow your web browser to connect with peers.

### STUN

Session Traversal Utilities for NAT (STUN) is a protocol to discover your public address and determine any restrictions in your router that would prevent a direct connection with a peer.

### TURN

Traversal Using Relays around NAT (TURN) is meant to bypass the **Symmetric NAT** restriction by opening a connection with a TURN server and relaying all information through that server.

Act as a middleware between two peers.

### NAT

Network Address Translation (NAT) is used to give your device a public IP address. A router will have a public IP address and every device connected to the router will have a private IP address. Requests will be translated from the device's private IP to the router's public IP with a unique port. That way you don't need a unique public IP for each device but can still be discovered on the Internet.

#### NAT Types

https://www.cisco.com/c/en/us/td/docs/solutions/CVD/SDWAN/cisco-sdwan-design-guide.html#NAT

* Full Cone
* Restricted Cone
* Port-Restricted Cone
* **Symmetric**: *Problematic for WebRTC*
