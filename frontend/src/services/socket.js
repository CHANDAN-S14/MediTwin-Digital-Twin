import { io } from "socket.io-client";

/* ============================================================
   SOCKET SERVER URL
============================================================ */

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://meditwin-digital-twin.onrender.com";

/* ============================================================
   SOCKET INSTANCE
============================================================ */

const socket = io(SOCKET_URL, {
  autoConnect: false,

  transports: ["websocket", "polling"],

  withCredentials: true,
});

/* ============================================================
   CONNECT DIGITAL TWIN
============================================================ */

export function connectDigitalTwin() {
  if (!socket.connected) {
    socket.connect();
  }

  if (socket.connected) {
    socket.emit("digitalTwin:join");
  } else {
    socket.once("connect", () => {
      socket.emit("digitalTwin:join");
    });
  }
}

/* ============================================================
   DISCONNECT DIGITAL TWIN
============================================================ */

export function disconnectDigitalTwin() {
  if (socket.connected) {
    socket.disconnect();
  }
}

/* ============================================================
   EXPORT SOCKET
============================================================ */

export default socket;
