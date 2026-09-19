import { z } from 'zod';
import mongoose from 'mongoose';

const categories = ['smartphones', 'laptops', 'motorbikes', 'electronics', 'furniture', 'clothing', 'others'] as const;
const conditions = ['Like New', 'Good', 'Fair', 'For Parts'] as const;

export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(10).max(80),
    description: z.string().min(30).max(2000),
    category: z.enum(categories),
    subcategory: z.string().optional(),
    price: z.number().int().positive(),
    condition: z.enum(conditions),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
      division: z.string(),
      district: z.string(),
      thana: z.string(),
    }),
    imageUrls: z.array(z.string().url()).min(1).max(5),
  })
});

export const updateListingSchema = z.object({
  body: z.object({
    title: z.string().min(10).max(80).optional(),
    description: z.string().min(30).max(2000).optional(),
    category: z.enum(categories).optional(),
    subcategory: z.string().optional(),
    price: z.number().int().positive().optional(),
    condition: z.enum(conditions).optional(),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
      division: z.string(),
      district: z.string(),
      thana: z.string(),
    }).optional(),
    imageUrls: z.array(z.string().url()).min(1).max(5).optional(),
  })
});

export const searchListingsSchema = z.object({
  query: z.object({
    category: z.enum(categories).optional(),
    minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
    maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    lat: z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number).optional(),
    lng: z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number).optional(),
    radius: z.string().regex(/^\d+$/).transform(Number).optional(),
    thana: z.string().optional(),
    condition: z.enum(conditions).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  })
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'pending_remod', 'reserved', 'sold', 'temporarily_suppressed']),
    buyerId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid buyer ID',
    }).optional(),
  })
});
