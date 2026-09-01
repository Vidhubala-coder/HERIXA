import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  getUserById,
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  updateProfile,
  getUserHistory,
  addHistoryEntry,
  uploadProfilePhoto,
  deleteProfilePhoto,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  sendSettingsOtp,
  verifySettingsOtp,
  resetPasswordRedirect,
  deleteAccount,
} from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Multer Storage Configuration for Profile Pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/profiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user._id}-${uniqueSuffix}${ext}`);
  }
});

const profileFileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Authentication and OTP routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/otp/send', resendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.get('/reset-password-redirect', resetPasswordRedirect);
router.post('/change-password', requireAuth as any, changePassword);
router.post('/password-settings/send-otp', requireAuth as any, sendSettingsOtp);
router.post('/password-settings/verify-otp', requireAuth as any, verifySettingsOtp);
router.delete('/account', requireAuth as any, deleteAccount as any);

// Profile photo routes (using requireAuth and JWT extraction)
router.post('/profile/photo', requireAuth as any, uploadProfile.single('photo'), uploadProfilePhoto as any);
router.delete('/profile/photo', requireAuth as any, deleteProfilePhoto as any);

// User-scoped routes (with token verification and isolation)
router.get('/:userId', requireAuth, getUserById);
router.patch('/:userId', requireAuth, updateProfile);

// Favorites routes
router.get('/:userId/favorites', requireAuth, getUserFavorites);
router.post('/:userId/favorites/:monumentId', requireAuth, addFavorite);
router.delete('/:userId/favorites/:monumentId', requireAuth, removeFavorite);

// History routes
router.get('/:userId/history', requireAuth, getUserHistory);
router.post('/:userId/history', requireAuth, addHistoryEntry);

export default router;
