import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import chatRoutes from './routes/chat.routes';
import conversationRoutes from './routes/conversation.routes';
import { securityHeadersMiddleware, authRateLimiter, chatRateLimiter } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app: Application = express();

// Apply Security Response Headers
app.use(securityHeadersMiddleware);

// Global CORS Middleware Configuration
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging Middleware
app.use((req: Request, _res: Response, next) => {
  if (req.path !== '/api/health') {
    logger.info(`[${req.method}] ${req.path}`);
  }
  next();
});

// API Routes with Rate-Limiting Protection
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRateLimiter, chatRoutes);
app.use('/api', conversationRoutes);

// 404 Fallback Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Requested API resource not found.',
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
