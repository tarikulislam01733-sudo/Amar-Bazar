import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { env } from '../../config/env';

export interface JwtPayload {
  userId: string;
  role: string;
  isNidVerified: boolean;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
};

export const requireVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.isNidVerified !== true) {
    return next(new ForbiddenError('NID verification required to perform this action.'));
  }
  next();
};
