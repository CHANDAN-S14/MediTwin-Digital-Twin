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

    /* --------------------------------------------------------
       Join hospital room
    -------------------------------------------------------- */

    socket.on("join:hospital", (hospitalId) => {
      if (!hospitalId) return;

      const room = `hospital:${hospitalId}`;

      socket.join(room);

      console.log(
        `Socket ${socket.id} joined ${room}`
      );
    });

    /* --------------------------------------------------------
       Digital Twin room
    -------------------------------------------------------- */

    socket.on("digitalTwin:join", () => {
      socket.join("digital-twin");

      console.log(
        `Socket ${socket.id} joined digital-twin`
      );
    });

    /* --------------------------------------------------------
       Disconnect
    -------------------------------------------------------- */

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
   EMIT TO HOSPITAL
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
    console.warn(
      "emitToHospital called without hospitalId"
    );

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

export function emitRobotStatus(data) {
  if (!io) {
    console.warn(
      "Socket.IO not initialized"
    );

    return;
  }

  io.emit(
    EVENTS.ROBOT_STATUS,
    data
  );
}

/* ============================================================
   ROBOT POSITION
============================================================ */

export function emitRobotPosition(data) {
  if (!io) {
    console.warn(
      "Socket.IO not initialized"
    );

    return;
  }

  io.emit(
    EVENTS.ROBOT_POSITION,
    data
  );
}

/* ============================================================
   DIGITAL TWIN UPDATE
============================================================ */

export function emitDigitalTwinUpdate(data) {
  if (!io) {
    console.warn(
      "Socket.IO not initialized. Digital Twin update skipped."
    );

    return;
  }

  /* Robot status */

  io.emit(
    EVENTS.ROBOT_STATUS,
    data
  );

  /* Robot position */

  if (data?.position) {
    io.emit(
      EVENTS.ROBOT_POSITION,
      {
        robotId:
          data.robotId || "MB-01",

        position: {
          x: Number(data.position.x) || 0,

          y: Number(data.position.y) || 0,

          z: Number(data.position.z) || 0,
        },
      }
    );
  }

  /* Digital Twin event */

  io.emit(
    EVENTS.DIGITAL_TWIN_UPDATE,
    data
  );
}

/* ============================================================
   WASTE COLLECTED
============================================================ */

export function emitWasteCollected(data) {
  if (!io) {
    console.warn(
      "Socket.IO not initialized"
    );

    return;
  }

  io.emit(
    EVENTS.WASTE_COLLECTED,
    data
  );

  /* Also notify hospital */

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
  if (!io) {
    console.warn(
      "Socket.IO not initialized"
    );

    return;
  }

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
  if (!io) {
    console.warn(
      "Socket.IO not initialized"
    );

    return;
  }

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
  if (!io) {
    console.warn(
      "Socket.IO not initialized"
    );

    return;
  }

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
