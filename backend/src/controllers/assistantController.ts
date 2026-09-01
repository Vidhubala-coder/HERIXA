import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Monument from '../models/monument';
import { askAssistant } from '../services/assistantService';
import { chatWithActiveProvider, getActiveProviderHealth } from '../services/aiProvider';

export const askQuestionAboutMonument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('[HERIXA-AI] REQUEST_STARTED');
  try {
    const { monumentId, question, language, explainSimply, history } = req.body;

    // 1. Validate inputs
    if (!monumentId || typeof monumentId !== 'string' || monumentId.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid required parameter: monumentId',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid required parameter: question',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length > 500) {
      res.status(400).json({
        success: false,
        message: 'Question is too long (maximum 500 characters)',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    const validLanguages = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];
    if (!language || !validLanguages.includes(language)) {
      res.status(400).json({
        success: false,
        message: `Missing or invalid language parameter. Supported values: ${validLanguages.join(', ')}`,
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    // Default explainSimply to false if not provided or not a boolean
    const resolvedExplainSimply = typeof explainSimply === 'boolean' ? explainSimply : false;

    if (history !== undefined && !Array.isArray(history)) {
      res.status(400).json({
        success: false,
        message: 'Invalid parameter: history must be an array of chat turns',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    // 2. Fetch monument details
    let monument = null;
    if (mongoose.Types.ObjectId.isValid(monumentId)) {
      monument = await Monument.findById(monumentId);
    } else {
      monument = await Monument.findOne({ slug: monumentId });
    }

    if (!monument) {
      res.status(404).json({
        success: false,
        message: `Monument not found with identifier: '${monumentId}'`,
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    // 3. Ask assistant service
    const result = await askAssistant({
      monument,
      question: trimmedQuestion,
      language: language as 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn',
      explainSimply: resolvedExplainSimply,
      history: history || [],
    });

    res.status(200).json(result);
    console.log('[HERIXA-AI] REQUEST_COMPLETED');
  } catch (error) {
    console.log('[HERIXA-AI] ERROR');
    next(error);
  }
};

interface CachedMonumentName {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
}

let monumentNamesCache: CachedMonumentName[] = [];
let lastCacheUpdateTime = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

const getMonumentNamesAndAliases = async (): Promise<CachedMonumentName[]> => {
  const now = Date.now();
  if (monumentNamesCache.length > 0 && (now - lastCacheUpdateTime < CACHE_TTL_MS)) {
    return monumentNamesCache;
  }

  try {
    const monuments = await Monument.find({}, 'name slug alternativeNames localNames historicalNames');
    const cacheList: CachedMonumentName[] = [];
    
    for (const m of monuments) {
      const aliasesSet = new Set<string>();
      
      if (m.name) aliasesSet.add(m.name.toLowerCase().trim());
      if (m.slug) aliasesSet.add(m.slug.toLowerCase().trim());
      
      if (m.alternativeNames) {
        m.alternativeNames.forEach(val => {
          if (val) aliasesSet.add(val.toLowerCase().trim());
        });
      }
      if (m.localNames) {
        m.localNames.forEach(val => {
          if (val) aliasesSet.add(val.toLowerCase().trim());
        });
      }
      if (m.historicalNames) {
        m.historicalNames.forEach(val => {
          if (val) aliasesSet.add(val.toLowerCase().trim());
        });
      }

      // Add common structural combinations or shortcuts if they contain temple
      const shortName = m.name.toLowerCase().replace(/temple|palace|shore|kovil/g, '').trim();
      if (shortName.length > 3) {
        aliasesSet.add(shortName);
      }

      // Add constituent words of the name as individual aliases
      const words = m.name.toLowerCase().split(/[\s-]+/);
      words.forEach(word => {
        const cleaned = word.replace(/[^a-z0-9]/g, '').trim();
        if (cleaned.length > 3 && !['temple', 'palace', 'shore', 'kovil', 'monument', 'museum'].includes(cleaned)) {
          aliasesSet.add(cleaned);
        }
      });

      cacheList.push({
        id: m._id.toString(),
        name: m.name,
        slug: m.slug,
        aliases: Array.from(aliasesSet).sort((a, b) => b.length - a.length)
      });
    }

    monumentNamesCache = cacheList;
    lastCacheUpdateTime = now;
    return monumentNamesCache;
  } catch (err) {
    console.warn('[HERIXA-ASSISTANT] Failed to fetch monument list for alias cache from MongoDB:', err);
    return monumentNamesCache; // Return stale cache or empty list if db fails
  }
};

export const chatWithHeritageAssistant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message, conversation, monumentContext } = req.body;

    // Validate inputs
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        errorDetails: 'INVALID_REQUEST',
        message: 'Missing or invalid required parameter: message',
      });
      return;
    }

    if (conversation !== undefined && !Array.isArray(conversation)) {
      res.status(400).json({
        success: false,
        errorDetails: 'INVALID_REQUEST',
        message: 'Invalid parameter: conversation must be an array of message objects',
      });
      return;
    }

    const msgLower = message.toLowerCase();
    let matchedMonumentId: string | null = null;

    // 1. Identify if the user's message matches any cached monument alias
    try {
      const cachedMonuments = await getMonumentNamesAndAliases();
      let bestMatchLength = 0;
      
      for (const m of cachedMonuments) {
        for (const alias of m.aliases) {
          if (msgLower.includes(alias)) {
            if (alias.length > bestMatchLength) {
              bestMatchLength = alias.length;
              matchedMonumentId = m.id;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[HERIXA-ASSISTANT] Optional monument alias matching failed:', err);
    }

    let resolvedContext: any = null;

    // 2. Fetch full details if matched by alias or keyword
    if (matchedMonumentId) {
      try {
        const monumentDoc = await Monument.findById(matchedMonumentId);
        if (monumentDoc) {
          resolvedContext = {
            name: monumentDoc.name,
            location: `${monumentDoc.location}, ${monumentDoc.state}`,
            period: `${monumentDoc.period} (${monumentDoc.dynasty})`,
            description: monumentDoc.description,
            historicalBackground: monumentDoc.historicalBackground || monumentDoc.shortHistory || monumentDoc.description,
            architecture: monumentDoc.architecture || monumentDoc.structuralFeatures,
            interestingFacts: monumentDoc.interestingFacts || monumentDoc.didYouKnow || []
          };
          console.log(`[HERIXA-ASSISTANT] Dynamic context fetched from MongoDB for alias match: ${monumentDoc.name}`);
        }
      } catch (dbErr) {
        console.warn(`[HERIXA-ASSISTANT] MongoDB lookup failed for matched monument ID ${matchedMonumentId}:`, dbErr);
      }
    }

    // 3. Fallback/Enrichment for frontend-provided details page context
    if (!resolvedContext && monumentContext && monumentContext.name) {
      try {
        const monumentDoc = await Monument.findOne({ name: { $regex: new RegExp(monumentContext.name, 'i') } });
        if (monumentDoc) {
          resolvedContext = {
            name: monumentDoc.name,
            location: `${monumentDoc.location}, ${monumentDoc.state}`,
            period: `${monumentDoc.period} (${monumentDoc.dynasty})`,
            description: monumentDoc.description,
            historicalBackground: monumentDoc.historicalBackground || monumentDoc.shortHistory || monumentDoc.description,
            architecture: monumentDoc.architecture || monumentDoc.structuralFeatures,
            interestingFacts: monumentDoc.interestingFacts || monumentDoc.didYouKnow || []
          };
          console.log(`[HERIXA-ASSISTANT] Context enriched from MongoDB for client-provided name: ${monumentContext.name}`);
        } else {
          resolvedContext = monumentContext;
        }
      } catch (dbErr) {
        resolvedContext = monumentContext;
        console.warn(`[HERIXA-ASSISTANT] Optional MongoDB enrichment failed for client context:`, dbErr);
      }
    }

    // 4. Call switchable assistant provider
    const result = await chatWithActiveProvider(
      message.trim(),
      conversation || [],
      resolvedContext
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(result.statusCode || 500).json({
        success: false,
        errorDetails: result.errorDetails || 'AI_SERVICE_ERROR',
        message: result.message
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getAssistantHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const health = await getActiveProviderHealth();
    if (health.status === 'unavailable') {
      res.status(503).json({
        provider: health.provider,
        status: 'unavailable'
      });
      return;
    }

    const statusCode = health.status === 'ready' ? 200 : 503;
    res.status(statusCode).json({
      provider: health.provider,
      status: health.status,
      configuredModel: health.configuredModel,
      selectedModel: health.selectedModel,
      modelAvailable: health.modelAvailable
    });
  } catch (error) {
    next(error);
  }
};
