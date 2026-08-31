// backend/src/controllers/systemController.js

import asyncHandler from '../utils/asyncHandler.js';

import env from '../config/env.js';

import { runningCount } from '../services/robotSimulator.js';

import {
  checkHealth as checkAIHealth,
} from '../services/aiService.js';

import {
  getIO,
} from '../services/socketService.js';

/**
 * GET /api/v1/system/status
 *
 * Returns the overall MediTwin system status.
 *
 * Includes:
 * - API
 * - MongoDB
 * - AI service
 * - Robot simulator
 * - Socket.IO
 */
export const getSystemStatus = asyncHandler(
  async (req, res) => {

    /**
     * --------------------------------------------------
     * AI SERVICE
     * --------------------------------------------------
     */

    let ai = {
      online: false,
      ready: false,
      detail: 'AI service unavailable',
    };

    try {
      ai = await checkAIHealth();
    } catch (error) {
      ai = {
        online: false,
        ready: false,
        detail: error.message,
      };
    }

    /**
     * --------------------------------------------------
     * ROBOT SIMULATOR
     * --------------------------------------------------
     */

    let activeRobotTasks = 0;

    try {
      activeRobotTasks = runningCount();
    } catch (error) {
      console.error(
        'Could not read robot simulator:',
        error
      );
    }

    /**
     * --------------------------------------------------
     * SOCKET.IO
     * --------------------------------------------------
     */

    let socketOnline = false;

    try {
      getIO();
      socketOnline = true;
    } catch {
      socketOnline = false;
    }

    /**
     * --------------------------------------------------
     * OVERALL STATUS
     * --------------------------------------------------
     */

    const apiOnline = true;

    const overall =
      apiOnline &&
      socketOnline &&
      ai.online &&
      ai.ready
        ? 'healthy'
        : 'degraded';

    res.status(200).json({
      success: true,

      data: {
        status: overall,

        api: {
          online: apiOnline,
          environment:
            env.nodeEnv || 'development',
          port:
            env.port || 5000,
        },

        ai: {
          online: Boolean(ai.online),
          ready: Boolean(ai.ready),
          modelLoaded:
            Boolean(ai.modelLoaded),
          modelTrained:
            Boolean(ai.modelTrained),
          modelVersion:
            ai.modelVersion || null,
          architecture:
            ai.architecture || null,
          device:
            ai.device || null,
          detail:
            ai.detail || null,
          loadError:
            ai.loadError || null,
        },

        robots: {
          simulator: true,
          activeTasks:
            activeRobotTasks,
        },

        socket: {
          online: socketOnline,
        },

        timestamp:
          new Date().toISOString(),
      },
    });
  }
);

/**
 * GET /api/v1/system/health
 *
 * Lightweight health endpoint.
 *
 * Useful for checking whether Node.js itself
 * is running without requiring the AI service.
 */
export const health = asyncHandler(
  async (_req, res) => {
    res.status(200).json({
      success: true,

      data: {
        status: 'ok',
        service: 'MediTwin API',
        timestamp:
          new Date().toISOString(),
      },
    });
  }
);

export default {
  getSystemStatus,
  health,
};