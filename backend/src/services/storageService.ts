import fs from 'fs';
import path from 'path';

let cloudinary: any = null;
try {
  cloudinary = require('cloudinary').v2;
} catch (e) {
  // Cloudinary module not loaded yet
}

export interface UploadResult {
  url: string;
  isPersistent: boolean;
  provider: 'cloudinary' | 'local_dev';
  publicId?: string;
}

export function isCloudStorageConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudUrl = process.env.CLOUDINARY_URL;

  return Boolean((cloudName && apiKey && apiSecret) || (cloudUrl && cloudUrl.startsWith('cloudinary://')));
}

export function initCloudinary() {
  if (!cloudinary) {
    try {
      cloudinary = require('cloudinary').v2;
    } catch (e) {
      throw new Error('Cloudinary package is not installed.');
    }
  }

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true
    });
  } else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
}

/**
 * Safely uploads a local video file (temporary buffer/file) to persistent cloud storage.
 * - In Production: FAILS FAST if Cloudinary credentials are not configured.
 * - In Development: Falls back to local filesystem storage if Cloudinary is not configured.
 * - Automatically unlinks/deletes local temp file after completion.
 */
export async function uploadVideoToStorage(localFilePath: string, filename: string): Promise<UploadResult> {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = isCloudStorageConfigured();

  if (isProd && !configured) {
    // Fail fast in production if persistent object storage is missing
    if (fs.existsSync(localFilePath)) {
      try { fs.unlinkSync(localFilePath); } catch (_) {}
    }
    throw new Error('Production Error: Persistent cloud object storage (Cloudinary) credentials are not configured in production environment. Upload rejected.');
  }

  if (configured) {
    try {
      initCloudinary();
      console.log(`[HERIXA-STORAGE] Uploading video '${filename}' to Cloudinary persistent storage...`);

      const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'video',
        folder: 'herixa/videos',
        public_id: path.parse(filename).name,
        overwrite: true
      });

      console.log(`[HERIXA-STORAGE] Cloudinary upload successful: ${result.secure_url}`);

      // Clean up temporary local file
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (_) {}
      }

      return {
        url: result.secure_url,
        isPersistent: true,
        provider: 'cloudinary',
        publicId: result.public_id
      };
    } catch (err: any) {
      // Clean up temporary local file on error
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (_) {}
      }
      console.error('[HERIXA-STORAGE] Cloudinary upload failed:', err.message || err);
      throw new Error(`Cloud storage upload failed: ${err.message || 'Unknown error'}`);
    }
  }

  // Development Fallback Only
  console.warn(`[HERIXA-STORAGE] Cloudinary credentials not configured. Using local filesystem storage for development fallback: /uploads/videos/${filename}`);
  const relativePath = `/uploads/videos/${filename}`;
  return {
    url: relativePath,
    isPersistent: false,
    provider: 'local_dev'
  };
}

/**
 * Safely uploads a local image file to persistent Cloudinary cloud storage.
 */
export async function uploadImageToStorage(localFilePath: string, filename: string, folder = 'herixa/profiles'): Promise<UploadResult> {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = isCloudStorageConfigured();

  if (isProd && !configured) {
    if (fs.existsSync(localFilePath)) {
      try { fs.unlinkSync(localFilePath); } catch (_) {}
    }
    throw new Error('Production Error: Persistent cloud object storage (Cloudinary) credentials are not configured in production environment. Upload rejected.');
  }

  if (configured) {
    try {
      initCloudinary();
      console.log(`[HERIXA-STORAGE] Uploading image '${filename}' to Cloudinary persistent storage...`);

      const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'image',
        folder: folder,
        public_id: path.parse(filename).name,
        overwrite: true
      });

      console.log(`[HERIXA-STORAGE] Cloudinary image upload successful: ${result.secure_url}`);

      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (_) {}
      }

      return {
        url: result.secure_url,
        isPersistent: true,
        provider: 'cloudinary',
        publicId: result.public_id
      };
    } catch (err: any) {
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (_) {}
      }
      console.error('[HERIXA-STORAGE] Cloudinary image upload failed:', err.message || err);
      throw new Error(`Cloud storage upload failed: ${err.message || 'Unknown error'}`);
    }
  }

  const relativePath = `/uploads/profiles/${filename}`;
  return {
    url: relativePath,
    isPersistent: false,
    provider: 'local_dev'
  };
}
