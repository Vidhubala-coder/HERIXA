import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';

export const logEvent = async (
  event:
    | 'ACCOUNT_CREATED'
    | 'EMAIL_VERIFIED'
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PASSWORD_RESET'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_SUCCESS'
    | 'ACCOUNT_DELETED'
    | 'SCAN_PERFORMED'
    | 'MONUMENT_VIEWED'
    | 'ADMIN_ACTION'
    | 'VISUALIZATION_IMAGE_ADDED'
    | 'VISUALIZATION_IMAGE_EDITED'
    | 'VISUALIZATION_IMAGE_DELETED'
    | 'VISUALIZATION_COVER_CHANGED'
    | 'VISUALIZATION_TOGGLED'
    | 'MODEL_3D_CHANGED'
    | 'HERITAGE_VISUAL_ADDED'
    | 'HERITAGE_VISUAL_DELETED',
  userId?: string | Types.ObjectId,
  actorId?: string | Types.ObjectId,
  actorType: 'USER' | 'ADMIN' | 'SYSTEM' = 'USER',
  metadata?: any
): Promise<void> => {

  try {
    const log = new AuditLog({
      event,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      actorId: actorId ? new Types.ObjectId(actorId) : undefined,
      actorType,
      metadata
    });
    await log.save();
    console.log(`[AUDIT] Event successfully logged: ${event} for user ID: ${userId || 'unknown'}`);
  } catch (error) {
    console.error('[AUDIT] Failed to save audit log event:', error);
  }
};
