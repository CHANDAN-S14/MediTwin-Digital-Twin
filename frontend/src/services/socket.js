import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'https://meditwin-digital-twin.onrender.com';

const socket = io(SOCKET_URL, {
  autoConnect: false,

  transports: [
    'websocket',
    'polling',
  ],

  withCredentials: true,
});

export const connectDigitalTwin = () => {
  if (!socket.connected) {
    console.log(
      '🔌 Connecting to:',
      SOCKET_URL
    );

    socket.connect();
  }

  socket.emit('digitalTwin:join');
};

socket.on('connect', () => {
  console.log(
    '✅ Socket connected:',
    socket.id
  );

  socket.emit('digitalTwin:join');
});

socket.on('connect_error', (error) => {
  console.error(
    '❌ Socket connection error:',
    error.message
  );
});

socket.on('disconnect', (reason) => {
  console.log(
    '🔌 Socket disconnected:',
    reason
  );
});

export default socket;
