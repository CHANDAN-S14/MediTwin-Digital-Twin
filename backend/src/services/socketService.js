import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export function connectDigitalTwin() {
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectDigitalTwin() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
