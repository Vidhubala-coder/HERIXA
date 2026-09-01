import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  event: 'ACCOUNT_CREATED' | 'EMAIL_VERIFIED' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_RESET' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_SUCCESS' | 'ACCOUNT_DELETED' | 'SCAN_PERFORMED' | 'MONUMENT_VIEWED' | 'ADMIN_ACTION' | 'VISUALIZATION_IMAGE_ADDED' | 'VISUALIZATION_IMAGE_EDITED' | 'VISUALIZATION_IMAGE_DELETED' | 'VISUALIZATION_COVER_CHANGED' | 'VISUALIZATION_TOGGLED' | 'MODEL_3D_CHANGED' | 'HERITAGE_VISUAL_ADDED' | 'HERITAGE_VISUAL_DELETED';
  userId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  timestamp: Date;
  metadata?: Schema.Types.Mixed;
}

const AuditLogSchema = new Schema<IAuditLog>({
  event: {
    type: String,
    enum: [
      'ACCOUNT_CREATED', 'EMAIL_VERIFIED', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT',
      'PASSWORD_RESET', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_SUCCESS',
      'ACCOUNT_DELETED', 'SCAN_PERFORMED', 'MONUMENT_VIEWED', 'ADMIN_ACTION',
      'VISUALIZATION_IMAGE_ADDED', 'VISUALIZATION_IMAGE_EDITED', 'VISUALIZATION_IMAGE_DELETED',
      'VISUALIZATION_COVER_CHANGED', 'VISUALIZATION_TOGGLED', 'MODEL_3D_CHANGED',
      'HERITAGE_VISUAL_ADDED', 'HERITAGE_VISUAL_DELETED'
    ],
    required: true,
    index: true
  },
  userId: { type: Schema.Types.ObjectId, index: true },
  actorId: { type: Schema.Types.ObjectId, index: true },
  actorType: { type: String, enum: ['USER', 'ADMIN', 'SYSTEM'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: { type: Schema.Types.Mixed }
});

// Composite index to speed up filtering on events sorted by time
AuditLogSchema.index({ event: 1, timestamp: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
