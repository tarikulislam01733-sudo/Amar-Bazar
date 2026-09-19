import { Router } from 'express';
import { ListingController } from './listing.controller';
import { authenticate, requireVerified } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';
import {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
  updateStatusSchema
} from './listing.validation';

const router = Router();

// Public routes
router.get(
  '/search',
  validate(searchListingsSchema),
  ListingController.searchListings
);

router.get(
  '/:id',
  ListingController.getListingById
);

// Protected routes (Require authentication)
router.use(authenticate);

router.get(
  '/me/my-listings',
  ListingController.getMyListings
);

router.patch(
  '/:id/status',
  validate(updateStatusSchema),
  ListingController.updateStatus
);

// Protected routes (Require NID verification)
router.use(requireVerified);

router.post(
  '/',
  validate(createListingSchema),
  ListingController.createListing
);

router.put(
  '/:id',
  validate(updateListingSchema),
  ListingController.updateListing
);

export default router;
