import dotenv from 'dotenv';
dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing ${key}. Copy backend/.env.example to backend/.env and fill it in.`
    );
  }
  return value;
};

const num = (key, fallback) => {
  const raw = process.env[key];
  const parsed = Number(raw);
  return raw !== undefined && Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: num('PORT', 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meditwin',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  aiServiceTimeoutMs: num('AI_SERVICE_TIMEOUT_MS', 15000),
  simTickMs: num('SIM_TICK_MS', 1200),
  get isProd() { return this.nodeEnv === 'production'; },
};

export default env;
