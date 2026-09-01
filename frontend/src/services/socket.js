import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export function connectDigitalTwin() {
  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("digitalTwin:join");
}

export function disconnectDigitalTwin() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
