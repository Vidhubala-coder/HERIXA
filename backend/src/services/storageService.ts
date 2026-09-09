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
 * - When Cloudinary is configured: Uploads to Cloudinary with resource_type: 'video' and returns secure_url.
 * - When Cloudinary is not configured: Safely keeps local hosted file in /uploads/videos/ and returns full public HTTPS URL.
 */
export async function uploadVideoToStorage(localFilePath: string, filename: string): Promise<UploadResult> {
  const configured = isCloudStorageConfigured();

  if (configured) {
    try {
      initCloudinary();
      console.log(`[HERIXA-STORAGE] Uploading video '${filename}' to Cloudinary persistent storage...`);

      // Use upload_large with chunking for video assets to support large video streams and prevent timeouts
      const uploader = (cloudinary.uploader.upload_large || cloudinary.uploader.upload).bind(cloudinary.uploader);
      const result = await uploader(localFilePath, {
        resource_type: 'video',
        folder: 'herixa/videos',
        public_id: path.parse(filename).name,
        overwrite: true,
        chunk_size: 6000000
      });

      console.log(`[HERIXA-STORAGE] Cloudinary upload successful: ${result.secure_url}`);

      // Clean up temporary local file after successful Cloudinary upload
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
      console.error('[HERIXA-STORAGE] Cloudinary upload failed:', err.message || err);
      throw new Error(`Cloud storage upload failed: ${err.message || 'Unknown error'}`);
    }
  }

  // Fallback if Cloudinary is not configured
  console.warn(`[HERIXA-STORAGE] Cloudinary credentials not configured. Serving from hosted storage fallback: /uploads/videos/${filename}`);
  if (process.env.NODE_ENV === 'production') {
    console.warn('[HERIXA-STORAGE] WARNING: In production without Cloudinary, uploaded video will be lost on container restart. Configure CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME on Render dashboard.');
  }

  const targetDir = path.join(__dirname, '../../uploads/videos');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.join(targetDir, filename);
  if (localFilePath !== targetPath && fs.existsSync(localFilePath)) {
    try {
      fs.copyFileSync(localFilePath, targetPath);
      fs.unlinkSync(localFilePath);
    } catch (copyErr) {
      console.warn('[HERIXA-STORAGE] Could not move video to uploads directory:', copyErr);
    }
  }

  const baseUrl = (process.env.CLIENT_URL || 'https://herixa-backend.onrender.com').replace(/\/$/, '');
  const publicUrl = `${baseUrl}/uploads/videos/${filename}`;
  return {
    url: publicUrl,
    isPersistent: false,
    provider: 'local_dev'
  };
}

/**
 * Safely uploads a local image file to persistent Cloudinary cloud storage.
 * - When Cloudinary is configured: Uploads to Cloudinary with resource_type: 'image' and returns secure_url.
 * - When Cloudinary is not configured: Safely keeps local hosted file in /uploads/profiles/ and returns full public HTTPS URL.
 */
export async function uploadImageToStorage(localFilePath: string, filename: string, folder = 'herixa/profiles'): Promise<UploadResult> {
  const configured = isCloudStorageConfigured();

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

      // Clean up temporary local file after successful Cloudinary upload
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

  // Fallback if Cloudinary is not configured
  const subFolder = folder.includes('profile') ? 'profiles' : (folder.includes('video') ? 'videos' : 'profiles');
  console.warn(`[HERIXA-STORAGE] Cloudinary credentials not configured. Serving from hosted storage fallback: /uploads/${subFolder}/${filename}`);
  const targetDir = path.join(__dirname, `../../uploads/${subFolder}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.join(targetDir, filename);
  if (localFilePath !== targetPath && fs.existsSync(localFilePath)) {
    try {
      fs.copyFileSync(localFilePath, targetPath);
      fs.unlinkSync(localFilePath);
    } catch (copyErr) {
      console.warn('[HERIXA-STORAGE] Could not move image to uploads directory:', copyErr);
    }
  }

  const baseUrl = (process.env.CLIENT_URL || 'https://herixa-backend.onrender.com').replace(/\/$/, '');
  const publicUrl = `${baseUrl}/uploads/${subFolder}/${filename}`;
  return {
    url: publicUrl,
    isPersistent: true,
    provider: 'local_dev'
  };
}
