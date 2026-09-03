import { Server } from 'socket.io';

let io = null;

export const EVENTS = {
  ROBOT_STATUS: 'robot:status',
  ROBOT_POSITION: 'robot:position',

  WASTE_COLLECTED: 'waste:collected',
  WASTE_DEPOSITED: 'waste:deposited',

  TASK_UPDATED: 'task:updated',
  WASTE_UPDATED: 'waste:updated',

  DIGITAL_TWIN_UPDATE: 'digitalTwin:update',
};

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('digitalTwin:join', () => {
      socket.join('digital-twin');

      console.log(
        `🤖 ${socket.id} joined digital-twin`
      );
    });

    socket.on('join:hospital', (hospitalId) => {
      if (!hospitalId) return;

      const room = `hospital:${hospitalId}`;

      socket.join(room);

      console.log(
        `🏥 ${socket.id} joined ${room}`
      );
    });

    socket.on('disconnect', (reason) => {
      console.log(
        `🔌 Socket disconnected: ${socket.id}`,
        reason
      );
    });
  });

  console.log('✅ Socket.IO initialized');

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error(
      'Socket.IO has not been initialized'
    );
  }

  return io;
}

/* ============================================================
   ROBOT STATUS
============================================================ */

export function emitRobotStatus(robotId, data) {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  const payload = {
    robotId,
    ...data,
  };

  console.log('🤖 Robot status:', payload);

  io.emit(EVENTS.ROBOT_STATUS, payload);
}

/* ============================================================
   ROBOT POSITION
============================================================ */

export function emitRobotPosition(robotId, position) {
  if (!io) {
    console.warn('Socket.IO not initialized');
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

  console.log('📍 Robot position:', payload);

  io.emit(EVENTS.ROBOT_POSITION, payload);
}

/* ============================================================
   DIGITAL TWIN
============================================================ */

export function emitDigitalTwinUpdate(robotId, data) {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  const payload = {
    robotId,
    ...data,
  };

  console.log('🎮 Digital Twin:', payload);

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

  console.log('♻️ Waste collected:', data);

  io.emit(
    EVENTS.WASTE_COLLECTED,
    data
  );
}

/* ============================================================
   WASTE DEPOSITED
============================================================ */

export function emitWasteDeposited(data) {
  if (!io) return;

  console.log('🗑️ Waste deposited:', data);

  io.emit(
    EVENTS.WASTE_DEPOSITED,
    data
  );
}

/* ============================================================
   TASK UPDATED
============================================================ */

export function emitTaskUpdated(data) {
  if (!io) return;

  console.log('📋 Task updated:', data);

  io.emit(
    EVENTS.TASK_UPDATED,
    data
  );
}

/* ============================================================
   WASTE UPDATED
============================================================ */

export function emitWasteUpdated(data) {
  if (!io) return;

  console.log('♻️ Waste updated:', data);

  io.emit(
    EVENTS.WASTE_UPDATED,
    data
  );
}
