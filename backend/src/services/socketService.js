import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export const connectDigitalTwin = () => {
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectDigitalTwin = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
