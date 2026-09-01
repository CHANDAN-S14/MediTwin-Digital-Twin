import { Server } from "socket.io";

let io = null;

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
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  console.log("Socket.IO initialized");

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}

/* Robot + Digital Twin */

export function emitDigitalTwinUpdate(data) {
  if (!io) {
    console.warn("Socket.IO not initialized");
    return;
  }

  io.emit("robot:status", data);

  if (data?.position) {
    io.emit("robot:position", {
      robotId: data.robotId || "MB-01",
      position: data.position,
    });
  }
}

export function emitRobotStatus(data) {
  if (!io) return;

  io.emit("robot:status", data);
}

export function emitRobotPosition(data) {
  if (!io) return;

  io.emit("robot:position", data);
}

/* Waste */

export function emitWasteCollected(data) {
  if (!io) return;

  io.emit("waste:collected", data);
}

export function emitWasteDeposited(data) {
  if (!io) return;

  io.emit("waste:deposited", data);
}

/* Tasks */

export function emitTaskUpdated(data) {
  if (!io) {
    console.warn(
      "Socket.IO is not initialized. Task update skipped."
    );
    return;
  }

  io.emit("task:updated", data);
}
