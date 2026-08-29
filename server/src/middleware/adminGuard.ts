import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { UserRole } from '../types';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Access denied. Role '${req.user.role}' is not authorized for this resource.`, 403)
      );
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
