import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  role: 'guest' | 'registered' | 'verified' | 'moderator' | 'superadmin';
  nidHash?: string;
  legalNameBangla?: string;
  displayName: string;
  trustScore: number;
  totalDeals: number;
  totalReviews: number;
  deviceIds: string[];
  status: 'active' | 'quarantined' | 'suspended' | 'banned';
  banReason?: string;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ['guest', 'registered', 'verified', 'moderator', 'superadmin'],
    default: 'registered',
  },
  nidHash: { type: String, unique: true, sparse: true },
  legalNameBangla: { type: String },
  displayName: { type: String, required: true },
  trustScore: { type: Number, default: 5.0 },
  totalDeals: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  deviceIds: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['active', 'quarantined', 'suspended', 'banned'],
    default: 'active',
  },
  banReason: { type: String },
  lastActiveAt: { type: Date },
}, { timestamps: true });

// Indexes
UserSchema.index({ status: 1 });
UserSchema.index({ deviceIds: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
