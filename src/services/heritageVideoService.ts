import { apiFetch, getApiUrl } from './api';

export const getVideoUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Cloudinary persistent URLs: ensure HTTPS and preserve directly
  if (trimmed.includes('cloudinary.com')) {
    if (trimmed.startsWith('http://')) {
      return trimmed.replace('http://', 'https://');
    }
    return trimmed;
  }

  const apiURL = getApiUrl();
  const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;

  // Rewrite any localhost, 127.0.0.1, or local LAN IP to the active API baseUrl
  if (
    trimmed.startsWith('http://localhost') ||
    trimmed.startsWith('http://127.0.0.1') ||
    trimmed.startsWith('http://10.') ||
    trimmed.startsWith('http://192.168.')
  ) {
    try {
      const parsed = new URL(trimmed);
      return `${baseUrl}${parsed.pathname}${parsed.search}`;
    } catch (_) {
      const pathMatch = trimmed.match(/https?:\/\/[^\/]+(\/.*)?$/);
      if (pathMatch && pathMatch[1]) {
        return `${baseUrl}${pathMatch[1]}`;
      }
    }
  }

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://')) {
    // If it's pointing to herixa-backend.onrender.com with http, upgrade to https
    if (trimmed.includes('herixa-backend.onrender.com')) {
      return trimmed.replace('http://', 'https://');
    }
    return trimmed;
  }

  const formattedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${formattedPath}`;
};

export type StoryLanguage = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
export type StoryStatus = 'DRAFT' | 'REVIEW' | 'SCRIPT_READY' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'UNPUBLISHED' | 'FAILED';
export type FactClassification = 'VERIFIED_FACT' | 'TRADITIONAL_ACCOUNT' | 'INTERPRETATION' | 'UNVERIFIED';

export interface StoryItem {
  id?: string;
  text: string;
  classification: FactClassification;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceOrganization?: string;
  lastVerifiedAt?: string;
}

export interface StorySection {
  historicalBackground?: StoryItem[];
  construction?: StoryItem[];
  architecture?: StoryItem[];
  specialFeatures?: StoryItem[];
  culturalSignificance?: StoryItem[];
  storiesAndLegends?: StoryItem[];
  historicalTimeline?: StoryItem[];
  visitorContext?: StoryItem[];
}

export interface StorySource {
  url: string;
  title: string;
  organization: string;
  sourceType: 'OFFICIAL' | 'GOVERNMENT' | 'ARCHAEOLOGY' | 'TOURISM' | 'UNESCO' | 'ACADEMIC' | 'INSTITUTIONAL' | 'TRUSTED_SECONDARY' | 'OTHER';
  retrievedAt: string;
  status?: string;
}

export interface StoryScene {
  sceneNumber: number;
  title: string;
  narration: string;
  duration: number;
  visualDescription?: string;
  caption?: string;
  sourceReferences?: string[];
  visualAsset?: string;
}

export interface HeritageStoryData {
  _id?: string;
  monumentId: string;
  monumentSlug: string;
  language: StoryLanguage;
  status: StoryStatus;
  storyVersion?: number;
  title: string;
  shortIntroduction: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  subtitlesUrl?: string;
  sections: StorySection;
  sources: StorySource[];
  script?: string;
  scenes?: StoryScene[];
  errorMessage?: string;
  publishedAt?: string;
  lastVerifiedAt?: string;
  isFallback?: boolean;
}

export const heritageVideoService = {
  // Public GET (Zero Gemini execution)
  async getPublicStory(monumentId: string, language: StoryLanguage = 'en'): Promise<HeritageStoryData | null> {
    try {
      const res = await apiFetch(`/api/monuments/${monumentId}/heritage-story?language=${language}&_t=${Date.now()}`, {
        method: 'GET'
      });
      return res?.data || null;
    } catch (err: any) {
      console.warn('[HERIXA VIDEO SERVICE] getPublicStory error:', err.message);
      return null;
    }
  },

  // Admin GET
  async getAdminStory(monumentId: string, language: StoryLanguage = 'en'): Promise<HeritageStoryData | null> {
    try {
      const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story?language=${language}`, {
        method: 'GET'
      });
      return res?.data || null;
    } catch (err: any) {
      console.error('[HERIXA VIDEO SERVICE] getAdminStory error:', err.message);
      throw err;
    }
  },

  // Admin Update Draft
  async updateAdminStory(monumentId: string, data: Partial<HeritageStoryData>, language: StoryLanguage = 'en'): Promise<HeritageStoryData> {
    const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story?language=${language}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // Admin AI Extraction from Source
  async generateStoryFromSource(monumentId: string, sourceUrl: string): Promise<HeritageStoryData> {
    const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story/generate`, {
      method: 'POST',
      body: JSON.stringify({ sourceUrl })
    });
    return res.data;
  },

  // Admin AI Narration Script & Scene Generation
  async generateScript(monumentId: string): Promise<HeritageStoryData> {
    const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story/script`, {
      method: 'POST'
    });
    return res.data;
  },

  // Admin Media Generation
  async generateMedia(monumentId: string): Promise<HeritageStoryData> {
    const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story/media`, {
      method: 'POST'
    });
    return res.data;
  },

  // Admin Upload Multipart Video File via native XMLHttpRequest
  async uploadVideoFile(
    monumentId: string,
    videoAsset: { uri: string; name?: string; type?: string; size?: number },
    language: StoryLanguage = 'en'
  ): Promise<HeritageStoryData> {
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    if (videoAsset.size && videoAsset.size > MAX_SIZE) {
      throw new Error('Video must be 100 MB or smaller.');
    }

    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { Platform } = require('react-native');

    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/admin/monuments/${monumentId}/heritage-story/upload-video?language=${language}`;

    const storedToken = await AsyncStorage.getItem('auth_token');

    let fileUri = videoAsset.uri;
    if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    }

    const filename = videoAsset.name || fileUri.split('/').pop() || `video-${Date.now()}.mp4`;
    const lowerFilename = filename.toLowerCase();

    // Resolve MIME type — never allow null/undefined/empty which causes Android unsupportedDataFormat
    let mimeType = videoAsset.type || '';
    if (!mimeType || mimeType === 'null' || mimeType === 'undefined' || mimeType === 'application/octet-stream') {
      if (lowerFilename.endsWith('.mov')) mimeType = 'video/quicktime';
      else if (lowerFilename.endsWith('.webm')) mimeType = 'video/webm';
      else if (lowerFilename.endsWith('.mkv')) mimeType = 'video/x-matroska';
      else if (lowerFilename.endsWith('.avi')) mimeType = 'video/x-msvideo';
      else if (lowerFilename.endsWith('.3gp')) mimeType = 'video/3gpp';
      else mimeType = 'video/mp4'; // safe production default for Android
    }

    // Validate that the resolved MIME type is a video format
    if (!mimeType.startsWith('video/')) {
      throw new Error(`Unsupported media format: "${mimeType}". Please select a video file (MP4, MOV, WEBM, MKV, AVI).`);
    }

    const formData = new FormData();
    formData.append('video', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);


    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      if (storedToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${storedToken}`);
      }

      xhr.timeout = 180000; // 3 minutes timeout for video upload

      xhr.onload = () => {
        let resData: any = {};
        try {
          resData = JSON.parse(xhr.responseText || '{}');
        } catch (e) {
          resData = { error: xhr.responseText || 'Invalid server response.' };
        }

        if (xhr.status >= 200 && xhr.status < 300 && resData.success) {
          resolve(resData.data);
        } else {
          const errorMsg = resData.error || resData.message || `Upload failed with status ${xhr.status}`;
          const err: any = new Error(errorMsg);
          err.status = xhr.status;
          err.responseBody = resData;
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err: any = new Error('Unable to connect to the server. Check your connection and try again.');
        err.isNetworkError = true;
        reject(err);
      };

      xhr.ontimeout = () => {
        const err: any = new Error('Video upload timed out. Please try again.');
        err.isTimeout = true;
        reject(err);
      };

      xhr.send(formData as any);
    });
  },

  // Admin Publish
  async publishStory(monumentId: string): Promise<HeritageStoryData> {
    const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story/publish`, {
      method: 'POST'
    });
    return res.data;
  },

  // Admin Unpublish
  async unpublishStory(monumentId: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/monuments/${monumentId}/heritage-story/unpublish`, {
      method: 'POST'
    });
    return res.success;
  }
};

