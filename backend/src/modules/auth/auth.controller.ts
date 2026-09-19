import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { UnauthorizedError } from '../../shared/errors/UnauthorizedError';

export class AuthController {
  static async requestOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await AuthService.requestOTP(phone);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = req.body;
      const { accessToken, refreshToken, user } = await AuthService.verifyOTP(phone, otp);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, accessToken, user });
    } catch (error) {
      next(error);
    }
  }

  static async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        throw new UnauthorizedError('No refresh token provided');
      }

      const { accessToken, refreshToken } = await AuthService.refreshAccessToken(token);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (token && req.user) {
        await AuthService.logout(req.user.userId, token);
      }
      
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}
