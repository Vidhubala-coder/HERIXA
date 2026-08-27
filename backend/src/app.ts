import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import monumentRoutes from './routes/monumentRoutes';
import userRoutes from './routes/userRoutes';
import assistantRoutes from './routes/assistantRoutes';
import historyRoutes from './routes/historyRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Serve uploads folder statically using an absolute path
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// 1. Security Headers via Helmet
app.use(helmet());

// 2. CORS configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:19006', 'http://localhost:19000'];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // In development mode, allow any local network address for physical phone debugging
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhostOrLocalNetwork = 
      origin.startsWith('http://localhost') || 
      origin.startsWith('http://127.0.0.1') || 
      origin.startsWith('http://10.') || 
      origin.startsWith('http://192.168.');

    if (allowedOrigins.indexOf(origin) !== -1 || (isDevelopment && isLocalhostOrLocalNetwork)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
};

app.use(cors(corsOptions));

// 3. Rate Limiting to prevent brute-force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

// 4. Request parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import { getAiServiceState, checkAiServiceHealth } from './services/aiService';

// 5. Mount API Routes
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  await checkAiServiceHealth();
  const aiStatus = getAiServiceState();
  
  res.status(200).json({
    success: true,
    service: 'HERIXA backend',
    message: 'HERIXA backend is running',
    database: dbStatus,
    ai_recognition: {
      status: aiStatus.state,
      lastCheckTime: aiStatus.lastCheckTime,
      failureReason: aiStatus.lastFailureReason || undefined
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/monuments', monumentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/history', historyRoutes);

// 6. Handle Route Not Found
app.use(notFoundHandler);

// 7. Centralized Error Handler
app.use(errorHandler);

export default app;
