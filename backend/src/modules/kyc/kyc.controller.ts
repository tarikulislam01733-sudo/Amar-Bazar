import { Request, Response, NextFunction } from 'express';
import { KYCService } from './kyc.service';
import { BadRequestError } from '../../shared/errors';

export class KYCController {
  static async verifyKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const { nidNumber, dob } = req.body;
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        throw new BadRequestError('Selfie image is required');
      }

      const result = await KYCService.initiateKYC(userId, nidNumber, dob, file.buffer);

      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }
}
