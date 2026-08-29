import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 CampusGPT Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`👉 Health Check: http://localhost:${env.PORT}/api/health`);
  logger.info(`👉 Auth API: http://localhost:${env.PORT}/api/auth`);
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
