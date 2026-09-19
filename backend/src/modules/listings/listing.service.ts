import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import { IListing } from './listing.model';
import { ListingRepository, SearchFilters } from './listing.repository';
import { QuotaService } from './quota.service';
import { QuotaExceededError, BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import redisClient from '../../config/redis';

// Queue for image processing (watermarking)
const imageProcessingQueue = new Queue('image-processing-queue', {
  connection: redisClient
});

// Queue for notifications
const notificationQueue = new Queue('notification-queue', {
  connection: redisClient
});

const PRICE_FLOORS: Record<string, number> = {
  smartphones: 1000,
  laptops: 3000,
  motorbikes: 20000,
  others: 1
};

export class ListingService {
  /**
   * Create a new listing.
   */
  static async createListing(userId: string, data: Partial<IListing>) {
    // 1. Check monthly quota
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const canPost = await QuotaService.canPostFreeAd(userId, monthYear);
    
    if (!canPost) {
      throw new QuotaExceededError();
    }

    // 2. Validate price floors
    const category = data.category as string;
    const minPrice = PRICE_FLOORS[category] || PRICE_FLOORS['others'];
    if (data.price === undefined || data.price < minPrice) {
      throw new BadRequestError(`Minimum price for ${category} is ${minPrice} BDT`);
    }

    // 3. Set expiresAt to now + 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 4. Save listing with status "active"
    const listingData = {
      ...data,
      sellerId: new mongoose.Types.ObjectId(userId),
      status: 'active' as const,
      expiresAt
    };
    
    const newListing = await ListingRepository.create(listingData);

    // 5. Dispatch image watermarking job
    await imageProcessingQueue.add('watermark-images', {
      listingId: newListing.id,
      imageUrls: newListing.imageUrls
    });

    // 6. Increment quota counter
    await QuotaService.incrementFreeAdQuota(userId, monthYear);

    return newListing;
  }

  /**
   * Search listings with pagination and filters.
   */
  static async searchListings(filters: SearchFilters) {
    return ListingRepository.search(filters);
  }

  /**
   * Get listing by ID and increment views.
   */
  static async getListingById(id: string) {
    const listing = await ListingRepository.findById(id);
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Atomically increment views without waiting for it to finish
    ListingRepository.incrementViewCount(id).catch(err => console.error(err));

    return listing;
  }

  /**
   * Update a listing and trigger remod if necessary.
   */
  static async updateListing(userId: string, listingId: string, updateData: Partial<IListing>) {
    const listing = await ListingRepository.findById(listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    if (listing.sellerId._id.toString() !== userId) {
      throw new ForbiddenError('You can only update your own listings');
    }

    let nextStatus = listing.status;
    let remodReason = listing.remodReason;

    // Check remod trigger
    if (ListingRepository.checkRemodTrigger(listing, updateData)) {
      nextStatus = 'pending_remod';
      remodReason = 'Significant changes detected; pending moderator review.';
    }

    const finalUpdateData = {
      ...updateData,
      status: nextStatus,
      remodReason
    };

    // Update in DB (simple approach)
    Object.assign(listing, finalUpdateData);
    await listing.save();

    return listing;
  }

  /**
   * Update listing status (sold, reserved, active).
   */
  static async updateListingStatus(userId: string, listingId: string, newStatus: string, buyerId?: string) {
    const listing = await ListingRepository.findById(listingId);
    if (!listing) throw new NotFoundError('Listing not found');

    if (listing.sellerId._id.toString() !== userId) {
      throw new ForbiddenError('You can only update your own listings');
    }

    if (newStatus === 'sold') {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const updatedListing = await ListingRepository.updateStatus(listingId, 'sold', buyerId, session);
        
        // TODO: Close all open conversations for this listing
        // e.g. await ConversationRepository.closeAllForListing(listingId, session);

        // Dispatch notification job
        await notificationQueue.add('mutual-review-prompt', {
          listingId,
          sellerId: userId,
          buyerId: buyerId // Will be undefined if marked as sold outside the platform
        });

        await session.commitTransaction();
        session.endSession();

        return updatedListing;
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } else {
      // Simple status update
      return ListingRepository.updateStatus(listingId, newStatus);
    }
  }

  /**
   * Get listings created by the user.
   */
  static async getMyListings(userId: string, page: number, limit: number) {
    return ListingRepository.findBySeller(userId, page, limit);
  }
}
