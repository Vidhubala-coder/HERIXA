import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { HeritageStory, StoryLanguage, StoryStatus } from '../models/HeritageStory';
import { Monument } from '../models/monument';
import {
  extractStoryFromSource,
  generateNarrationScript,
  processStoryMedia,
  translateStorySections,
  validateStoryForPublish,
  getDefaultStorySections
} from '../services/heritageStoryService';
import { logEvent } from '../utils/auditLogger';
import { Types } from 'mongoose';
import { processAndDownloadRemoteVideoUrl } from '../utils/ssrfValidator';

// Multer storage for heritage story video upload
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const videoDir = path.join(__dirname, '../../uploads/videos');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    cb(null, videoDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.3gp'].includes(ext) ? ext : '.mp4';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${safeExt}`);
  }
});

export const uploadVideoFile = multer({
  storage: videoStorage,
  fileFilter: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedMime = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska',
      'video/avi',
      'video/x-msvideo',
      'video/3gpp',
      'application/octet-stream'
    ];
    const allowedExt = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.3gp'];

    if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.includes('pdf') || file.mimetype.includes('text'))) {
      return cb(new Error('Please select a valid video file. (Images, PDFs, and documents are not allowed)'), false);
    }

    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Please select a valid video file. Supported formats: MP4, MOV, WEBM, MKV, AVI.'), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

export function handleVideoMulterUpload(req: Request, res: Response, next: any) {
  uploadVideoFile.single('video')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, error: 'Video must be 100 MB or smaller.' });
        return;
      }
      res.status(400).json({ success: false, error: err.message || 'Please select a valid video file.' });
      return;
    }
    next();
  });
}



async function findMonumentByIdOrSlug(idOrSlug: string) {
  if (Types.ObjectId.isValid(idOrSlug)) {
    const m = await Monument.findById(idOrSlug);
    if (m) return m;
  }
  return await Monument.findOne({ slug: idOrSlug });
}

// PUBLIC API: Get Published Story for a Monument (Zero Gemini Execution)
export async function getPublicStory(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;
    const requestedLang = (req.query.language as StoryLanguage) || 'en';

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    // Attempt to retrieve requested language PUBLISHED story
    let story = await HeritageStory.findOne({
      monumentId: monument._id,
      language: requestedLang,
      status: 'PUBLISHED'
    });

    let isFallback = false;
    if (!story && requestedLang !== 'en') {
      // Fallback to English published story
      story = await HeritageStory.findOne({
        monumentId: monument._id,
        language: 'en',
        status: 'PUBLISHED'
      });
      if (story) isFallback = true;
    }

    if (!story) {
      res.status(404).json({
        success: false,
        message: 'No published heritage story available for this monument yet.',
        data: null
      });
      return;
    }

    // Clean scenes: keep strictly Scene 1 through Scene 9
    const cleanScenes = (story.scenes || [])
      .filter(sc => sc.sceneNumber >= 1 && sc.sceneNumber <= 9)
      .sort((a, b) => a.sceneNumber - b.sceneNumber);

    // Clean public output: omit admin-internal prompts/generation keys
    res.json({
      success: true,
      data: {
        _id: story._id,
        monumentId: story.monumentId,
        monumentSlug: story.monumentSlug,
        language: story.language,
        status: story.status,
        title: story.title,
        shortIntroduction: story.shortIntroduction,
        duration: story.duration,
        thumbnailUrl: story.thumbnailUrl,
        videoUrl: story.videoUrl,
        audioUrl: story.audioUrl,
        subtitlesUrl: story.subtitlesUrl,
        sections: story.sections,
        sources: story.sources,
        script: story.script,
        scenes: cleanScenes,
        publishedAt: story.publishedAt,
        lastVerifiedAt: story.lastVerifiedAt,
        isFallback
      }
    });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] Public getPublicStory error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve heritage story' });
  }
}

// ADMIN API: Get Admin Draft / Management Details
export async function getAdminStory(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;
    const language = (req.query.language as StoryLanguage) || 'en';

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    let story = await HeritageStory.findOne({ monumentId: monument._id, language });

    if (!story) {
      // Create initial draft
      story = new HeritageStory({
        monumentId: monument._id,
        monumentSlug: monument.slug || monument.name.toLowerCase().replace(/\s+/g, '-'),
        language,
        status: 'DRAFT',
        title: `${monument.name} — Heritage Story`,
        shortIntroduction: `Discover the rich history, architectural features, and enduring legacy of ${monument.name}.`,
        sections: getDefaultStorySections(),
        sources: []
      });
      await story.save();
    } else if (story.scenes && story.scenes.length > 0) {
      story.scenes = story.scenes.filter(sc => sc.sceneNumber >= 1 && sc.sceneNumber <= 9).sort((a, b) => a.sceneNumber - b.sceneNumber);
    }

    res.json({ success: true, data: story });

  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] getAdminStory error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve admin story' });
  }
}

// ADMIN API: Update Admin Draft
export async function updateAdminStory(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;
    const { title, shortIntroduction, sections, sources, script, scenes, videoUrl, thumbnailUrl } = req.body;
    const language = (req.query.language as StoryLanguage) || 'en';

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    let story = await HeritageStory.findOne({ monumentId: monument._id, language });
    if (!story) {
      story = new HeritageStory({
        monumentId: monument._id,
        monumentSlug: monument.slug || monument.name.toLowerCase().replace(/\s+/g, '-'),
        language
      });
    }

    // Handle video URL processing for Option A with SSRF validation and remote download
    if (videoUrl !== undefined) {
      if (videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
        try {
          const downloadedPath = await processAndDownloadRemoteVideoUrl(videoUrl);
          story.videoUrl = downloadedPath;
        } catch (downloadErr: any) {
          res.status(400).json({ success: false, error: downloadErr.message || 'Failed to process remote video URL.' });
          return;
        }
      } else {
        story.videoUrl = videoUrl;
      }
    }

    // Increment story version if structural changes made
    story.storyVersion = (story.storyVersion || 1) + 1;
    if (title !== undefined) story.title = title;
    if (shortIntroduction !== undefined) story.shortIntroduction = shortIntroduction;
    if (sections !== undefined) story.sections = sections;
    if (sources !== undefined) story.sources = sources;
    if (script !== undefined) story.script = script;
    if (scenes !== undefined) story.scenes = scenes;
    if (thumbnailUrl !== undefined) story.thumbnailUrl = thumbnailUrl;

    // Filter scenes to strictly enforce Scene 1 through Scene 9 ONLY
    if (story.scenes && story.scenes.length > 0) {
      const sceneMap = new Map<number, any>();
      story.scenes.forEach(sc => {
        if (sc.sceneNumber >= 1 && sc.sceneNumber <= 9 && !sceneMap.has(sc.sceneNumber)) {
          sceneMap.set(sc.sceneNumber, sc);
        }
      });
      story.scenes = Array.from(sceneMap.values()).sort((a, b) => a.sceneNumber - b.sceneNumber);
    }

    // Reset status to DRAFT if previously failed or edited
    if (story.status === 'FAILED') {
      story.status = 'DRAFT';
      story.errorMessage = undefined;
    }

    story.updatedBy = (req as any).user?.email || 'admin';
    await story.save();

    await logEvent('HERITAGE_STORY_UPDATED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', { monumentId, monumentName: monument.name, language, version: story.storyVersion });

    res.json({ success: true, data: story });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] updateAdminStory error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update story draft' });
  }
}

// ADMIN API: AI Source Content Extraction
export async function generateStoryFromSource(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;
    const { sourceUrl } = req.body;

    if (!sourceUrl) {
      res.status(400).json({ success: false, error: 'sourceUrl is required' });
      return;
    }

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    const { sections, source, title, shortIntroduction } = await extractStoryFromSource(sourceUrl, monument.name);

    let story = await HeritageStory.findOne({ monumentId: monument._id, language: 'en' });
    if (!story) {
      story = new HeritageStory({
        monumentId: monument._id,
        monumentSlug: monument.slug || monument.name.toLowerCase().replace(/\s+/g, '-'),
        language: 'en'
      });
    }

    story.title = title;
    story.shortIntroduction = shortIntroduction;
    story.sections = sections;
    story.status = 'DRAFT';
    story.storyVersion = (story.storyVersion || 1) + 1;

    // Append source if not duplicate
    if (!story.sources.some(s => s.url === source.url)) {
      story.sources.push(source);
    }

    await story.save();

    await logEvent('HERITAGE_STORY_AI_GENERATED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', { monumentId, monumentName: monument.name, sourceUrl });

    res.json({ success: true, data: story });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] generateStoryFromSource error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate story from source' });
  }
}

// ADMIN API: AI Script & Scene Generation
export async function generateScript(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    let story = await HeritageStory.findOne({ monumentId: monument._id, language: 'en' });
    if (!story) {
      res.status(404).json({ success: false, error: 'Story draft not found. Extract or save a story first.' });
      return;
    }

    const { script, scenes, totalDuration } = await generateNarrationScript(monument.name, story.sections, story.sources);

    story.script = script;
    story.scenes = scenes;
    story.duration = totalDuration;
    story.status = 'SCRIPT_READY';
    story.storyVersion = (story.storyVersion || 1) + 1;

    await story.save();

    await logEvent('HERITAGE_SCRIPT_GENERATED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', { monumentId, monumentName: monument.name, totalDuration, scenesCount: scenes.length });

    res.json({ success: true, data: story });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] generateScript error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate narration script' });
  }
}

// ADMIN API: Media Generation with Lock & Idempotency
export async function generateMedia(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    let story = await HeritageStory.findOne({ monumentId: monument._id, language: 'en' });
    if (!story) {
      res.status(404).json({ success: false, error: 'Story draft not found' });
      return;
    }

    // Idempotency check: If currently PROCESSING, return active status
    if (story.status === 'PROCESSING') {
      res.json({
        success: true,
        message: 'Media processing is already running for this story version.',
        data: story
      });
      return;
    }

    // Trigger async processing lock with current storyVersion
    const currentVersion = story.storyVersion || 1;
    story.status = 'PROCESSING';
    await story.save();

    // Run processing non-blockingly or inline
    processStoryMedia(String(story._id), currentVersion).catch(err => {
      console.error('[HERIXA STORY] Background processStoryMedia error:', err);
    });

    await logEvent('HERITAGE_VIDEO_GENERATED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', { monumentId, monumentName: monument.name, version: currentVersion });

    res.json({
      success: true,
      message: 'Media processing started successfully.',
      data: story
    });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] generateMedia error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to start media generation' });
  }
}

// ADMIN API: Publish Story
export async function publishStory(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    let story = await HeritageStory.findOne({ monumentId: monument._id, language: 'en' });
    if (!story) {
      res.status(404).json({ success: false, error: 'Story draft not found' });
      return;
    }

    // Run strict pre-publish validation
    const { valid, errors } = validateStoryForPublish(story);
    if (!valid) {
      res.status(400).json({
        success: false,
        error: 'Publish validation failed',
        validationErrors: errors
      });
      return;
    }

    story.status = 'PUBLISHED';
    story.publishedAt = new Date();
    story.lastVerifiedAt = new Date();
    await story.save();

    // Trigger translation for Tamil and Hindi
    await Promise.all([
      translateStorySections(story, 'ta').catch(err => console.error('[HERIXA STORY] Background TA translation error:', err)),
      translateStorySections(story, 'hi').catch(err => console.error('[HERIXA STORY] Background HI translation error:', err))
    ]);

    await logEvent('HERITAGE_STORY_PUBLISHED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', { monumentId, monumentName: monument.name, publishedAt: story.publishedAt });

    res.json({
      success: true,
      message: 'Heritage story published successfully.',
      data: story
    });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] publishStory error:', err);
    res.status(500).json({ success: false, error: 'Failed to publish story' });
  }
}

// ADMIN API: Unpublish Story
export async function unpublishStory(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    await HeritageStory.updateMany(
      { monumentId: monument._id },
      { $set: { status: 'UNPUBLISHED' } }
    );

    await logEvent('HERITAGE_STORY_UNPUBLISHED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', { monumentId, monumentName: monument.name });

    res.json({
      success: true,
      message: 'Heritage story unpublished successfully.'
    });
  } catch (err: any) {
    console.error('[HERIXA STORY CONTROLLER] unpublishStory error:', err);
    res.status(500).json({ success: false, error: 'Failed to unpublish story' });
  }
}

// ADMIN API: Upload Multipart Video File
export async function uploadVideo(req: Request, res: Response): Promise<void> {
  try {
    const { monumentId } = req.params;
    const language = (req.query.language as StoryLanguage) || 'en';

    const monument = await findMonumentByIdOrSlug(monumentId);
    if (!monument) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      res.status(404).json({ success: false, error: 'Monument not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No video file provided.' });
      return;
    }

    const { uploadVideoToStorage } = require('../services/storageService');
    const storageResult = await uploadVideoToStorage(req.file.path, req.file.filename);
    const videoUrlToSave = storageResult.url;

    let story = await HeritageStory.findOne({ monumentId: monument._id, language });
    if (!story) {
      story = new HeritageStory({
        monumentId: monument._id,
        monumentSlug: monument.slug || monument.name.toLowerCase().replace(/\s+/g, '-'),
        language,
        status: 'DRAFT',
        title: `${monument.name} — Heritage Story`,
        shortIntroduction: `Discover the rich history, architectural features, and enduring legacy of ${monument.name}.`,
        sections: getDefaultStorySections(),
        sources: []
      });
    }

    story.videoUrl = videoUrlToSave;
    story.updatedBy = (req as any).user?.email || 'admin';
    story.storyVersion = (story.storyVersion || 1) + 1;
    await story.save();

    await logEvent('HERITAGE_VIDEO_UPLOADED', (req as any).user?._id, (req as any).user?._id, 'ADMIN', {
      monumentId: monument._id,
      monumentName: monument.name,
      filename: req.file.filename,
      videoUrl: videoUrlToSave,
      size: req.file.size,
      provider: storageResult.provider
    });

    res.json({
      success: true,
      message: 'Video file uploaded successfully.',
      videoUrl: videoUrlToSave,
      data: story
    });
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    console.error('[HERIXA STORY CONTROLLER] uploadVideo error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to upload video' });
  }
}

