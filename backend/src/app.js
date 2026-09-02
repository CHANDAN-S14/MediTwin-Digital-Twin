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

/* ============================================================
   PROXY
============================================================ */

app.set('trust proxy', 1);


/* ============================================================
   SECURITY
============================================================ */

app.use(helmet());


/* ============================================================
   CORS
============================================================ */

/*
 * IMPORTANT:
 *
 * Replace this with your REAL Netlify frontend URL.
 *
 * Example:
 * https://meditwin-digital-twin.netlify.app
 */

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',

  // Production Netlify frontend
  'https://mediatwin.netlify.app/',
];


/*
 * CORS configuration
 */

const corsOptions = {
  origin: (origin, callback) => {

    /*
     * Requests such as Postman/server-to-server requests
     * may not contain an Origin header.
     */
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked origin: ${origin}`);

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

  optionsSuccessStatus: 204,
};


/*
 * Apply CORS before the API routes.
 */

app.use(cors(corsOptions));


/*
 * Handle browser preflight requests.
 */

app.options('*', cors(corsOptions));


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
        write: (line) => {
          logger.debug(line.trim());
        },
      },
    })
  );
}


/* ============================================================
   RATE LIMITING
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
   ROOT
============================================================ */

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'MediTwin Backend API is running',
    status: 'online',
  });
});


/* ============================================================
   HEALTH
============================================================ */

app.get('/health', health);


/* ============================================================
   API ROUTES
============================================================ */

app.use(
  '/api/v1',
  routes
);


/* ============================================================
   404
============================================================ */

app.use(notFound);


/* ============================================================
   ERROR HANDLER
============================================================ */

app.use(errorHandler);


/* ============================================================
   EXPORT
============================================================ */

export default app;
