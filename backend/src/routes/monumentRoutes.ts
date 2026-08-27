import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Monument from '../models/monument';
import { 
  getAllMonuments, 
  getFeaturedMonuments, 
  getMonumentById, 
  getMonumentARConfig, 
  recognizeMonument,
  recognizeMonumentMultiViewRoute,
  getRecognizeHealth,
  uploadMonumentImage,
  deleteMonumentImage,
  updateMonument,
  createHistorySection,
  updateHistorySection,
  deleteHistorySection,
  uploadHistorySectionImage,
  deleteHistorySectionImage,
  generateAIMonumentDetails,
  discoverAIMonumentImages,
  uploadGalleryImage,
  updateGalleryImageMetadata,
  deleteGalleryImage,
  syncWikimediaReferencesRoute
} from '../controllers/monumentController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads/monuments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximum file size
  }
});

// resolveMonumentSlug helper

const resolveMonumentSlug = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    let monument = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      monument = await Monument.findById(id);
    } else {
      monument = await Monument.findOne({ slug: id });
    }
    if (!monument) {
      return res.status(404).json({ success: false, message: 'Monument not found' });
    }
    req.monumentSlug = monument.slug;
    next();
  } catch (err) {
    next(err);
  }
};

const historyImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const historyDir = path.join(__dirname, '../../uploads/monuments/history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    cb(null, historyDir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const slug = req.monumentSlug || 'monument';
    const sectionId = req.params.sectionId || 'section';
    const timestamp = Math.floor(Date.now() / 1000);
    cb(null, `${slug}-${sectionId}-${timestamp}${ext}`);
  }
});

const uploadHistory = multer({
  storage: historyImageStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximum file size
  }
});

const galleryImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const galleryDir = path.join(__dirname, '../../uploads/monuments/gallery');
    if (!fs.existsSync(galleryDir)) {
      fs.mkdirSync(galleryDir, { recursive: true });
    }
    cb(null, galleryDir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const slug = req.monumentSlug || 'monument';
    const imageType = req.body.imageType || 'gallery';
    const timestamp = Math.floor(Date.now() / 1000);
    cb(null, `${slug}-${imageType}-${timestamp}${ext}`);
  }
});

const uploadGallery = multer({
  storage: galleryImageStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximum file size
  }
});

const recognitionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const recDir = path.join(__dirname, '../../uploads/monuments/recognition');
    if (!fs.existsSync(recDir)) {
      fs.mkdirSync(recDir, { recursive: true });
    }
    cb(null, recDir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const slug = req.monumentSlug || 'monument';
    const viewType = req.body.viewType || 'other';
    const timestamp = Math.floor(Date.now() / 1000);
    cb(null, `${slug}-recognition-${viewType}-${timestamp}${ext}`);
  }
});

const uploadRecognition = multer({
  storage: recognitionImageStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximum file size
  }
});

router.get('/', getAllMonuments);
router.get('/featured', getFeaturedMonuments);
router.get('/search', getAllMonuments); // Handle search before any /:id
router.post('/recognize', recognizeMonument);
router.post('/recognize-multiview', recognizeMonumentMultiViewRoute);
router.get('/recognize/health', getRecognizeHealth);
router.post('/:id/upload', requireAdmin, upload.single('image'), uploadMonumentImage);
router.delete('/:id/image', requireAdmin, deleteMonumentImage);
router.put('/:id', requireAdmin, updateMonument);

// History sections APIs
router.post('/:id/history-sections', requireAdmin, createHistorySection);
router.put('/:id/history-sections/:sectionId', requireAdmin, updateHistorySection);
router.delete('/:id/history-sections/:sectionId', requireAdmin, deleteHistorySection);
router.post('/:id/history-sections/:sectionId/images', requireAdmin, resolveMonumentSlug, uploadHistory.single('image'), uploadHistorySectionImage);
router.delete('/:id/history-sections/:sectionId/images/:imageId', requireAdmin, deleteHistorySectionImage);

// AI content generator & Monument Photo Gallery APIs
router.post('/:id/generate-details', requireAdmin, generateAIMonumentDetails);
router.post('/:id/discover-images', requireAdmin, discoverAIMonumentImages);
router.post('/:id/gallery-images', requireAdmin, resolveMonumentSlug, uploadGallery.single('image'), uploadGalleryImage);
router.put('/:id/gallery-images/:imageId', requireAdmin, resolveMonumentSlug, uploadGallery.single('image'), updateGalleryImageMetadata);
router.delete('/:id/gallery-images/:imageId', requireAdmin, deleteGalleryImage);

// Recognition Images routes removed as recognition is migrated to the trained model

router.get('/:id', getMonumentById);
router.get('/:id/ar', getMonumentARConfig);
router.post('/:id/sync-wikimedia', syncWikimediaReferencesRoute);

export default router;
