import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;
  favoriteMonuments: Types.ObjectId[];
  role: 'user' | 'admin';
  passwordHash?: string;
  isEmailVerified: boolean;
  otp?: string;
  otpExpires?: Date;
  otpAttempts: number;
  otpSentAt?: Date;
  profileImageUrl?: string;
  preferredLanguage?: string;
  lastLoginAt?: Date;
  scanCount: number;
  accountStatus: 'ACTIVE' | 'DELETED';
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  avatar: { type: String, trim: true },
  favoriteMonuments: [{ type: Schema.Types.ObjectId, ref: 'Monument' }],
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  passwordHash: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpSentAt: { type: Date },
  profileImageUrl: { type: String },
  preferredLanguage: { type: String, default: null },
  lastLoginAt: { type: Date, default: null, index: true },
  scanCount: { type: Number, default: 0, index: true },
  accountStatus: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE', index: true },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true
});

UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

export const User = model<IUser>('User', UserSchema);
export default User;
