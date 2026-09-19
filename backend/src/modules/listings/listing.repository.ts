import mongoose from 'mongoose';
import { Listing, IListing } from './listing.model';

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number; // in meters
  thana?: string;
  condition?: string;
  page?: number;
  limit?: number;
}

export class ListingRepository {
  /**
   * Insert a new listing.
   */
  static async create(data: Partial<IListing>) {
    return Listing.create(data);
  }

  /**
   * Find listing by _id, populate seller's displayName and trustScore.
   */
  static async findById(id: string) {
    return Listing.findById(id).populate('sellerId', 'displayName trustScore');
  }

  /**
   * Advanced search with optional filters.
   */
  static async search(filters: SearchFilters) {
    const query: Record<string, any> = { status: 'active' };

    if (filters.category) query.category = filters.category;
    if (filters.thana) query['location.thana'] = filters.thana;
    if (filters.condition) query.condition = filters.condition;

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    if (filters.lat !== undefined && filters.lng !== undefined && filters.radius !== undefined) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [filters.lng, filters.lat] // GeoJSON is [longitude, latitude]
          },
          $maxDistance: filters.radius // in meters
        }
      };
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 50); // Default 20, max 50
    const skip = (page - 1) * limit;

    let mongoQuery = Listing.find(query);

    // If searching by text, sort by text score, else sort by createdAt desc
    if (filters.search) {
      mongoQuery = mongoQuery.sort({ score: { $meta: 'textScore' } });
    } else {
      mongoQuery = mongoQuery.sort({ createdAt: -1 });
    }

    const listings = await mongoQuery
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'displayName trustScore')
      .exec();

    const total = await Listing.countDocuments(query);

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Atomic update of listing status.
   */
  static async updateStatus(id: string, status: string, buyerId?: string, session?: mongoose.ClientSession) {
    const updateData: any = { status };
    if (buyerId) updateData.buyerId = buyerId;

    return Listing.findByIdAndUpdate(id, updateData, { new: true, session });
  }

  /**
   * Get listings owned by a specific seller.
   */
  static async findBySeller(sellerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const listings = await Listing.find({ sellerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await Listing.countDocuments({ sellerId });

    return {
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Atomic increment of reportCount. Return new count.
   */
  static async incrementReportCount(id: string) {
    const listing = await Listing.findByIdAndUpdate(
      id,
      { $inc: { reportCount: 1 } },
      { new: true, select: 'reportCount' }
    );
    return listing?.reportCount || 0;
  }
  
  /**
   * Atomic increment of viewCount.
   */
  static async incrementViewCount(id: string) {
    return Listing.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true, select: 'viewCount' }
    );
  }

  /**
   * Compare title, category, imageUrls, and price (Δ > 30%) to determine if re-moderation is needed.
   */
  static checkRemodTrigger(originalListing: IListing, updateData: Partial<IListing>): boolean {
    if (updateData.title && updateData.title !== originalListing.title) return true;
    if (updateData.category && updateData.category !== originalListing.category) return true;
    
    // Arrays comparison for imageUrls (simple JSON stringify is enough here since order matters)
    if (updateData.imageUrls && JSON.stringify(updateData.imageUrls) !== JSON.stringify(originalListing.imageUrls)) {
      return true;
    }

    if (updateData.price && originalListing.price > 0) {
      const priceDiffRatio = Math.abs(updateData.price - originalListing.price) / originalListing.price;
      if (priceDiffRatio > 0.3) return true; // > 30%
    }

    return false;
  }
}
