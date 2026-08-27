import { Schema, model, Document, Types } from 'mongoose';

export interface IHistory extends Document {
  userId: Types.ObjectId;
  monumentId?: Types.ObjectId;
  actionType: 'recognition' | 'search' | 'view' | 'ai_question';
  query?: string;
  createdAt: Date;
}

const HistorySchema = new Schema<IHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  monumentId: { type: Schema.Types.ObjectId, ref: 'Monument', index: true },
  actionType: { type: String, enum: ['recognition', 'search', 'view', 'ai_question'], required: true },
  query: { type: String, trim: true },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

HistorySchema.index({ userId: 1, createdAt: -1 });

export const History = model<IHistory>('History', HistorySchema);
export default History;
