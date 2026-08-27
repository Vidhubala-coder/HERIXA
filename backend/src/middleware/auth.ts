import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/user';
import { verifyToken } from '../utils/cryptoAuth';

/**
 * Middleware to restrict access to admin users.
 * 
 * TODO: For production deployment, replace this header-based x-user-id authorization
 * with a secure, standard JWT or session-based authentication system.
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let userId: string | null = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      userId = verifyToken(token);
    } else {
      userId = req.headers['x-user-id'] as string;
    }
    
    if (!userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Missing active User ID in headers or token.',
      });
      return;
    }

    // Verify user exists and role is admin in MongoDB
    const user = await User.findById(userId);
    if (!user) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: User not found in database.',
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Admin privilege required to perform this action.',
      });
      return;
    }

    // Attach user to request for downstream usage if needed
    (req as any).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authenticate requests using secure signature tokens in Authorization header.
 * Enforces user isolation by comparing verified token user ID with :userId request parameters.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[SAVED HERITAGE] Unauthorized: Missing or invalid Authorization header');
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing or invalid Authorization header.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const verifiedUserId = verifyToken(token);

    if (!verifiedUserId) {
      console.warn('[SAVED HERITAGE] Unauthorized: Token verification failed');
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token signature.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(verifiedUserId)) {
      console.warn('[SAVED HERITAGE] Unauthorized: Invalid token user ID format');
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token user ID format.',
      });
      return;
    }

    const user = await User.findById(verifiedUserId);
    if (!user) {
      console.warn('[SAVED HERITAGE] Unauthorized: User not found in database');
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User not found in database.',
      });
      return;
    }

    // Validate multi-user isolation: compare authenticated user ID with :userId route parameter
    const paramUserId = req.params.userId;
    if (paramUserId && paramUserId !== user._id.toString()) {
      console.warn(`[SAVED HERITAGE] Forbidden: User ${user._id} attempted to access user ${paramUserId} resources`);
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify or access another user\'s saved heritage.',
      });
      return;
    }

    // Attach authenticated user to request
    (req as any).user = user;
    next();
  } catch (error) {
    next(error);
  }
};
