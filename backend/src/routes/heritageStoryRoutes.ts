import { Router } from 'express';
import {
  getPublicStory,
  getAdminStory,
  updateAdminStory,
  generateStoryFromSource,
  generateScript,
  generateMedia,
  publishStory,
  unpublishStory,
  uploadVideo,
  handleVideoMulterUpload
} from '../controllers/heritageStoryController';
import { requireAdmin } from '../middleware/auth';

const publicRouter = Router();
const adminRouter = Router();

// Public routes (Zero Gemini, Read-only published stories)
publicRouter.get('/monuments/:monumentId/heritage-story', getPublicStory);

// Admin routes (Protected by Admin authentication & authorization)
adminRouter.get('/monuments/:monumentId/heritage-story', requireAdmin as any, getAdminStory);
adminRouter.put('/monuments/:monumentId/heritage-story', requireAdmin as any, updateAdminStory);
adminRouter.post('/monuments/:monumentId/heritage-story/generate', requireAdmin as any, generateStoryFromSource);
adminRouter.post('/monuments/:monumentId/heritage-story/script', requireAdmin as any, generateScript);
adminRouter.post('/monuments/:monumentId/heritage-story/media', requireAdmin as any, generateMedia);
adminRouter.post('/monuments/:monumentId/heritage-story/upload-video', requireAdmin as any, handleVideoMulterUpload, uploadVideo);
adminRouter.post('/monuments/:monumentId/heritage-story/publish', requireAdmin as any, publishStory);
adminRouter.post('/monuments/:monumentId/heritage-story/unpublish', requireAdmin as any, unpublishStory);



export { publicRouter as storyPublicRouter, adminRouter as storyAdminRouter };
