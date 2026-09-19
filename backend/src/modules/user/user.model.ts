import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  role: string;
  status: string;
  nidHash?: string;
  legalNameBangla?: string;
}

const UserSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  role: { type: String, default: 'registered' },
  status: { type: String, default: 'active' },
  nidHash: { type: String },
  legalNameBangla: { type: String },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
