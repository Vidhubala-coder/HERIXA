import { Schema, model, Document, Types } from 'mongoose';

export interface IPasswordReset extends Document {
  userId?: Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  usedAt?: Date;
  createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index on expiresAt (0 seconds offset)
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  resetTokenHash: { type: String },
  resetTokenExpiresAt: { type: Date },
  usedAt: { type: Date },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const PasswordReset = model<IPasswordReset>('PasswordReset', PasswordResetSchema);
export default PasswordReset;
