import { Server } from "socket.io";

let io = null;

/* ============================================================
   SOCKET EVENTS
============================================================ */

export const EVENTS = {
  ROBOT_STATUS: "robot:status",
  ROBOT_POSITION: "robot:position",

  WASTE_COLLECTED: "waste:collected",
  WASTE_DEPOSITED: "waste:deposited",

  TASK_UPDATED: "task:updated",

  WASTE_UPDATED: "waste:updated",

  DIGITAL_TWIN_UPDATE: "digitalTwin:update",
};

/* ============================================================
   INITIALIZE SOCKET.IO
============================================================ */

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://mediatwin.netlify.app",
      ],

      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],

      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join:hospital", (hospitalId) => {
      if (!hospitalId) return;

      const room = `hospital:${hospitalId}`;

      socket.join(room);

      console.log(
        `Socket ${socket.id} joined ${room}`
      );
    });

    socket.on("digitalTwin:join", () => {
      socket.join("digital-twin");

      console.log(
        `Socket ${socket.id} joined digital-twin`
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}`,
        reason
      );
    });
  });

  console.log("Socket.IO initialized");

  return io;
}

/* ============================================================
   GET SOCKET.IO INSTANCE
============================================================ */

export function getIO() {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized"
    );
  }

  return io;
}

/* ============================================================
   HOSPITAL
============================================================ */

export function emitToHospital(
  hospitalId,
  event,
  data
) {
  if (!io) {
    console.warn(
      "Socket.IO not initialized. Event skipped:",
      event
    );

    return;
  }

  if (!hospitalId) {
    return;
  }

  io.to(`hospital:${hospitalId}`).emit(
    event,
    data
  );
}

/* ============================================================
   ROBOT STATUS
============================================================ */

export function emitRobotStatus(robotId, data) {
  if (!io) {
    console.warn("Socket.IO not initialized");
    return;
  }

  io.emit(EVENTS.ROBOT_STATUS, {
    robotId,
    ...data,
  });
}
/* ============================================================
   ROBOT POSITION
============================================================ */
export function emitRobotPosition(robotId, position) {
  if (!io) {
    console.warn("Socket.IO not initialized");
    return;
  }

  io.emit(EVENTS.ROBOT_POSITION, {
    robotId,
    position: {
      x: Number(position?.x) || 0,
      y: Number(position?.y) || 0,
      z: Number(position?.z) || 0,
    },
  });
}

/* ============================================================
   DIGITAL TWIN UPDATE
============================================================ */

export function emitDigitalTwinUpdate(robotId, data) {
  if (!io) {
    console.warn(
      "Socket.IO not initialized. Digital Twin update skipped."
    );

    return;
  }

  const payload = {
    robotId,
    ...data,
  };

  io.emit(
    EVENTS.ROBOT_STATUS,
    payload
  );

  if (payload?.position) {
    io.emit(
      EVENTS.ROBOT_POSITION,
      {
        robotId,
        position: {
          x: Number(payload.position.x) || 0,
          y: Number(payload.position.y) || 0,
          z: Number(payload.position.z) || 0,
        },
      }
    );
  }

  io.emit(
    EVENTS.DIGITAL_TWIN_UPDATE,
    payload
  );
}
/* ============================================================
   WASTE COLLECTED
============================================================ */

export function emitWasteCollected(data) {
  if (!io) return;

  io.emit(
    EVENTS.WASTE_COLLECTED,
    data
  );

  if (data?.hospitalId) {
    emitToHospital(
      data.hospitalId,
      EVENTS.WASTE_COLLECTED,
      data
    );
  }
}

/* ============================================================
   WASTE DEPOSITED
============================================================ */

export function emitWasteDeposited(data) {
  if (!io) return;

  io.emit(
    EVENTS.WASTE_DEPOSITED,
    data
  );

  if (data?.hospitalId) {
    emitToHospital(
      data.hospitalId,
      EVENTS.WASTE_DEPOSITED,
      data
    );
  }
}

/* ============================================================
   TASK UPDATED
============================================================ */

export function emitTaskUpdated(data) {
  if (!io) return;

  io.emit(
    EVENTS.TASK_UPDATED,
    data
  );

  if (data?.hospitalId) {
    emitToHospital(
      data.hospitalId,
      EVENTS.TASK_UPDATED,
      data
    );
  }
}

/* ============================================================
   WASTE UPDATED
============================================================ */

export function emitWasteUpdated(data) {
  if (!io) return;

  io.emit(
    EVENTS.WASTE_UPDATED,
    data
  );

  if (data?.hospitalId) {
    emitToHospital(
      data.hospitalId,
      EVENTS.WASTE_UPDATED,
      data
    );
  }
}
