import { Request, Response, NextFunction } from 'express';
import { ListingService } from './listing.service';
import { SearchFilters } from './listing.repository';

export class ListingController {
  static async createListing(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const listing = await ListingService.createListing(userId, req.body);
      res.status(201).json({
        message: 'Listing created successfully',
        data: listing
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchListings(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as unknown as SearchFilters;
      const results = await ListingService.searchListings(filters);
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }

  static async getListingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const listing = await ListingService.getListingById(id as string);
      res.status(200).json({ data: listing });
    } catch (error) {
      next(error);
    }
  }

  static async updateListing(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const listing = await ListingService.updateListing(userId, id as string, req.body);
      res.status(200).json({
        message: 'Listing updated successfully',
        data: listing
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { status, buyerId } = req.body;
      const listing = await ListingService.updateListingStatus(userId, id as string, status, buyerId);
      res.status(200).json({
        message: 'Listing status updated successfully',
        data: listing
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyListings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const results = await ListingService.getMyListings(userId, page, limit);
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }
}
