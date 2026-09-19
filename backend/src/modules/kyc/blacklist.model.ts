import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklist extends Document {
  nidHash?: string;
  phoneHash?: string;
  deviceId?: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlacklistSchema = new Schema({
  nidHash: { type: String, sparse: true },
  phoneHash: { type: String, sparse: true },
  deviceId: { type: String, sparse: true },
  reason: { type: String, default: 'Permanently banned' },
}, { timestamps: true });

// Indexes for fast lookups
BlacklistSchema.index({ nidHash: 1 });
BlacklistSchema.index({ phoneHash: 1 });
BlacklistSchema.index({ deviceId: 1 });

export const Blacklist = mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);
