import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import { health } from './controllers/systemController.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import env from './config/env.js';
import logger from './utils/logger.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

/* ============================================================
   CORS
============================================================ */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',

  // Render frontend
  'https://meditwin-digital-twin-2.onrender.com',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('CORS blocked:', origin);

      return callback(
        new Error(`CORS blocked origin: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
    ],
  })
);

app.options('*', cors());

/* ============================================================
   BODY PARSING
============================================================ */

app.use(
  express.json({
    limit: '1mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* ============================================================
   LOGGING
============================================================ */

if (!env.isProd) {
  app.use(
    morgan('dev', {
      stream: {
        write: (line) => logger.debug(line.trim()),
      },
    })
  );
}

/* ============================================================
   RATE LIMIT
============================================================ */

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      error: {
        message:
          'Too many requests. Slow down and try again shortly.',
      },
    },
  })
);

/* ============================================================
   HEALTH
============================================================ */

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'MediTwin Backend API is running',
    status: 'online',
  });
});

app.get('/health', health);

/* ============================================================
   API
============================================================ */

app.use('/api/v1', routes);

/* ============================================================
   ERRORS
============================================================ */

app.use(notFound);
app.use(errorHandler);

export default app;
