import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://meditwin-digital-twin.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

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

export function disconnectDigitalTwin() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
