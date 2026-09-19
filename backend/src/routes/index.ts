import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import kycRoutes from '../modules/kyc/kyc.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth', kycRoutes);

export default router;
