import mongoose, { Schema, Document } from 'mongoose';

export interface IKYC extends Document {
  userId: string;
  nidHash: string;
  status: 'processing' | 'verified' | 'rejected';
  livenessConfidence?: number;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KYCSchema = new Schema({
  userId: { type: String, required: true, index: true },
  nidHash: { type: String, required: true },
  status: { type: String, enum: ['processing', 'verified', 'rejected'], default: 'processing' },
  livenessConfidence: { type: Number },
  rejectionReason: { type: String },
}, { timestamps: true });

export const KYC = mongoose.model<IKYC>('KYC', KYCSchema);
