import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://meditwin-digital-twin.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,

  transports: ["websocket", "polling"],

  withCredentials: true,
});

/**
 * Connect to backend Socket.IO
 */
export const connectDigitalTwin = () => {
  if (!socket.connected) {
    console.log("🔌 Connecting to Digital Twin:", SOCKET_URL);

    socket.connect();
  }
};

/**
 * Disconnect from backend Socket.IO
 */
export const disconnectDigitalTwin = () => {
  if (socket.connected) {
    console.log("🔌 Disconnecting from Digital Twin");

    socket.disconnect();
  }
};

/**
 * Join Digital Twin room
 */
export const joinDigitalTwin = () => {
  if (socket.connected) {
    socket.emit("digitalTwin:join");

    console.log("🤖 Joined digital-twin room");
  } else {
    console.warn(
      "⚠️ Cannot join digital-twin: socket not connected"
    );
  }
};

/**
 * Connect + join Digital Twin
 */
export const connectAndJoinDigitalTwin = () => {
  if (!socket.connected) {
    socket.connect();
  }

  socket.once("connect", () => {
    socket.emit("digitalTwin:join");

    console.log(
      "🤖 Connected and joined digital-twin room"
    );
  });
};

/**
 * Socket connection events
 */
socket.on("connect", () => {
  console.log(
    "✅ Socket connected:",
    socket.id
  );

  // Automatically join Digital Twin room
  socket.emit("digitalTwin:join");

  console.log(
    "🤖 Digital Twin room joined"
  );
});

socket.on("disconnect", (reason) => {
  console.log(
    "❌ Socket disconnected:",
    reason
  );
});

socket.on("connect_error", (error) => {
  console.error(
    "❌ Socket connection error:",
    error.message
  );
});

export default socket;
