# Simple Video Chat

A hobby project to learn WebRTC. Two peers connect directly via browser — no media server involved, just a tiny signaling server to help them find each other.

## How it works

```
Peer A ──┐                    ┌── Peer B
         └── signaling server ──┘
              (just for setup)

         then: Peer A ◄──────────► Peer B
                      direct P2P
```

1. Peer A creates a room and shares the room ID
2. Peer B joins with that ID
3. The signaling server helps them exchange connection info (SDP + ICE candidates)
4. Once connected, media flows directly between browsers — the server is out of the picture

## Project Structure

```
client/          # vanilla JS frontend
  ws/
    handlers/    # one file per incoming WS message type
    websocket.js # WS connection + send helpers
    ws-messages.js
  config.js
  index.html

server/          # Node.js backend
  ws/
    handlers/    # one file per incoming WS message type
    ws-server.js # WebSocket server setup
  router.js      # HTTP routes
  Room.js
  server.js
```

## Running locally

You need two terminals.

**Server**
```sh
npm install
npm run server
```
Runs an HTTP server and WebSocket signaling server on `:3000`.

**Client**
```sh
npm run client
```
Serves the client at `localhost:8080`. Open two tabs:
- Tab 1 → click **Create room** (Room ID automatically copied to clipboard)
- Tab 2 → paste Room ID, click **Join**

## Running in LAN (different devices)

Browsers only allow camera/mic access (`getUserMedia`) on secure contexts. `localhost` is exempt, but a LAN IP (e.g. `192.168.1.x`) is not — so HTTPS is required.

### 1. Find your LAN IP

```sh
ipconfig getifaddr en0
```

### 2. Generate a self-signed certificate

```sh
mkdir certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -subj "/CN=192.168.1.x" \
  -addext "subjectAltName=IP:192.168.1.x,IP:127.0.0.1,DNS:localhost"
```

Replace `192.168.1.x` with your actual LAN IP. The `certs/` folder is gitignored.

### 3. Update config

In `client/config.js`, set your LAN IP:

```js
export const SERVER = "https://192.168.1.x";
```

### 4. Run server and client

```sh
npm run server-secure
npm run client-secure
```

The server runs on `:3000` (HTTPS + WSS). The client is served at `:8080` (HTTPS).

> `npm run server` runs plain HTTP + WS (no cert needed, localhost only). `npm run server-secure` passes `--secure` to load the TLS certificate.

### 5. Accept the certificate in the browser

Because the certificate is self-signed, the browser will warn on first visit. You need to accept it **for each port** before the app will work:

1. Go to `https://192.168.1.x:3000` → click through the warning (Advanced → Proceed)
2. Go to `https://192.168.1.x:8080` → click through the warning

You'll see a 404 on `:3000` — that's fine, it just means the cert is now trusted for that session. After this, the app works normally.

> **Why step 1 matters:** fetch() and WebSocket connections to an untrusted certificate are blocked silently by the browser and surface as CORS or network errors. Accepting the cert via direct navigation fixes this.

----

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
