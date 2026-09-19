import mongoose, { Schema, Document } from 'mongoose';

export interface IListing extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'smartphones' | 'laptops' | 'motorbikes' | 'electronics' | 'furniture' | 'clothing' | 'others';
  subcategory?: string;
  price: number;
  condition: 'Like New' | 'Good' | 'Fair' | 'For Parts';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    division: string;
    district: string;
    thana: string;
  };
  imageUrls: string[];
  status: 'active' | 'pending_remod' | 'reserved' | 'sold' | 'temporarily_suppressed';
  buyerId?: mongoose.Types.ObjectId;
  remodReason?: string;
  isFeatured: boolean;
  isUrgent: boolean;
  reportCount: number;
  viewCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 80 },
  description: { type: String, required: true, maxlength: 2000 },
  category: {
    type: String,
    enum: ['smartphones', 'laptops', 'motorbikes', 'electronics', 'furniture', 'clothing', 'others'],
    required: true
  },
  subcategory: { type: String },
  price: { type: Number, required: true, min: 0 },
  condition: {
    type: String,
    enum: ['Like New', 'Good', 'Fair', 'For Parts'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    division: { type: String, required: true },
    district: { type: String, required: true },
    thana: { type: String, required: true }
  },
  imageUrls: {
    type: [String],
    required: true,
    validate: [
      (val: string[]) => val.length >= 1 && val.length <= 5,
      'Listings must have between 1 and 5 images.'
    ]
  },
  status: {
    type: String,
    enum: ['active', 'pending_remod', 'reserved', 'sold', 'temporarily_suppressed'],
    default: 'active'
  },
  buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
  remodReason: { type: String },
  isFeatured: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Indexes
ListingSchema.index({ location: '2dsphere' });
ListingSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 5, description: 1 } }
);
ListingSchema.index({ status: 1, category: 1, 'location.thana': 1, createdAt: -1 });
ListingSchema.index({ sellerId: 1 });
ListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL Index based on expiresAt

export const Listing = mongoose.model<IListing>('Listing', ListingSchema);
