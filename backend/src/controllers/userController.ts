import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Jimp from 'jimp';
import User from '../models/user';
import Monument from '../models/monument';
import History from '../models/history';
import PasswordReset from '../models/passwordReset';
import { generateToken } from '../utils/cryptoAuth';
import { sendOtpEmail, sendPasswordChangedEmail, sendAdminRegistrationNotification } from '../services/emailService';
import { hashPassword, verifyPassword } from '../utils/authUtils';
import crypto from 'crypto';
import { logEvent } from '../utils/auditLogger';

const sanitizeUser = (user: any) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.otpExpires;
  delete obj.otpAttempts;
  delete obj.otpSentAt;
  return obj;
};

export const getUserFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Bad Request: Invalid format for User ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
      return;
    }

    const user = await User.findById(userId).populate('favoriteMonuments');
    if (!user) {
      res.status(404).json({
        success: false,
        message: `User not found with ID: '${userId}'`,
      });
      return;
    }

    // Safely filter out any null/undefined records (e.g. if monument was deleted from DB)
    const validMonuments = (user.favoriteMonuments || []).filter(m => m !== null && m !== undefined);

    res.status(200).json({
      success: true,
      data: validMonuments,
      message: 'Favorites retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, monumentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Bad Request: Invalid format for User ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(monumentId)) {
      res.status(400).json({
        success: false,
        message: 'Bad Request: Invalid format for Monument ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
      return;
    }

    const monument = await Monument.findById(monumentId);
    if (!monument) {
      res.status(404).json({
        success: false,
        message: `Monument not found with ID: '${monumentId}'`,
      });
      return;
    }

    const mId = new mongoose.Types.ObjectId(monumentId);

    // Atomically append to user's favorite list avoiding duplicates
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteMonuments: mId } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: `User not found with ID: '${userId}'`,
      });
      return;
    }

    console.log(`[SAVED HERITAGE] Save request completed successfully for monument: ${monumentId}`);

    res.status(200).json({
      success: true,
      data: user.favoriteMonuments || [],
      saved: true,
      monumentId: monumentId,
      message: 'Monument added to favorites successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, monumentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: 'Bad Request: Invalid format for User ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(monumentId)) {
      res.status(400).json({
        success: false,
        message: 'Bad Request: Invalid format for Monument ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
      return;
    }

    const mId = new mongoose.Types.ObjectId(monumentId);

    // Atomically pull/remove monument ID from favorites list
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favoriteMonuments: mId } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: `User not found with ID: '${userId}'`,
      });
      return;
    }

    console.log(`[SAVED HERITAGE] Unsave request completed successfully for monument: ${monumentId}`);

    res.status(200).json({
      success: true,
      data: user.favoriteMonuments || [],
      saved: false,
      monumentId: monumentId,
      message: 'Monument removed from favorites successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: 'Invalid format for User ID' });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[HERIXA-AUTH] REGISTER_STARTED');
  try {
    const { name, email, password, preferredLanguage } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password parameters are required.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (preferredLanguage !== undefined && preferredLanguage !== null && preferredLanguage !== '') {
      const allowedLanguages = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];
      if (!allowedLanguages.includes(preferredLanguage)) {
        res.status(400).json({ success: false, message: 'Invalid preferred language selection.' });
        return;
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      return;
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.isEmailVerified) {
      res.status(409).json({ success: false, message: 'Email already registered. Please login.' });
      return;
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const adminEmail = (process.env.ADMIN_EMAIL || 'vidhub657@gmail.com').toLowerCase().trim();
    const role = normalizedEmail === adminEmail ? 'admin' : 'user';
    const passwordHash = hashPassword(password);

    const isNewUser = !user;
    if (!user) {
      user = new User({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        isEmailVerified: false,
        favoriteMonuments: [],
        otp: hashedOtp,
        otpExpires,
        otpAttempts: 0,
        otpSentAt: new Date(),
        preferredLanguage: preferredLanguage || null,
      });
    } else {
      user.name = name.trim();
      user.passwordHash = passwordHash;
      user.role = role;
      user.otp = hashedOtp;
      user.otpExpires = otpExpires;
      user.otpAttempts = 0;
      user.otpSentAt = new Date();
      user.preferredLanguage = preferredLanguage || null;
    }

    await user.save();

    if (isNewUser) {
      await logEvent('ACCOUNT_CREATED', user._id, user._id, 'USER');
      // Send informational registration notification email to admin (non-blocking)
      sendAdminRegistrationNotification(user.email, user.name, user.createdAt).catch((err) => {
        console.error('[HERIXA-ADMIN-NOTIF] Non-blocking warning: Failed to send admin notification:', err.message || err);
      });
    }

    const emailSent = await sendOtpEmail(normalizedEmail, user.name, otp);
    if (!emailSent) {
      res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again.' });
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[HERIXA-AUTH] DEV ONLY - Registration OTP for ${normalizedEmail} is ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'Registration started. Verification OTP sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password parameters are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({ success: false, message: 'Please verify your email first before logging in.' });
      return;
    }

    if (!user.passwordHash) {
      // Auto-migrate legacy account by setting password entered
      user.passwordHash = hashPassword(password);
      await user.save();
      console.log(`[MIGRATION] Auto-seeded password hash for legacy user: ${normalizedEmail}`);
    } else {
      // Verify password
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    await logEvent('LOGIN', user._id, user._id, 'USER');

    console.log('[HERIXA-AUTH] LOGIN_SUCCESS');

    const token = generateToken(user._id.toString());
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: sanitizeUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP parameters are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (!user.otp || !user.otpExpires) {
      res.status(400).json({ success: false, message: 'No active OTP request found.' });
      return;
    }

    if (user.otpAttempts >= 5) {
      res.status(429).json({ success: false, message: 'Too many verification attempts. Please request a new OTP.' });
      return;
    }

    if (new Date() > user.otpExpires) {
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
      return;
    }

    const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (hashedInput !== user.otp) {
      user.otpAttempts += 1;
      await user.save();
      res.status(400).json({ success: false, message: 'Invalid verification code.' });
      return;
    }

    // Success - activate and log in
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    await logEvent('EMAIL_VERIFIED', user._id, user._id, 'USER');

    console.log('[HERIXA-AUTH] OTP_VERIFIED');
    console.log('[HERIXA-AUTH] LOGIN_SUCCESS');

    const token = generateToken(user._id.toString());
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: sanitizeUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email parameter is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // Rate limit resend to 1 minute
    if (user.otpSentAt && Date.now() - new Date(user.otpSentAt).getTime() < 60000) {
      res.status(429).json({ success: false, message: 'Please wait at least 1 minute before resending.' });
      return;
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.otp = hashedOtp;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.otpSentAt = new Date();
    await user.save();

    const emailSent = await sendOtpEmail(normalizedEmail, user.name, otp);
    if (!emailSent) {
      res.status(500).json({ success: false, message: 'Failed to resend verification code. Please try again.' });
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[HERIXA-AUTH] DEV ONLY - Resent OTP for ${normalizedEmail} is ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'New verification OTP sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    if (userId !== (req as any).user._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot modify another user\'s profile.' });
      return;
    }

    const { name, avatar, preferredLanguage } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (name !== undefined) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();

    if (preferredLanguage !== undefined) {
      if (preferredLanguage === null || preferredLanguage === '' || preferredLanguage === 'none') {
        user.preferredLanguage = undefined;
      } else {
        const allowedLanguages = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];
        if (!allowedLanguages.includes(preferredLanguage)) {
          res.status(400).json({ success: false, message: 'Invalid preferred language selection.' });
          return;
        }
        user.preferredLanguage = preferredLanguage;
      }
    }

    await user.save();
    console.log('[HERIXA-DATA] PROFILE_FETCHED');

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getUserHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    if (userId !== (req as any).user._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot access another user\'s history.' });
      return;
    }

    const list = await History.find({ userId }).sort({ createdAt: -1 }).populate('monumentId');
    console.log('[HERIXA-DATA] HISTORY_FETCHED');

    res.status(200).json({
      success: true,
      data: list,
      message: 'History retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const addHistoryEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    if (userId !== (req as any).user._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot write to another user\'s history.' });
      return;
    }

    const { actionType, monumentId, query } = req.body;
    if (!actionType) {
      res.status(400).json({ success: false, message: 'actionType parameter is required.' });
      return;
    }

    let resolvedMonumentId = undefined;

    if (monumentId) {
      if (!mongoose.Types.ObjectId.isValid(monumentId)) {
        res.status(400).json({
          success: false,
          code: 'INVALID_MONUMENT_ID',
          message: 'A valid monument ObjectId is required.',
        });
        return;
      }

      const monumentExists = await Monument.exists({ _id: monumentId });
      if (!monumentExists) {
        res.status(400).json({
          success: false,
          code: 'MONUMENT_NOT_FOUND',
          message: 'The referenced monument was not found.',
        });
        return;
      }
      resolvedMonumentId = monumentId;
    }

    const entry = new History({
      userId,
      actionType,
      monumentId: resolvedMonumentId,
      query: query || undefined,
    });

    await entry.save();

    res.status(201).json({
      success: true,
      data: entry,
      message: 'History entry added successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    const newFilePath = req.file.path;
    const fileMime = req.file.mimetype?.toLowerCase();
    try {
      if (fileMime !== 'image/webp') {
        // Validate file format integrity using Jimp
        const image = await Jimp.read(newFilePath);
        const mime = image.getMIME().toLowerCase();
        const allowed = ['image/jpeg', 'image/png'];
        if (!allowed.includes(mime)) {
          throw new Error('Unsupported image format.');
        }
      }
    } catch (jimpError) {
      console.warn('[HERIXA-SECURITY] Invalid or corrupted image uploaded:', req.file.filename);
      // Delete the invalid file immediately
      fs.unlink(newFilePath, (err) => {
        if (err) {
          console.error('[HERIXA-STORAGE] Failed to delete invalid uploaded file:', err.message);
        }
      });
      res.status(400).json({
        success: false,
        message: 'Invalid or corrupted image file. Only JPEG, PNG, and WebP are supported.',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const oldImageRelativePath = user.profileImageUrl;
    const relativeUrl = `/uploads/profiles/${req.file.filename}`;

    user.profileImageUrl = relativeUrl;
    await user.save();

    // Storage cleanup: delete old image file AFTER database update succeeds
    if (oldImageRelativePath) {
      const oldFilePath = path.join(__dirname, '../../', oldImageRelativePath);
      fs.unlink(oldFilePath, (err) => {
        if (err) {
          console.warn('[HERIXA-STORAGE] Failed to delete old profile photo:', err.message);
        } else {
          console.log('[HERIXA-STORAGE] Deleted old profile photo:', oldFilePath);
        }
      });
    }

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
      message: 'Profile photo uploaded successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProfilePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const oldImageRelativePath = user.profileImageUrl;

    user.profileImageUrl = undefined;
    await user.save();

    // Storage cleanup: delete old file AFTER database update succeeds
    if (oldImageRelativePath) {
      const oldFilePath = path.join(__dirname, '../../', oldImageRelativePath);
      fs.unlink(oldFilePath, (err) => {
        if (err) {
          console.warn('[HERIXA-STORAGE] Failed to delete old profile photo during removal:', err.message);
        } else {
          console.log('[HERIXA-STORAGE] Deleted old profile photo successfully.');
        }
      });
    }

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
      message: 'Profile photo removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email parameter is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      return;
    }

    // Protection against account enumeration: Always return success response format
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.'
    };

    // Rate limiting: One OTP request per minute (checked for ALL emails to prevent user enumeration)
    const existingReset = await PasswordReset.findOne({ email: normalizedEmail });

    if (existingReset && existingReset.createdAt && (Date.now() - new Date(existingReset.createdAt).getTime() < 60000)) {
      res.status(429).json({ success: false, message: 'Please wait before requesting another OTP.' });
      return;
    }

    // Invalidate previous OTP requests for the same email
    if (existingReset) {
      await PasswordReset.deleteOne({ email: normalizedEmail });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // For unregistered email, save a dummy PasswordReset record to enforce future rate limiting
      const dummyReset = new PasswordReset({
        email: normalizedEmail,
        otpHash: 'dummy',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        attempts: 0,
        verified: false
      });
      await dummyReset.save();

      // Simulate response time / operations to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      res.status(200).json(genericResponse);
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetRequest = new PasswordReset({
      userId: user._id,
      email: normalizedEmail,
      otpHash: hashedOtp,
      expiresAt: otpExpires,
      attempts: 0,
      verified: false,
      resetTokenHash,
      resetTokenExpiresAt: otpExpires
    });

    await resetRequest.save();

    const emailSent = await sendOtpEmail(normalizedEmail, user.name, otp, resetToken);
    if (!emailSent) {
      res.status(500).json({ success: false, message: 'Failed to send recovery email. Please try again.' });
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[HERIXA-AUTH] DEV ONLY - Password Recovery OTP for ${normalizedEmail} is ${otp}`);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP parameters are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const recovery = await PasswordReset.findOne({ email: normalizedEmail });

    if (!recovery) {
      res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
      return;
    }

    if (recovery.attempts >= 5) {
      res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP later.' });
      return;
    }

    if (new Date() > recovery.expiresAt) {
      res.status(400).json({ success: false, message: 'This OTP has expired. Please request a new OTP.' });
      return;
    }

    if (recovery.verified || recovery.usedAt) {
      res.status(400).json({ success: false, message: 'This OTP has already been verified or used.' });
      return;
    }

    const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (hashedInput !== recovery.otpHash) {
      recovery.attempts += 1;
      await recovery.save();
      res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
      return;
    }

    // Success - generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    recovery.verified = true;
    recovery.resetTokenHash = resetTokenHash;
    recovery.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await recovery.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    
    console.log('[HERIXA-RESET] Reset request received');
    console.log(`[HERIXA-RESET] Token received: ${resetToken ? 'YES' : 'NO'}`);

    if (!resetToken || !newPassword || !confirmPassword) {
      console.log('[HERIXA-RESET] Token validation failed: Missing parameters');
      res.status(400).json({ success: false, message: 'All parameters are required.', errorCode: 'RESET_TOKEN_MISSING' });
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('[HERIXA-RESET] Token validation failed: Password mismatch');
      res.status(400).json({ success: false, message: 'Passwords do not match.', errorCode: 'RESET_TOKEN_INVALID' });
      return;
    }

    if (newPassword.length < 8) {
      console.log('[HERIXA-RESET] Token validation failed: Weak password');
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.', errorCode: 'RESET_TOKEN_INVALID' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const recovery = await PasswordReset.findOne({ resetTokenHash: tokenHash });

    console.log(`[HERIXA-RESET] Token validation: ${recovery ? 'SUCCESS' : 'FAILED'}`);

    if (!recovery) {
      console.log('[HERIXA-RESET] Token validation failed: No matching active recovery session found');
      res.status(400).json({ success: false, message: 'Invalid or expired reset token.', errorCode: 'RESET_TOKEN_INVALID' });
      return;
    }

    if (recovery.usedAt) {
      console.log('[HERIXA-RESET] Token validation failed: Token already used');
      res.status(400).json({ success: false, message: 'This reset token has already been used.', errorCode: 'RESET_TOKEN_INVALID' });
      return;
    }

    if (recovery.resetTokenExpiresAt && new Date() > recovery.resetTokenExpiresAt) {
      console.log('[HERIXA-RESET] Token validation failed: Token expired');
      res.status(400).json({ success: false, message: 'Reset token has expired.', errorCode: 'RESET_TOKEN_EXPIRED' });
      return;
    }

    const user = await User.findById(recovery.userId);
    console.log(`[HERIXA-RESET] User lookup: ${user ? 'FOUND' : 'NOT_FOUND'}`);

    if (!user) {
      console.log('[HERIXA-RESET] User lookup failed: Associated user not found');
      res.status(404).json({ success: false, message: 'User associated with this token not found.', errorCode: 'RESET_USER_NOT_FOUND' });
      return;
    }

    // Verify new password is different from the current password
    if (user.passwordHash) {
      const isSame = verifyPassword(newPassword, user.passwordHash);
      if (isSame) {
        console.log('[HERIXA-RESET] Token validation failed: New password matches current password');
        res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.', errorCode: 'RESET_TOKEN_INVALID' });
        return;
      }
    }

    // Hash and update password
    try {
      user.passwordHash = hashPassword(newPassword);
      await user.save();
      console.log('[HERIXA-RESET] Password update: SUCCESS');
    } catch (dbErr) {
      console.error('[HERIXA-RESET] Password update: FAILED', dbErr);
      res.status(500).json({ success: false, message: 'Failed to update password in database.', errorCode: 'PASSWORD_UPDATE_FAILED' });
      return;
    }

    // Invalidate recovery state immediately
    recovery.usedAt = new Date();
    recovery.otpHash = 'used'; // clear sensitive data
    recovery.resetTokenHash = undefined;
    await recovery.save();
    console.log('[HERIXA-RESET] Reset token invalidated');

    await logEvent('PASSWORD_RESET', user._id, user._id, 'USER');

    // Invalidate all other active recovery records for this user (delete/invalidate active reset OTPs)
    try {
      const deleteResult = await PasswordReset.deleteMany({ userId: user._id, _id: { $ne: recovery._id } });
      console.log(`[HERIXA-RESET] Invalidated and cleaned up ${deleteResult.deletedCount} other active OTP sessions for this user`);
    } catch (cleanErr: any) {
      console.warn('[HERIXA-RESET] Non-blocking warning: Failed to clean up other active user OTP sessions:', cleanErr.message || cleanErr);
    }

    // Send email notification (non-blocking)
    sendPasswordChangedEmail(user.email, user.name).catch((err) => {
      console.error('[HERIXA-EMAIL] Failed to send password changed email notification:', err.message || err);
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ success: false, message: 'Current password, new password, and confirmation are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, message: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
      return;
    }

    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized: User details not found in request context.' });
      return;
    }

    // Verify current password
    if (!user.passwordHash) {
      res.status(400).json({ success: false, message: 'Account does not have a set password hash.' });
      return;
    }

    const isCurrentValid = verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(400).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    // Verify new password is not the same as current
    if (currentPassword === newPassword) {
      res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });
      return;
    }

    // Hash and update
    user.passwordHash = hashPassword(newPassword);
    await user.save();

    // Send email notification (non-blocking)
    sendPasswordChangedEmail(user.email, user.name).catch((err) => {
      console.error('[HERIXA-EMAIL] Failed to send password changed email notification:', err.message || err);
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const sendSettingsOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated.' });
      return;
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    // Rate limiting: One OTP request per minute
    const existingReset = await PasswordReset.findOne({ email: normalizedEmail });
    if (existingReset && existingReset.createdAt && (Date.now() - new Date(existingReset.createdAt).getTime() < 60000)) {
      res.status(429).json({ success: false, message: 'Please wait before requesting another OTP.' });
      return;
    }

    // Invalidate previous OTP requests for the same email
    if (existingReset) {
      await PasswordReset.deleteOne({ email: normalizedEmail });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetRequest = new PasswordReset({
      userId: user._id,
      email: normalizedEmail,
      otpHash: hashedOtp,
      expiresAt: otpExpires,
      attempts: 0,
      verified: false,
      resetTokenHash,
      resetTokenExpiresAt: otpExpires
    });

    await resetRequest.save();

    const emailSent = await sendOtpEmail(normalizedEmail, user.name, otp, resetToken);
    if (!emailSent) {
      res.status(500).json({ success: false, message: 'Failed to send recovery email. Please try again.' });
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[HERIXA-AUTH] DEV ONLY - Settings Password Recovery OTP for ${normalizedEmail} is ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your registered email.'
    });
  } catch (error) {
    next(error);
  }
};

export const verifySettingsOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated.' });
      return;
    }

    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ success: false, message: 'OTP parameter is required.' });
      return;
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const recovery = await PasswordReset.findOne({ email: normalizedEmail });

    if (!recovery) {
      res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
      return;
    }

    if (recovery.attempts >= 5) {
      res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP later.' });
      return;
    }

    if (new Date() > recovery.expiresAt) {
      res.status(400).json({ success: false, message: 'This OTP has expired. Please request a new OTP.' });
      return;
    }

    if (recovery.verified || recovery.usedAt) {
      res.status(400).json({ success: false, message: 'This OTP has already been verified or used.' });
      return;
    }

    const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (hashedInput !== recovery.otpHash) {
      recovery.attempts += 1;
      await recovery.save();
      res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
      return;
    }

    // Success - generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    recovery.verified = true;
    recovery.resetTokenHash = resetTokenHash;
    recovery.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await recovery.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordRedirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { background-color: #121212; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background-color: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 30px; text-align: center; max-width: 400px; }
            h1 { color: #ff3b30; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Invalid Link</h1>
            <p>This password reset request is invalid. Please request a new password reset.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const recovery = await PasswordReset.findOne({ resetTokenHash: tokenHash });

    if (!recovery) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <style>
            body { background-color: #121212; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background-color: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 30px; text-align: center; max-width: 400px; }
            h1 { color: #ff3b30; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Invalid Link</h1>
            <p>This password reset request is invalid. Please request a new password reset.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (recovery.usedAt) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Already Used</title>
          <style>
            body { background-color: #121212; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background-color: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 30px; text-align: center; max-width: 400px; }
            h1 { color: #ff3b30; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Link Already Used</h1>
            <p>This password reset request has already been used. Please request a new password reset.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (recovery.resetTokenExpiresAt && new Date() > recovery.resetTokenExpiresAt) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired</title>
          <style>
            body { background-color: #121212; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background-color: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 30px; text-align: center; max-width: 400px; }
            h1 { color: #ff3b30; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Link Expired</h1>
            <p>This password reset request has expired. Please request a new one.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const encodedToken = encodeURIComponent(token);

    // Secure HTML page matching HERIXA premium branding
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HERIXA Password Reset</title>
        <style>
          body {
            background-color: #121212;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .card {
            background-color: #1e1e1e;
            border: 1px solid #333333;
            border-radius: 12px;
            padding: 40px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          }
          h1 {
            color: #D4AF37;
            font-size: 28px;
            margin-top: 0;
            letter-spacing: 2px;
            font-weight: 700;
          }
          h2 {
            font-size: 20px;
            margin-bottom: 20px;
            font-weight: 600;
            color: #ffffff;
          }
          p {
            color: #cccccc;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .btn {
            background-color: #D4AF37;
            color: #121212;
            padding: 14px 28px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 8px;
            display: inline-block;
            font-size: 16px;
            transition: background-color 0.2s;
            border: none;
            cursor: pointer;
            width: 100%;
            box-sizing: border-box;
            letter-spacing: 1px;
          }
          .btn:hover {
            background-color: #C5A028;
          }
          .fallback-card {
            margin-top: 30px;
            border-top: 1px solid #333333;
            padding-top: 20px;
          }
          .fallback-title {
            color: #D4AF37;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
          }
          .fallback-text {
            font-size: 12px;
            color: #999999;
            margin: 0;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>HERIXA</h1>
          <h2>Password Reset</h2>
          <p>Your password reset request is ready. Tap the button below to open the HERIXA app.</p>
          
          <a href="herixa://reset-password?token=${encodedToken}" class="btn" id="open-btn">OPEN HERIXA APP</a>

          <p style="font-size: 13px; color: #ff3b30; margin-top: 20px; font-weight: 500; line-height: 1.5; text-align: center;">
            If HERIXA does not open, make sure the HERIXA app is installed and tap the button again.
          </p>

          <div class="fallback-card">
            <div class="fallback-title">Unable to open HERIXA?</div>
            <p class="fallback-text">If the application does not open, open HERIXA manually and select Forgot Password from the login screen to request a fresh verification code.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ success: false, message: 'Password confirmation is required to delete account.' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (user.passwordHash) {
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Incorrect password. Account deletion aborted.' });
        return;
      }
    }

    // Log ACCOUNT_DELETED before database cleanup to capture user ID reference
    await logEvent('ACCOUNT_DELETED', user._id, user._id, 'USER');

    // Delete associated User history logs
    await History.deleteMany({ userId: user._id });

    // Delete PasswordReset sessions
    await PasswordReset.deleteMany({ userId: user._id });

    // Delete the user profile itself
    await User.findByIdAndDelete(user._id);

    console.log(`[HERIXA-AUTH] ACCOUNT_DELETED for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export default {
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
  deleteAccount
};
