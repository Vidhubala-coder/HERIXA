import { Router } from 'express';
import {
  getPublicProtocol,
  getAdminProtocol,
  updateAdminProtocol,
  generateProtocolFromSource,
  publishProtocol
} from '../controllers/protocolController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Public route: GET /api/monuments/:id/protocol
router.get('/monuments/:id/protocol', getPublicProtocol);

// Admin routes
router.get('/admin/monuments/:id/protocol', requireAdmin as any, getAdminProtocol);
router.put('/admin/monuments/:id/protocol', requireAdmin as any, updateAdminProtocol);
router.post('/admin/monuments/:id/protocol/generate', requireAdmin as any, generateProtocolFromSource);
router.post('/admin/monuments/:id/protocol/publish', requireAdmin as any, publishProtocol);

export default router;
