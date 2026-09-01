import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Monument from '../models/monument';
import { logEvent } from '../utils/auditLogger';
import {
  getStats,
  getUsers,
  getUserDetails,
  deleteUserAdmin,
  deleteMonumentAdmin,
  getActivityLogs,
  getSystemHealth,
  getTourismInsights,
  getAiAnalytics,
  getAdminProfile,
  getNotifications,
  updateAdminProfile,
  uploadAdminAvatar,
  exportAuditLogs,
} from '../controllers/adminController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Apply requireAdmin to all routes in this router
router.use(requireAdmin as any);

// Multer storage for admin avatar photos
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const avatarDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    cb(null, avatarDir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/octet-stream', 'image/heic', 'image/heif'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext) || !file.mimetype || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and WEBP images are supported for profile photo.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Multer storage configuration for visualization assets
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads/monuments/visualization');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `vis-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and WEBP image formats are supported.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Multer storage for multi-visual heritage gallery uploads
const visualsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/monuments/visuals');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `visual-${uniqueSuffix}${ext}`);
  }
});

const uploadVisuals = multer({
  storage: visualsStorage,
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/octet-stream'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext) || !file.mimetype || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and WEBP images are supported.'), false);
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit per image
});

// Original stats/users admin routes
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.delete('/users/:id', deleteUserAdmin);
router.delete('/monuments/:id', deleteMonumentAdmin);
router.get('/tourism', getTourismInsights);
router.get('/analytics/ai', getAiAnalytics);
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.post('/profile/avatar', uploadAvatar.fields([{ name: 'avatar', maxCount: 1 }, { name: 'image', maxCount: 1 }]), uploadAdminAvatar);
router.get('/activity', getActivityLogs);
router.get('/audit-logs/export', exportAuditLogs);
router.get('/health', getSystemHealth);
router.get('/notifications', getNotifications);

// ── Multi-Image Heritage Visuals Management API ────────────────────────────────

// POST /api/admin/monuments/:monumentId/visuals — Multi-Image Upload (Admin Protected)
router.post('/monuments/:monumentId/visuals', uploadVisuals.any(), async (req: any, res: any, next: any) => {
  try {
    const { monumentId } = req.params;
    let monument = null;
    if (mongoose.Types.ObjectId.isValid(monumentId)) {
      monument = await Monument.findById(monumentId);
    }
    if (!monument) {
      monument = await Monument.findOne({ slug: monumentId });
    }

    if (!monument) {
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((f: any) => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      }
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ success: false, message: 'No image files uploaded.' });
      return;
    }

    if (!monument.heritagePreviewImages) {
      monument.heritagePreviewImages = [];
    }

    const newVisuals: any[] = [];
    for (const f of files) {
      const uri = `/uploads/monuments/visuals/${f.filename}`;
      const newVisual = {
        _id: new mongoose.Types.ObjectId().toString(),
        uri,
        imageUrl: uri,
        viewType: req.body.category || req.body.viewType || 'Gallery',
        title: req.body.title || f.originalname || 'Heritage Visual',
        description: req.body.caption || req.body.description || '',
        caption: req.body.caption || req.body.description || '',
        category: 'Gallery',
        enabled: true,
        visible: true,
        createdAt: new Date(),
        uploadedBy: req.user?._id?.toString() || 'Admin'
      };
      monument.heritagePreviewImages.push(newVisual as any);
      newVisuals.push(newVisual);
    }

    if (!monument.coverImageUrl && newVisuals.length > 0) {
      monument.coverImageUrl = newVisuals[0].uri;
      monument.imageUrl = newVisuals[0].uri;
    }

    await monument.save();

    await logEvent(
      'HERITAGE_VISUAL_ADDED',
      undefined,
      req.user?._id,
      'ADMIN',
      { monumentId: monument._id, monumentName: monument.name, count: newVisuals.length }
    );

    res.status(200).json({
      success: true,
      message: `${newVisuals.length} visual(s) uploaded successfully`,
      data: newVisuals,
      monument
    });
  } catch (err) {
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((f: any) => { if (fs.existsSync(f.path)) try { fs.unlinkSync(f.path); } catch (_) {} });
    }
    next(err);
  }
});

// DELETE /api/admin/monuments/:monumentId/visuals/:visualId — Delete Visual (Admin Protected)
router.delete('/monuments/:monumentId/visuals/:visualId', async (req: any, res: any, next: any) => {
  try {
    const { monumentId, visualId } = req.params;
    let monument = null;
    if (mongoose.Types.ObjectId.isValid(monumentId)) {
      monument = await Monument.findById(monumentId);
    }
    if (!monument) {
      monument = await Monument.findOne({ slug: monumentId });
    }

    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    const visual = monument.heritagePreviewImages?.find(
      (item: any) => item._id?.toString() === visualId || item.id === visualId
    );

    if (!visual) {
      res.status(404).json({ success: false, message: 'Heritage visual not found' });
      return;
    }

    const imgUri = visual.uri || (visual as any).imageUrl;
    if (imgUri && imgUri.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../..', imgUri);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }

    monument.heritagePreviewImages = monument.heritagePreviewImages?.filter(
      (item: any) => item._id?.toString() !== visualId && item.id !== visualId
    );

    if (monument.coverImageUrl === imgUri) {
      const remaining = monument.heritagePreviewImages?.[0];
      monument.coverImageUrl = remaining ? remaining.uri : undefined;
    }

    await monument.save();

    await logEvent(
      'HERITAGE_VISUAL_DELETED',
      undefined,
      req.user?._id,
      'ADMIN',
      { monumentId: monument._id, monumentName: monument.name, visualId }
    );

    res.status(200).json({ success: true, message: 'Heritage visual deleted successfully', data: monument });
  } catch (err) {
    next(err);
  }
});

// ── Heritage Visualization Endpoints ──────────────────────────────────────────

// 1. Add Heritage View
router.post('/monuments/:id/visualization', upload.single('image'), async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No image file uploaded.' });
      return;
    }

    const monument = await Monument.findById(id);
    if (!monument) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    const uri = `/uploads/monuments/visualization/${file.filename}`;
    const newImage = {
      _id: new mongoose.Types.ObjectId().toString(),
      uri,
      viewType: req.body.viewType || req.body.category || 'Other',
      title: req.body.title || 'Untitled View',
      description: req.body.description || req.body.caption || '',
      caption: req.body.caption || req.body.description || '',
      category: req.body.category || req.body.viewType || 'Other',
      order: Number(req.body.order) || Number(req.body.displayOrder) || 0,
      displayOrder: Number(req.body.displayOrder) || Number(req.body.order) || 0,
      enabled: req.body.enabled !== 'false',
      featured: req.body.featured === 'true',
      visible: req.body.visible !== 'false'
    };

    if (!monument.heritagePreviewImages) {
      monument.heritagePreviewImages = [];
    }
    monument.heritagePreviewImages.push(newImage as any);

    // If setAsCover is true, or if no cover image exists, make it the cover
    if (req.body.setAsCover === 'true' || !monument.coverImageUrl) {
      monument.coverImageUrl = uri;
      monument.imageUrl = uri;
      monument.image = uri;
      await logEvent(
        'VISUALIZATION_COVER_CHANGED',
        undefined,
        req.user?._id,
        'ADMIN',
        { monumentId: monument._id, monumentName: monument.name, coverImageUrl: uri }
      );
    }

    await monument.save();

    await logEvent(
      'VISUALIZATION_IMAGE_ADDED',
      undefined,
      req.user?._id,
      'ADMIN',
      { monumentId: monument._id, monumentName: monument.name, imageTitle: newImage.title, viewType: newImage.viewType }
    );

    res.status(200).json({ success: true, message: 'Heritage view added successfully', data: monument });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(err);
  }
});

// 2. Edit Heritage View
router.put('/monuments/:id/visualization/:imageId', upload.single('image'), async (req: any, res, next) => {
  try {
    const { id, imageId } = req.params;
    const monument = await Monument.findById(id);
    if (!monument) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    const img = monument.heritagePreviewImages?.find(
      (item: any) => item._id?.toString() === imageId || item.id === imageId
    );

    if (!img) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404).json({ success: false, message: 'Heritage view image not found' });
      return;
    }

    if (req.file) {
      // Delete old file if it exists locally
      if (img.uri && img.uri.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '../..', img.uri);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      }
      img.uri = `/uploads/monuments/visualization/${req.file.filename}`;
    }

    if (req.body.viewType !== undefined) img.viewType = req.body.viewType;
    if (req.body.title !== undefined) img.title = req.body.title;
    if (req.body.description !== undefined) img.description = req.body.description;
    if (req.body.caption !== undefined) img.caption = req.body.caption;
    if (req.body.category !== undefined) img.category = req.body.category;
    if (req.body.order !== undefined) img.order = Number(req.body.order);
    if (req.body.displayOrder !== undefined) img.displayOrder = Number(req.body.displayOrder);
    if (req.body.enabled !== undefined) img.enabled = req.body.enabled === 'true';
    if (req.body.featured !== undefined) img.featured = req.body.featured === 'true';
    if (req.body.visible !== undefined) img.visible = req.body.visible === 'true';

    // Cover setting
    if (req.body.setAsCover === 'true') {
      monument.coverImageUrl = img.uri;
      monument.imageUrl = img.uri;
      monument.image = img.uri;
      await logEvent(
        'VISUALIZATION_COVER_CHANGED',
        undefined,
        req.user?._id,
        'ADMIN',
        { monumentId: monument._id, monumentName: monument.name, coverImageUrl: img.uri }
      );
    }

    await monument.save();

    await logEvent(
      'VISUALIZATION_IMAGE_EDITED',
      undefined,
      req.user?._id,
      'ADMIN',
      { monumentId: monument._id, monumentName: monument.name, imageTitle: img.title }
    );

    res.status(200).json({ success: true, message: 'Heritage view updated successfully', data: monument });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(err);
  }
});

// 3. Delete Heritage View
router.delete('/monuments/:id/visualization/:imageId', async (req: any, res, next) => {
  try {
    const { id, imageId } = req.params;
    const monument = await Monument.findById(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    const img = monument.heritagePreviewImages?.find(
      (item: any) => item._id?.toString() === imageId || item.id === imageId
    );

    if (!img) {
      res.status(404).json({ success: false, message: 'Heritage view not found' });
      return;
    }

    // Delete image file from server
    if (img.uri && img.uri.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../..', img.uri);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    // Filter it out
    monument.heritagePreviewImages = monument.heritagePreviewImages?.filter(
      (item: any) => item._id?.toString() !== imageId && item.id !== imageId
    );

    // If deleted image was the cover, clear it or fall back
    if (monument.coverImageUrl === img.uri) {
      const remaining = monument.heritagePreviewImages?.[0];
      monument.coverImageUrl = remaining ? remaining.uri : undefined;
      if (remaining) {
        monument.imageUrl = remaining.uri;
        monument.image = remaining.uri;
      }
    }

    await monument.save();

    await logEvent(
      'VISUALIZATION_IMAGE_DELETED',
      undefined,
      req.user?._id,
      'ADMIN',
      { monumentId: monument._id, monumentName: monument.name, imageTitle: img.title }
    );

    res.status(200).json({ success: true, message: 'Heritage view deleted successfully', data: monument });
  } catch (err) {
    next(err);
  }
});

// 4. Update Visualization Status and Config
router.put('/monuments/:id/visualization-config', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const monument = await Monument.findById(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    const prevEnabled = monument.interactivePreviewEnabled;
    const prevModelUrl = monument.modelUrl;

    if (req.body.interactivePreviewEnabled !== undefined) {
      monument.interactivePreviewEnabled = req.body.interactivePreviewEnabled === true;
      if (prevEnabled !== monument.interactivePreviewEnabled) {
        await logEvent(
          'VISUALIZATION_TOGGLED',
          undefined,
          req.user?._id,
          'ADMIN',
          { monumentId: monument._id, monumentName: monument.name, enabled: monument.interactivePreviewEnabled }
        );
      }
    }

    if (req.body.coverImageUrl !== undefined) {
      monument.coverImageUrl = req.body.coverImageUrl;
      monument.imageUrl = req.body.coverImageUrl;
      monument.image = req.body.coverImageUrl;
    }

    if (req.body.modelUrl !== undefined) {
      monument.modelUrl = req.body.modelUrl;
      if (prevModelUrl !== monument.modelUrl) {
        await logEvent(
          'MODEL_3D_CHANGED',
          undefined,
          req.user?._id,
          'ADMIN',
          { monumentId: monument._id, monumentName: monument.name, has3DModel: !!monument.modelUrl }
        );
      }
    }

    if (req.body.arEnabled !== undefined) {
      monument.arEnabled = req.body.arEnabled === true;
    }

    await monument.save();
    res.status(200).json({ success: true, message: 'Config updated successfully', data: monument });
  } catch (err) {
    next(err);
  }
});

// 5. Reorder Heritage Views
router.put('/monuments/:id/visualization/reorder', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { orderedIds } = req.body; // Array of IDs in preferred order

    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ success: false, message: 'orderedIds must be an array of image IDs' });
      return;
    }

    const monument = await Monument.findById(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    if (monument.heritagePreviewImages) {
      // Reorder based on index in orderedIds
      monument.heritagePreviewImages.forEach((img: any) => {
        const matchingIndex = orderedIds.indexOf(img._id?.toString() || img.id);
        if (matchingIndex !== -1) {
          img.order = matchingIndex;
        }
      });
      // Sort in-place by order
      monument.heritagePreviewImages.sort((a: any, b: any) => a.order - b.order);
    }

    await monument.save();

    await logEvent(
      'VISUALIZATION_IMAGE_EDITED',
      undefined,
      req.user?._id,
      'ADMIN',
      { monumentId: monument._id, monumentName: monument.name, action: 'reorder' }
    );

    res.status(200).json({ success: true, message: 'Heritage views reordered successfully', data: monument });
  } catch (err) {
    next(err);
  }
});

export default router;
