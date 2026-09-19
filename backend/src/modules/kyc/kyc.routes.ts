import { Router } from 'express';
import multer from 'multer';
import { KYCController } from './kyc.controller';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';
import { initiateKycSchema } from './kyc.validation';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const kycRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  message: 'Too many KYC attempts, please try again tomorrow.',
  keyGenerator: (req) => {
    return `rl:kyc:${req.user?.userId}`;
  }
});

router.post(
  '/verify-kyc',
  authenticate,
  authorize('registered'),
  kycRateLimiter,
  upload.single('selfieImage'),
  validate(initiateKycSchema),
  KYCController.verifyKYC
);

export default router;
