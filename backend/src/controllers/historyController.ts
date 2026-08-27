import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import History from '../models/history';
import { IUser } from '../models/user';

// Type-safe authenticated request definition
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Delete a specific history log item by its historyId.
 * Validates historyId pattern and checks authenticated ownership before execution.
 */
export const deleteHistoryItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { historyId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing authenticated session context.',
      });
      return;
    }

    // Validate historyId is a valid Mongoose ObjectId to prevent CastErrors
    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid history ID format.',
      });
      return;
    }

    // Query and delete verifying ownership in one atomic step
    const deleted = await History.findOneAndDelete({
      _id: historyId,
      userId: userId,
    });

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'History item not found or you are not authorized to delete it.',
      });
      return;
    }

    console.log(`[HERIXA-HISTORY] Deleted history entry: ${historyId} for User: ${userId}`);
    res.status(200).json({
      success: true,
      message: 'History item deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all history entries belonging to the authenticated user.
 */
export const clearAllHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing authenticated session context.',
      });
      return;
    }

    const deleteResult = await History.deleteMany({
      userId: userId,
    });

    console.log(`[HERIXA-HISTORY] Cleared all (${deleteResult.deletedCount}) history records for User: ${userId}`);
    res.status(200).json({
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: 'All history cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
};
