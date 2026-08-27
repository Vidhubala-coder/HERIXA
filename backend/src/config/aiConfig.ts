import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Centralized timeout configurations in milliseconds
export const AI_CONTENT_GENERATION_TIMEOUT = Number(process.env.GEMINI_CONTENT_TIMEOUT_MS) || 180000;
export const AI_IMAGE_DISCOVERY_TIMEOUT = Number(process.env.GEMINI_IMAGE_DISCOVERY_TIMEOUT_MS) || 180000;
export const ASSISTANT_RESPONSE_TIMEOUT = Number(process.env.GEMINI_ASSISTANT_TIMEOUT_MS) || 45000;
// Trigger reload to pick up updated timeouts from .env
export const RELOAD_TRIGGER = true;
