import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Monument from '../models/monument';
import HeritageProtocol, { IHeritageProtocol, IProtocolSource } from '../models/HeritageProtocol';
import { fetchSourceContent, extractProtocolFromSource, getDefaultProtocolSections, translateProtocolSections } from '../services/protocolService';
import { logEvent } from '../utils/auditLogger';

// Helper to resolve monument by ID or slug
async function resolveMonument(idOrSlug: string) {
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    return await Monument.findById(idOrSlug);
  }
  return await Monument.findOne({ slug: idOrSlug });
}

// GET /api/monuments/:id/protocol (Public API)
export const getPublicProtocol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang as string || 'en').toLowerCase();
    const validLang = ['en', 'ta', 'hi'].includes(lang) ? lang : 'en';

    const monument = await resolveMonument(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    // Try fetching requested language published protocol
    let protocol = await HeritageProtocol.findOne({
      monumentId: monument._id,
      language: validLang,
      status: 'PUBLISHED'
    });

    // Fallback to English if requested language not found
    if (!protocol && validLang !== 'en') {
      protocol = await HeritageProtocol.findOne({
        monumentId: monument._id,
        language: 'en',
        status: 'PUBLISHED'
      });
    }

    if (!protocol) {
      res.status(200).json({
        success: true,
        data: null,
        isVerified: false,
        status: 'UNVERIFIED',
        message: 'Heritage guidance is currently being verified. Please follow instructions provided by site authorities during your visit.',
        monument: {
          id: monument._id.toString(),
          name: monument.name,
          slug: monument.slug
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: protocol,
      isVerified: true,
      status: protocol.status,
      language: protocol.language,
      monument: {
        id: monument._id.toString(),
        name: monument.name,
        slug: monument.slug
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/monuments/:id/protocol (Admin API)
export const getAdminProtocol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang as string || 'en').toLowerCase();
    const validLang = ['en', 'ta', 'hi'].includes(lang) ? (lang as 'en' | 'ta' | 'hi') : 'en';

    const monument = await resolveMonument(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    let protocol = await HeritageProtocol.findOne({
      monumentId: monument._id,
      language: validLang
    });

    // If no document exists, create an initial draft
    if (!protocol) {
      const defaultSections = getDefaultProtocolSections(monument.name);
      protocol = new HeritageProtocol({
        monumentId: monument._id,
        monumentSlug: monument.slug,
        language: validLang,
        status: 'DRAFT',
        sections: defaultSections,
        sources: []
      });
      await protocol.save();
    }

    res.status(200).json({
      success: true,
      data: protocol,
      monument: {
        id: monument._id.toString(),
        name: monument.name,
        slug: monument.slug
      }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/monuments/:id/protocol (Admin API)
export const updateAdminProtocol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { sections, sources, language = 'en' } = req.body;
    const adminUser = (req as any).user;

    const monument = await resolveMonument(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    let protocol = await HeritageProtocol.findOne({
      monumentId: monument._id,
      language
    });

    if (!protocol) {
      protocol = new HeritageProtocol({
        monumentId: monument._id,
        monumentSlug: monument.slug,
        language,
        status: 'DRAFT'
      });
    }

    if (sections) protocol.sections = sections;
    if (sources) protocol.sources = sources;
    protocol.lastUpdatedBy = adminUser?.email || 'admin';
    protocol.lastVerifiedAt = new Date();

    await protocol.save();

    await logEvent('PROTOCOL_UPDATED', adminUser?._id, monument._id, 'ADMIN', {
      monumentName: monument.name,
      status: protocol.status,
      language
    });

    res.status(200).json({
      success: true,
      message: 'Heritage protocol draft updated successfully.',
      data: protocol
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/monuments/:id/protocol/generate (Admin AI Source Fetching & Extraction)
export const generateProtocolFromSource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { sourceUrl, sourceType = 'Official Government', language = 'en' } = req.body;
    const adminUser = (req as any).user;

    if (!sourceUrl || typeof sourceUrl !== 'string') {
      res.status(400).json({ success: false, message: 'A valid sourceUrl parameter is required.' });
      return;
    }

    const monument = await resolveMonument(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    // 1. Fetch source content safely
    let fetched;
    try {
      fetched = await fetchSourceContent(sourceUrl);
    } catch (fetchErr: any) {
      res.status(400).json({
        success: false,
        message: `Unable to fetch source: ${fetchErr.message}`,
        errorCode: 400,
        errorDetails: 'SOURCE_FETCH_FAILED'
      });
      return;
    }

    // 2. AI Extraction via Gemini
    const extractedSections = await extractProtocolFromSource(
      monument.name,
      sourceUrl,
      fetched.title,
      fetched.organization,
      fetched.text
    );

    // 3. Update draft document with new source & extracted sections
    let protocol = await HeritageProtocol.findOne({
      monumentId: monument._id,
      language
    });

    if (!protocol) {
      protocol = new HeritageProtocol({
        monumentId: monument._id,
        monumentSlug: monument.slug,
        language,
        status: 'DRAFT'
      });
    }

    // Append new source if not already present
    const existingSource = protocol.sources.find(s => s.url === sourceUrl);
    if (!existingSource) {
      protocol.sources.push({
        id: new mongoose.Types.ObjectId().toString(),
        url: sourceUrl,
        title: fetched.title,
        organization: fetched.organization,
        sourceType: sourceType as any,
        retrievedAt: new Date(),
        status: 'Verified'
      });
    }

    protocol.sections = extractedSections;
    protocol.lastUpdatedBy = adminUser?.email || 'admin';
    protocol.lastVerifiedAt = new Date();

    await protocol.save();

    await logEvent('PROTOCOL_AI_EXTRACTED', adminUser?._id, monument._id, 'ADMIN', {
      monumentName: monument.name,
      sourceUrl,
      language
    });

    res.status(200).json({
      success: true,
      message: 'Source content fetched and structured successfully. Review generated draft before publishing.',
      data: protocol
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/monuments/:id/protocol/publish (Admin Publish / Unpublish)
export const publishProtocol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { action = 'publish', language = 'en' } = req.body;
    const adminUser = (req as any).user;

    const monument = await resolveMonument(id);
    if (!monument) {
      res.status(404).json({ success: false, message: 'Monument not found' });
      return;
    }

    let protocol = await HeritageProtocol.findOne({
      monumentId: monument._id,
      language
    });

    if (!protocol) {
      res.status(404).json({ success: false, message: 'Protocol draft not found for this monument.' });
      return;
    }

    if (action === 'unpublish') {
      protocol.status = 'UNPUBLISHED';
      await protocol.save();

      // Also unpublish other languages if canonical unpublished
      await HeritageProtocol.updateMany(
        { monumentId: monument._id },
        { status: 'UNPUBLISHED' }
      );

      res.status(200).json({
        success: true,
        message: 'Heritage protocol unpublished.',
        data: protocol
      });
      return;
    }

    // Publish action validation
    const hasItems = Object.values(protocol.sections).some((arr: any) => Array.isArray(arr) && arr.length > 0);
    if (!hasItems) {
      res.status(400).json({
        success: false,
        message: 'Cannot publish an empty protocol. Add at least one guideline section.'
      });
      return;
    }

    protocol.status = 'PUBLISHED';
    protocol.publishedAt = new Date();
    protocol.lastVerifiedAt = new Date();
    await protocol.save();

    // Auto-generate translated published protocols for Tamil and Hindi if primary language is 'en'
    if (language === 'en') {
      (async () => {
        try {
          const taSections = await translateProtocolSections(protocol.sections, 'ta');
          await HeritageProtocol.findOneAndUpdate(
            { monumentId: monument._id, language: 'ta' },
            {
              monumentId: monument._id,
              monumentSlug: monument.slug,
              language: 'ta',
              status: 'PUBLISHED',
              sections: taSections,
              sources: protocol.sources,
              publishedAt: new Date(),
              lastVerifiedAt: new Date()
            },
            { upsert: true, new: true }
          );

          const hiSections = await translateProtocolSections(protocol.sections, 'hi');
          await HeritageProtocol.findOneAndUpdate(
            { monumentId: monument._id, language: 'hi' },
            {
              monumentId: monument._id,
              monumentSlug: monument.slug,
              language: 'hi',
              status: 'PUBLISHED',
              sections: hiSections,
              sources: protocol.sources,
              publishedAt: new Date(),
              lastVerifiedAt: new Date()
            },
            { upsert: true, new: true }
          );
        } catch (transErr) {
          console.warn('[Protocol Controller] Non-blocking translation warning:', transErr);
        }
      })();
    }

    await logEvent('PROTOCOL_PUBLISHED', adminUser?._id, monument._id, 'ADMIN', {
      monumentName: monument.name,
      language
    });

    res.status(200).json({
      success: true,
      message: 'Heritage protocol published successfully across languages.',
      data: protocol
    });
  } catch (err) {
    next(err);
  }
};
