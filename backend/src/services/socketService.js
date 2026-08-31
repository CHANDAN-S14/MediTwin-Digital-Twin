import { Server } from 'socket.io';

let io = null;

export const EVENTS = {
  ROBOT_STATUS: 'robot:status',
  ROBOT_POSITION: 'robot:position',
  DIGITAL_TWIN_UPDATE: 'digital-twin:update',
  WASTE_COLLECTED: 'waste:collected',
  WASTE_DEPOSITED: 'waste:deposited',
  TASK_UPDATED: 'task:updated',
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-hospital', (hospitalId) => {
      if (hospitalId) {
        socket.join(`hospital:${hospitalId}`);
      }

      // Demo/global fleet room
      socket.join('digital-twin');
    });

    socket.on('join-digital-twin', () => {
      socket.join('digital-twin');
    });

    socket.on('disconnect', () => {
      // Nothing required here
    });
  });

  console.log('Socket.IO ready');

  return io;
};

export const getIO = () => io;

export const emitToHospital = (hospitalId, event, data) => {
  if (!io) return;

  if (hospitalId) {
    io.to(`hospital:${hospitalId}`).emit(event, data);
  }

  // Always update the demo Digital Twin
  io.to('digital-twin').emit(event, data);
};

export const emitRobotStatus = (robotId, data) => {
  if (!io) return;

  const payload = {
    robotId,
    ...data,
  };

  io.emit(EVENTS.ROBOT_STATUS, payload);
};

export const emitRobotPosition = (robotId, position) => {
  if (!io) return;

  io.emit(EVENTS.ROBOT_POSITION, {
    robotId,
    position,
  });
};

export const emitDigitalTwinUpdate = (robotId, data = {}) => {
  if (!io) return;

  io.emit(EVENTS.DIGITAL_TWIN_UPDATE, {
    robotId,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

export const emitWasteCollected = (data) => {
  if (!io) return;

  io.emit(EVENTS.WASTE_COLLECTED, {
    timestamp: new Date().toISOString(),
    ...data,
  });
};

export const emitWasteDeposited = (data) => {
  if (!io) return;

  io.emit(EVENTS.WASTE_DEPOSITED, {
    timestamp: new Date().toISOString(),
    ...data,
  });
};

export const emitTaskUpdated = (data) => {
  if (!io) return;

  io.emit(EVENTS.TASK_UPDATED, {
    timestamp: new Date().toISOString(),
    ...data,
  });
};

export default {
  initSocket,
  getIO,
  emitToHospital,
  emitRobotStatus,
  emitRobotPosition,
  emitDigitalTwinUpdate,
  emitWasteCollected,
  emitWasteDeposited,
  emitTaskUpdated,
  EVENTS,
};