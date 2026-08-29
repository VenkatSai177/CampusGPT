import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// In-Memory Rate Limiting Store
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Security Headers Middleware
 * Appears on every HTTP response to harden against common web vulnerabilities.
 */
export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com;"
  );
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

/**
 * Configurable Rate Limiting Middleware Factory
 */
export const createRateLimiter = (options: { windowMs: number; maxRequests: number; message?: string }) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const maxRequests = options.maxRequests || 100;
  const message = options.message || 'Too many requests from this IP, please try again later.';

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      logger.warn(`⚠️ Rate Limit Exceeded for IP ${ip} on path ${req.originalUrl}`);
      res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
};

// Preset Limiter Instances
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const chatRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  maxRequests: 20,
  message: 'Rate limit exceeded for chat queries. Maximum 20 requests per minute.',
});
