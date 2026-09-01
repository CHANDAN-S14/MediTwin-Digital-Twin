// backend/src/services/socketService.js

import { Server } from "socket.io";

let io = null;

/**
 * Initialize Socket.IO
 */
export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://mediatwin.netlify.app",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("digitalTwin:join", () => {
      socket.join("digital-twin");
      console.log(`Socket ${socket.id} joined digital-twin`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  console.log("Socket.IO initialized");

  return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}

/**
 * Send robot updates to Digital Twin
 *
 * robotSimulator.js uses this function.
 */
export function emitDigitalTwinUpdate(data) {
  if (!io) {
    console.warn(
      "Socket.IO is not initialized. Digital Twin update skipped."
    );
    return;
  }

  // Send to all connected clients
  io.emit("robot:status", data);

  // If position exists, also send position event
  if (data?.position) {
    io.emit("robot:position", {
      robotId: data.robotId || "MB-01",
      position: data.position,
    });
  }
}

/**
 * Robot status event
 */
export function emitRobotStatus(data) {
  if (!io) return;

  io.emit("robot:status", data);
}

/**
 * Robot position event
 */
export function emitRobotPosition(data) {
  if (!io) return;

  io.emit("robot:position", data);
}

/**
 * Waste collected event
 */
export function emitWasteCollected(data) {
  if (!io) return;

  io.emit("waste:collected", data);
}

/**
 * Waste deposited event
 */
export function emitWasteDeposited(data) {
  if (!io) return;

  io.emit("waste:deposited", data);
}
