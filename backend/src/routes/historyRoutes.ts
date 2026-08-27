import { Router } from 'express';
import { deleteHistoryItem, clearAllHistory } from '../controllers/historyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Delete a single history item (Ownership check enforced inside controller)
router.delete('/:historyId', requireAuth as any, deleteHistoryItem as any);

// Clear all history items (Ownership check enforced inside controller)
router.delete('/', requireAuth as any, clearAllHistory as any);

export default router;
