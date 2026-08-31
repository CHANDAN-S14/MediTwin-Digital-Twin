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

/**
 * Sits behind a reverse proxy in any real deployment, so req.ip must come from
 * X-Forwarded-For. Without this the rate limiters would see the proxy's address
 * for every request and throttle the whole hospital as one client.
 */
app.set('trust proxy', 1);

app.use(helmet());

/**
 * The API is called from the Vite dev server and, in production, from wherever
 * the built frontend is served. Only those origins are allowed, and credentials
 * are enabled because the socket handshake carries a token.
 */
app.use(
  cors({
    origin: env.clientOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (!env.isProd) {
  app.use(morgan('dev', { stream: { write: (line) => logger.debug(line.trim()) } }));
}

/**
 * A broad ceiling on the whole API. Individual endpoints that deserve stricter
 * limits set their own; this one exists to blunt accidental request storms — a
 * dashboard stuck in a polling loop, most often.
 */
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: 'Too many requests. Slow down and try again shortly.' },
    },
  })
);

// Unauthenticated and dependency-free, so a load balancer can probe it while
// the database is still coming up.
app.get('/health', health);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
