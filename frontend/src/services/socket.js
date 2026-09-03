import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://meditwin-digital-twin.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,

  transports: ["websocket", "polling"],

  withCredentials: true,
});

socket.on("connect", () => {
  console.log(
    "🟢 Digital Twin Socket connected:",
    socket.id
  );

  socket.emit("digitalTwin:join");

  console.log(
    "📡 Joined digital-twin room"
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

socket.onAny((event, data) => {
  console.log(
    "📨 SOCKET EVENT:",
    event,
    data
  );
});

export function connectDigitalTwin() {
  if (!socket.connected) {
    console.log(
      "🔌 Connecting to:",
      SOCKET_URL
    );

    socket.connect();
  }
}

export function disconnectDigitalTwin() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
