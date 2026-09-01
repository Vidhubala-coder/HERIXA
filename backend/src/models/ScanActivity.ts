import { Schema, model, Document, Types } from 'mongoose';

export interface IScanActivity extends Document {
  userId?: Types.ObjectId;
  monumentId?: Types.ObjectId;
  monumentName?: string;
  confidence: number;
  recognized: boolean;
  processingTime?: number;
  devicePlatform?: string;
  language?: string;
  createdAt: Date;
}

const ScanActivitySchema = new Schema<IScanActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  monumentId: { type: Schema.Types.ObjectId, ref: 'Monument', index: true },
  monumentName: { type: String, trim: true },
  confidence: { type: Number, default: 0 },
  recognized: { type: Boolean, default: false, index: true },
  processingTime: { type: Number },
  devicePlatform: { type: String },
  language: { type: String, default: 'en' },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

ScanActivitySchema.index({ createdAt: -1 });

export const ScanActivity = model<IScanActivity>('ScanActivity', ScanActivitySchema);
export default ScanActivity;
