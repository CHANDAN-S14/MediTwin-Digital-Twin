import { Server } from "socket.io";

let io = null;

export const EVENTS = {
  ROBOT_STATUS: "robot:status",
  ROBOT_POSITION: "robot:position",

  WASTE_COLLECTED: "waste:collected",
  WASTE_DEPOSITED: "waste:deposited",

  TASK_UPDATED: "task:updated",
  WASTE_UPDATED: "waste:updated",

  DIGITAL_TWIN_UPDATE: "digitalTwin:update",
};

/**
 * Initialize Socket.IO
 */
export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: true,
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
    console.log("🔌 Socket connected:", socket.id);

    /**
     * Hospital room
     */
    socket.on("join:hospital", (hospitalId) => {
      if (!hospitalId) return;

      const room = `hospital:${hospitalId}`;

      socket.join(room);

      console.log(
        `🏥 Socket ${socket.id} joined ${room}`
      );
    });

    /**
     * Digital Twin room
     */
    socket.on("digitalTwin:join", () => {
      socket.join("digital-twin");

      console.log(
        `🤖 Socket ${socket.id} joined digital-twin`
      );
    });

    /**
     * Disconnect
     */
    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 Socket disconnected: ${socket.id}`,
        reason
      );
    });
  });

  console.log("✅ Socket.IO initialized");

  return io;
}

/**
 * Get Socket.IO instance
 */
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
      "⚠️ Socket.IO not initialized:",
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

export function emitRobotStatus(
  robotId,
  data = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  const payload = {
    robotId,
    ...data,
  };

  console.log(
    "🤖 Robot status:",
    payload
  );

  io.emit(
    EVENTS.ROBOT_STATUS,
    payload
  );

  /**
   * Also send to hospital room if hospitalId exists
   */
  if (data?.hospitalId) {
    emitToHospital(
      data.hospitalId,
      EVENTS.ROBOT_STATUS,
      payload
    );
  }
}

/* ============================================================
   ROBOT POSITION
============================================================ */

export function emitRobotPosition(
  robotId,
  position = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  const payload = {
    robotId,

    position: {
      x: Number(position?.x) || 0,
      y: Number(position?.y) || 0,
      z: Number(position?.z) || 0,
    },
  };

  console.log(
    "📍 Robot position:",
    payload
  );

  io.emit(
    EVENTS.ROBOT_POSITION,
    payload
  );
}

/* ============================================================
   DIGITAL TWIN UPDATE
============================================================ */

export function emitDigitalTwinUpdate(
  robotId,
  data = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  const payload = {
    robotId,
    ...data,
  };

  console.log(
    "🎮 Digital Twin update:",
    payload
  );

  io.emit(
    EVENTS.DIGITAL_TWIN_UPDATE,
    payload
  );
}

/* ============================================================
   WASTE COLLECTED
============================================================ */

export function emitWasteCollected(
  data = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  console.log(
    "♻️ Waste collected:",
    data
  );

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

export function emitWasteDeposited(
  data = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  console.log(
    "🗑️ Waste deposited:",
    data
  );

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

export function emitTaskUpdated(
  data = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  console.log(
    "📋 Task updated:",
    data
  );

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

export function emitWasteUpdated(
  data = {}
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  console.log(
    "♻️ Waste updated:",
    data
  );

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

/* ============================================================
   OPTIONAL: BROADCAST TO DIGITAL TWIN
============================================================ */

export function emitToDigitalTwin(
  event,
  data
) {
  if (!io) {
    console.warn(
      "⚠️ Socket.IO not initialized"
    );
    return;
  }

  io.to("digital-twin").emit(
    event,
    data
  );
}
