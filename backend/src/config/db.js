import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.error('MongoDB connection failed:', err.message);
    logger.error('Start MongoDB, or point MONGO_URI at an Atlas cluster, then retry.');
    process.exit(1);
  }
};

export const disconnectDB = () => mongoose.connection.close();

export default connectDB;
