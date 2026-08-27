import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'herixa_secure_default_secret_key_123';

/**
 * Generates a secure, tamper-proof signature token for a user.
 */
export const generateToken = (userId: string): string => {
  const hash = crypto.createHmac('sha256', JWT_SECRET).update(userId).digest('hex');
  return `${userId}.${hash}`;
};

/**
 * Validates a signature token and returns the userId if successful.
 */
export const verifyToken = (token: string): string | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [userId, hash] = parts;
  
  const expectedHash = crypto.createHmac('sha256', JWT_SECRET).update(userId).digest('hex');
  if (hash === expectedHash) {
    return userId;
  }
  return null;
};
