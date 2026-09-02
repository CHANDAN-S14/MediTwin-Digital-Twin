import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://meditwin-digital-twin.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,

  transports: [
    "websocket",
    "polling",
  ],

  withCredentials: true,
});

socket.on("connect", () => {
  console.log(
    "🟢 Digital Twin Socket connected:",
    socket.id
  );

  socket.emit(
    "digitalTwin:join"
  );
});

socket.on("disconnect", (reason) => {
  console.log(
    "🔴 Digital Twin Socket disconnected:",
    reason
  );
});

socket.on("connect_error", (error) => {
  console.error(
    "❌ Socket connection error:",
    error.message
  );
});

export function connectDigitalTwin() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectDigitalTwin() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
