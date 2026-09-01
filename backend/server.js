import http from 'node:http';
import app from './src/app.js';
import connectDB, { disconnectDB } from './src/config/db.js';
import { initializeSocket } from './src/services/socketService.js';
import {
  stopAll,
  runningCount,
} from './src/services/robotSimulator.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.js';

const server = http.createServer(app);

const start = async () => {
  await connectDB();

initializeSocket(server);

  server.listen(env.port, '0.0.0.0',  () => {
    logger.info(
      `MediTwin API listening on http://localhost:${env.port} (${env.nodeEnv})`
    );

    logger.info(
      `Classifier expected at ${env.aiServiceUrl}`
    );
  });
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down`);

  if (runningCount() > 0) {
    logger.info(
      `Cancelling ${runningCount()} active collection(s)`
    );
  }

  await stopAll();

  server.close(async () => {
    await disconnectDB().catch(() => {});

    logger.info('Shutdown complete');

    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  logger.error('Failed to start:', err);
  process.exit(1);
});
