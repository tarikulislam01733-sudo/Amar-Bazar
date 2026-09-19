import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklist extends Document {
  nidHash: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlacklistSchema = new Schema({
  nidHash: { type: String, required: true, unique: true },
  reason: { type: String, default: 'Permanently banned' }
}, { timestamps: true });

export const Blacklist = mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);
