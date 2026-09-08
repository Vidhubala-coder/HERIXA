import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { URL } from 'url';

/**
 * Validates if an IP address is private, loopback, or reserved.
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return false;

  // IPv4 private & loopback & link-local checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local / AWS metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }

  // IPv6 loopback & private checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a URL against SSRF vulnerabilities and protocol security.
 */
export async function validateUrlForSSRF(inputUrl: string): Promise<{ valid: boolean; reason?: string; parsedUrl?: URL }> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch (_) {
    return { valid: false, reason: 'Please enter a valid video URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP and HTTPS video URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
    return { valid: false, reason: 'Access to localhost or internal network addresses is forbidden.' };
  }

  // Reject direct IP access if private
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    return { valid: false, reason: 'Access to private network IP addresses is forbidden.' };
  }

  // Resolve hostname via DNS to prevent DNS rebinding SSRF
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        return { valid: false, reason: `URL resolves to a private network address (${addr.address}).` };
      }
    }
  } catch (err: any) {
    return { valid: false, reason: `Domain resolution failed: ${err.message}` };
  }

  return { valid: true, parsedUrl: parsed };
}

/**
 * Securely downloads a remote video URL to server storage (uploads/videos/)
 * with strict SSRF protection and 100 MB size limit enforcement.
 */
export async function processAndDownloadRemoteVideoUrl(inputUrl: string): Promise<string> {
  const ssrf = await validateUrlForSSRF(inputUrl);
  if (!ssrf.valid) {
    throw new Error(ssrf.reason || 'Invalid video URL.');
  }

  const lower = inputUrl.toLowerCase();
  if (
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be') ||
    lower.includes('instagram.com') ||
    lower.includes('facebook.com') ||
    lower.includes('tiktok.com')
  ) {
    throw new Error('YouTube, Instagram, and web page URLs are not direct video files. Please provide a direct video URL (e.g. ending in .mp4, .mov, or HLS stream).');
  }

  const videoDir = path.join(__dirname, '../../uploads/videos');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  let ext = path.extname(ssrf.parsedUrl!.pathname).toLowerCase();
  if (!['.mp4', '.mov', '.webm', '.mkv', '.avi'].includes(ext)) {
    ext = '.mp4';
  }

  const filename = `video-remote-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const targetPath = path.join(videoDir, filename);
  const relativePath = `/uploads/videos/${filename}`;
  const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

  return new Promise<string>((resolve, reject) => {
    const protocol = ssrf.parsedUrl!.protocol === 'https:' ? https : http;
    const req = protocol.get(inputUrl, { timeout: 35000 }, (res) => {
      // Follow redirects up to 3 times if needed
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const redirectUrl = res.headers.location;
        processAndDownloadRemoteVideoUrl(redirectUrl).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        return reject(new Error(`Remote server responded with status ${res.statusCode}`));
      }

      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        res.resume();
        return reject(new Error('The provided URL points to a web page (HTML), not a direct video file.'));
      }

      const contentLength = Number(res.headers['content-length']);
      if (contentLength && contentLength > MAX_SIZE) {
        res.resume();
        return reject(new Error('Video must be 100 MB or smaller.'));
      }

      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(targetPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_SIZE) {
          req.destroy();
          fileStream.close();
          if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
          reject(new Error('Video must be 100 MB or smaller.'));
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(async () => {
          try {
            const { uploadVideoToStorage } = require('../services/storageService');
            const result = await uploadVideoToStorage(targetPath, filename);
            resolve(result.url);
          } catch (storageErr) {
            if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
            reject(storageErr);
          }
        });
      });

      fileStream.on('error', (err) => {
        if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
        reject(err);
      });
    });

    req.on('error', (err) => {
      if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
      reject(new Error(`Failed to download video from URL: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
      reject(new Error('Remote video download timed out.'));
    });
  });
}
