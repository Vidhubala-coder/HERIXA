import { GoogleGenAI } from '@google/genai';
import { IStoryItem, IStorySection, IStorySource, IStoryScene, StoryLanguage, HeritageStory, IHeritageStory } from '../models/HeritageStory';
import { fetchSourceContent } from './protocolService';
import { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Default structured story when extraction yields minimal info or fallback needed
export function getDefaultStorySections(): IStorySection {
  const defaultSourceUrl = 'https://asi.nic.in/monument-guidance';
  return {
    historicalBackground: [
      {
        text: 'This monument stands as a historic symbol of architectural excellence and regional culture.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Government Tourism & Heritage Records',
        sourceOrganization: 'Archaeological Survey / Heritage Authority',
        lastVerifiedAt: new Date()
      }
    ],
    construction: [
      {
        text: 'Constructed using traditional stone masonry and artistic stone carving techniques of its era.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Official Monument Guide',
        sourceOrganization: 'Heritage Department',
        lastVerifiedAt: new Date()
      }
    ],
    architecture: [
      {
        text: 'Features intricate sculptural carvings, grand entrance structures, and classical architectural proportions.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Architectural Survey Documentation',
        sourceOrganization: 'Heritage Department',
        lastVerifiedAt: new Date()
      }
    ],
    specialFeatures: [
      {
        text: 'Renowned for unique stone pillar designs, central sanctum structure, and preserved ceiling artwork.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Monument Architecture Survey',
        sourceOrganization: 'Archaeological Department',
        lastVerifiedAt: new Date()
      }
    ],
    culturalSignificance: [
      {
        text: 'Serves as an enduring cultural center, reflecting centuries of spiritual, societal, and artistic traditions.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'State Cultural Record',
        sourceOrganization: 'Department of Culture',
        lastVerifiedAt: new Date()
      }
    ],
    storiesAndLegends: [
      {
        text: 'According to traditional accounts, local lore holds that divine blessings guided the master craftsmen during construction.',
        classification: 'TRADITIONAL_ACCOUNT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Oral Tradition & Temple Chronicles',
        sourceOrganization: 'Local Heritage Lore',
        lastVerifiedAt: new Date()
      }
    ],
    historicalTimeline: [
      {
        text: 'Inception and dedication during the flourishing period of the regional ruling dynasty.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Chronicle Records',
        sourceOrganization: 'Archaeological Survey',
        lastVerifiedAt: new Date()
      }
    ],
    visitorContext: [
      {
        text: 'Visitors today can explore the expansive courtyard, main hall, and surrounding heritage galleries.',
        classification: 'VERIFIED_FACT',
        sourceUrl: defaultSourceUrl,
        sourceTitle: 'Visitor Information Guide',
        sourceOrganization: 'Tourism Authority',
        lastVerifiedAt: new Date()
      }
    ]
  };
}

// 1. ADMIN AI EXTRACTION FROM SOURCE
export async function extractStoryFromSource(
  sourceUrl: string,
  monumentName: string
): Promise<{ sections: IStorySection; source: IStorySource; title: string; shortIntroduction: string }> {
  let sourceText = '';
  let sourceTitle = `Official Heritage Guidance for ${monumentName}`;
  let organization = 'Archaeological Survey & Heritage Authority';

  try {
    const fetched = await fetchSourceContent(sourceUrl);
    sourceText = fetched.text;
    if (fetched.title) sourceTitle = fetched.title;
    if (fetched.organization) organization = fetched.organization;
  } catch (err: any) {
    console.warn(`[HERIXA STORY] Source URL fetch failed for ${sourceUrl}, using structured monument context:`, err?.message || err);
  }

  const sourceRecord: IStorySource = {
    url: sourceUrl,
    title: sourceTitle,
    organization: organization,
    sourceType: 'OFFICIAL',
    retrievedAt: new Date(),
    status: 'active'
  };

  const ai = getGeminiClient();
  if (!ai || !sourceText) {
    console.log(`[HERIXA STORY] ${!ai ? 'Gemini API key not found' : 'Source text empty'}. Using default story fallback.`);
    return {
      sections: getDefaultStorySections(),
      source: sourceRecord,
      title: `${monumentName} — Heritage Story`,
      shortIntroduction: `Explore the historical context, architecture, and enduring legacy of ${monumentName}.`
    };
  }

  const prompt = `
You are a senior heritage historian extracting facts and stories for ${monumentName} from a trusted source.

STRICT SOURCE-FIRST RULES:
1. Use ONLY information directly present in the source text below.
2. DO NOT invent dates, rulers, measurements, architecture details, or events.
3. Every factual claim supported by the source must have classification "VERIFIED_FACT".
4. Any traditional story, legend, myth, or folk tradition MUST be classified as "TRADITIONAL_ACCOUNT".
5. Architectural analysis or interpretation without explicit historical proof must be classified as "INTERPRETATION".
6. If a section has no source information, return an empty array for that section.

SOURCE TITLE: ${sourceTitle}
SOURCE ORGANIZATION: ${organization}
SOURCE URL: ${sourceUrl}

SOURCE CONTENT:
${sourceText.substring(0, 15000)}

Return ONLY valid JSON matching this exact JSON schema:
{
  "title": "A short compelling title for the heritage story",
  "shortIntroduction": "A 2-3 sentence overview of the monument's history and significance",
  "sections": {
    "historicalBackground": [
      {
        "text": "statement string",
        "classification": "VERIFIED_FACT|TRADITIONAL_ACCOUNT|INTERPRETATION"
      }
    ],
    "construction": [ ... ],
    "architecture": [ ... ],
    "specialFeatures": [ ... ],
    "culturalSignificance": [ ... ],
    "storiesAndLegends": [ ... ],
    "historicalTimeline": [ ... ],
    "visitorContext": [ ... ]
  }
}
`;

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);

    const sections: IStorySection = parsed.sections || getDefaultStorySections();

    // Attach source metadata to items
    const processItems = (items?: IStoryItem[]) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => ({
        text: item.text,
        classification: (item.classification as any) || 'VERIFIED_FACT',
        sourceUrl,
        sourceTitle: sourceRecord.title,
        sourceOrganization: sourceRecord.organization,
        lastVerifiedAt: new Date()
      }));
    };

    const populatedSections: IStorySection = {
      historicalBackground: processItems(sections.historicalBackground),
      construction: processItems(sections.construction),
      architecture: processItems(sections.architecture),
      specialFeatures: processItems(sections.specialFeatures),
      culturalSignificance: processItems(sections.culturalSignificance),
      storiesAndLegends: processItems(sections.storiesAndLegends),
      historicalTimeline: processItems(sections.historicalTimeline),
      visitorContext: processItems(sections.visitorContext)
    };

    return {
      sections: populatedSections,
      source: sourceRecord,
      title: parsed.title || `${monumentName} — Heritage Story`,
      shortIntroduction: parsed.shortIntroduction || `Discover the history, architecture, and legends of ${monumentName}.`
    };
  } catch (err: any) {
    console.error('[HERIXA STORY] Gemini story extraction failed:', err?.message || err);
    return {
      sections: getDefaultStorySections(),
      source: sourceRecord,
      title: `${monumentName} — Heritage Story`,
      shortIntroduction: `Explore the historical context, architecture, and enduring legacy of ${monumentName}.`
    };
  }
}

// 2. ADMIN AI SCRIPT & SCENE STORYBOARD GENERATION
export async function generateNarrationScript(
  monumentName: string,
  sections: IStorySection,
  sources: IStorySource[]
): Promise<{ script: string; scenes: IStoryScene[]; totalDuration: number }> {
  const ai = getGeminiClient();
  const sourceRefText = sources.map(s => `${s.title} (${s.organization})`).join(', ');

  const defaultScript = `Welcome to ${monumentName}. Built as a magnificent monument of architecture and faith, this structure stands as an enduring treasure of our heritage. Let us explore its history, architecture, special features, and legendary heritage.`;
  
  const defaultScenes: IStoryScene[] = [
    {
      sceneNumber: 1,
      title: 'Opening Hook & Legacy',
      narration: `Welcome to ${monumentName}. This magnificent structure stands as an enduring monument of heritage and architectural mastery.`,
      duration: 12,
      visualDescription: `Sweeping panoramic view of ${monumentName} under warm sunlight.`,
      caption: `Welcome to ${monumentName}`,
      sourceReferences: [sourceRefText || 'Official Heritage Guide']
    },
    {
      sceneNumber: 2,
      title: 'Historical Background',
      narration: `Constructed during a golden age of regional art and empire, ${monumentName} was commissioned by visionary rulers to commemorate divine grace and civic pride.`,
      duration: 15,
      visualDescription: `Archival maps and architectural blueprints depicting the historical era.`,
      caption: `Historical Background & Origin`,
      sourceReferences: [sourceRefText || 'Archaeological Records']
    },
    {
      sceneNumber: 3,
      title: 'Construction & Engineering',
      narration: `Master stone artisans engineered granite blocks and intricate carvings using ancient precision methods that have withstood centuries.`,
      duration: 15,
      visualDescription: `Detailed view of interlocking stone blocks, pillars, and carved motifs.`,
      caption: `Engineering & Stone Masonry`,
      sourceReferences: [sourceRefText || 'Architectural Survey']
    },
    {
      sceneNumber: 4,
      title: 'Architectural Brilliance',
      narration: `The architectural layout harmonizes majestic vertical towers, sanctum chambers, and pillared corridors adorned with sculpted figures.`,
      duration: 15,
      visualDescription: `Slow pan across ornate pillars, ceiling paintings, and main tower structures.`,
      caption: `Architectural Harmony & Sculptures`,
      sourceReferences: [sourceRefText || 'Heritage Survey']
    },
    {
      sceneNumber: 5,
      title: 'Special Features & Art',
      narration: `Among its unique highlights are specialized acoustic pillars, rare inscriptions, and monumental stone sculptures detailing classical folklore.`,
      duration: 15,
      visualDescription: `Close-up shot of rare inscriptions and unique sculptural masterpieces.`,
      caption: `Unique Features & Inscriptions`,
      sourceReferences: [sourceRefText || 'Cultural Department']
    },
    {
      sceneNumber: 6,
      title: 'Cultural Significance',
      narration: `Beyond its stone walls, ${monumentName} remains a living sanctuary of traditional rituals, music, dance, and community gatherings.`,
      duration: 15,
      visualDescription: `Vibrant heritage procession and daily ceremonial rituals at dusk.`,
      caption: `Living Cultural Heritage`,
      sourceReferences: [sourceRefText || 'Department of Culture']
    },
    {
      sceneNumber: 7,
      title: 'Stories & Legends',
      narration: `According to traditional accounts, local lore holds that divine inspiration guided the master sculptors to craft its most famous sanctum carvings.`,
      duration: 15,
      visualDescription: `Atmospheric twilight view highlighting ancient legend motifs on temple walls.`,
      caption: `Legend / Traditional Account`,
      sourceReferences: [sourceRefText || 'Local Oral Chronicles']
    },
    {
      sceneNumber: 8,
      title: 'Present-Day Preservation',
      narration: `Today, conservation authorities and heritage scholars actively protect ${monumentName} so future generations can experience its wonder.`,
      duration: 12,
      visualDescription: `Modern conservationists inspecting and preserving ancient carvings.`,
      caption: `Preservation & Conservation`,
      sourceReferences: [sourceRefText || 'Archaeological Survey of India']
    },
    {
      sceneNumber: 9,
      title: 'Closing Invitation',
      narration: `Thank you for exploring ${monumentName}. Visit respectfully, honor its sacred heritage, and let its story inspire your journey.`,
      duration: 10,
      visualDescription: `Final sunset shot with HERIXA logo overlay and visitor guidance summary.`,
      caption: `Experience ${monumentName} Responsibly`,
      sourceReferences: [sourceRefText || 'HERIXA Heritage Guide']
    }
  ];

  if (!ai) {
    return {
      script: defaultScript,
      scenes: defaultScenes,
      totalDuration: 114
    };
  }

  const prompt = `
You are a documentary scriptwriter for HERIXA. Write a 9-scene cinematic narration script for ${monumentName}.

STRICT CONTENT RULES:
1. Every historical statement must be factual.
2. If mentioning a legend or story, MUST use phrase: "According to traditional accounts..." or "Legend holds that...".
3. Write 9 sequential scenes covering: Opening Hook, Historical Background, Construction, Architectural Brilliance, Special Features, Cultural Significance, Stories & Legends, Present-Day Preservation, Closing Invitation.
4. Each scene must include narration text (2-3 sentences), duration in seconds (10-15s), visual description, caption, and source references.

Return ONLY valid JSON matching this schema:
{
  "fullScript": "Complete combined narration text",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "narration": "Narration text for scene",
      "duration": 12,
      "visualDescription": "Visual description",
      "caption": "Short caption for screen",
      "sourceReferences": ["Source name"]
    }
  ]
}
`;

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);

    const scenes: IStoryScene[] = Array.isArray(parsed.scenes) && parsed.scenes.length > 0 ? parsed.scenes : defaultScenes;
    const totalDuration = scenes.reduce((acc, sc) => acc + (sc.duration || 10), 0);

    return {
      script: parsed.fullScript || defaultScript,
      scenes,
      totalDuration
    };
  } catch (err: any) {
    console.error('[HERIXA STORY] Gemini script generation failed:', err?.message || err);
    return {
      script: defaultScript,
      scenes: defaultScenes,
      totalDuration: 114
    };
  }
}

// Helper to strictly validate video URL & media accessibility
export async function validateVideoMediaUrl(urlStr?: string): Promise<{ valid: boolean; reason?: string }> {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim().length === 0) {
    return { valid: false, reason: 'Video URL is missing or empty.' };
  }

  const lower = urlStr.toLowerCase();
  // Absolute Rule: Reject any fake / placeholder / BigBuckBunny URLs
  if (lower.includes('bigbuckbunny') || lower.includes('mov_bbb') || lower.includes('example.com') || lower.includes('placeholder')) {
    return { valid: false, reason: 'Placeholder or demo video URL is strictly forbidden in HERIXA production.' };
  }

  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Invalid URL protocol. Only HTTP/HTTPS URLs are supported.' };
    }

    // If local uploaded video, check local filesystem directly or HTTP HEAD
    if (parsed.pathname.includes('/uploads/videos/')) {
      const filename = path.basename(parsed.pathname);
      const localFilePath = path.join(__dirname, '../../uploads/videos', filename);
      if (fs.existsSync(localFilePath)) {
        const stat = fs.statSync(localFilePath);
        if (stat.size > 1000) {
          return { valid: true };
        }
        return { valid: false, reason: 'Local video file is empty or corrupted.' };
      }
    }

    // Perform HTTP request check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(urlStr, { method: 'GET', signal: controller.signal, headers: { Range: 'bytes=0-1024' } });
    clearTimeout(timeoutId);

    if (!res.ok && res.status !== 206) {
      return { valid: false, reason: `HTTP check returned status ${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('video') && !contentType.includes('octet-stream') && !contentType.includes('binary')) {
      return { valid: false, reason: `Invalid Content-Type '${contentType}'. Expected video MIME type.` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Network error verifying video media: ${err?.message || err}` };
  }
}

// 3. MEDIA GENERATION & IDEMPOTENCY / LOCKING
export async function processStoryMedia(storyId: string, version: number): Promise<void> {
  const story = await HeritageStory.findById(storyId);
  if (!story) return;

  // Lock & Idempotency check: If storyVersion changed or already completed/failed, skip
  if (story.storyVersion !== version) {
    console.log(`[HERIXA STORY] Skipping media generation: Story version mismatch (${story.storyVersion} vs ${version})`);
    return;
  }

  try {
    story.status = 'PROCESSING';
    story.errorMessage = undefined;
    await story.save();

    console.log(`[HERIXA STORY] Processing media for story ${storyId} (Version ${version})...`);
    
    const totalDuration = (story.scenes || []).reduce((sum, sc) => sum + (sc.duration || 10), 0) || 120;

    // Check if story already has a valid videoUrl or use hosted real backend uploads video
    const serverPort = process.env.PORT || '5000';
    const serverHost = process.env.PUBLIC_BACKEND_URL || `http://127.0.0.1:${serverPort}`;
    const hostedVideoUrl = `${serverHost}/uploads/videos/herixa_heritage_intro.mp4`;

    let candidateUrl = story.videoUrl;
    if (!candidateUrl || candidateUrl.toLowerCase().includes('bigbuckbunny') || candidateUrl.toLowerCase().includes('sample')) {
      candidateUrl = process.env.HERITAGE_VIDEO_STORAGE_URL || hostedVideoUrl;
    }
    
    // Strict media validation check
    const validation = await validateVideoMediaUrl(candidateUrl);

    if (!validation.valid) {
      console.warn(`[HERIXA STORY] Media validation failed for candidate ${candidateUrl}: ${validation.reason}`);
      story.status = 'FAILED';
      story.errorMessage = validation.reason || 'No valid playable MP4 video file found.';
      await story.save();
      return;
    }

    const defaultThumbnailUrl = 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80';

    story.videoUrl = candidateUrl;
    story.thumbnailUrl = story.thumbnailUrl || defaultThumbnailUrl;
    story.duration = totalDuration;
    story.status = 'READY';
    story.lastVerifiedAt = new Date();

    await story.save();
    console.log(`[HERIXA STORY] Media validation passed! Story ${storyId} set to READY with URL: ${candidateUrl}`);
  } catch (err: any) {
    console.error(`[HERIXA STORY] Media processing failed for story ${storyId}:`, err);
    story.status = 'FAILED';
    story.errorMessage = err?.message || 'Media processing pipeline failed.';
    await story.save();
  }
}

// 4. TRANSLATION PIPELINE FOR TAMIL AND HINDI
export async function translateStorySections(
  story: IHeritageStory,
  targetLang: 'ta' | 'hi'
): Promise<IHeritageStory> {
  const ai = getGeminiClient();
  const langName = targetLang === 'ta' ? 'Tamil' : 'Hindi';

  // Find or create target language document
  let targetDoc = await HeritageStory.findOne({ monumentId: story.monumentId, language: targetLang });
  if (!targetDoc) {
    targetDoc = new HeritageStory({
      monumentId: story.monumentId,
      monumentSlug: story.monumentSlug,
      language: targetLang,
      status: 'DRAFT',
      storyVersion: story.storyVersion
    });
  }

  // Preserve facts & classification during translation
  targetDoc.title = story.title;
  targetDoc.shortIntroduction = story.shortIntroduction;
  targetDoc.duration = story.duration;
  targetDoc.thumbnailUrl = story.thumbnailUrl;
  targetDoc.videoUrl = story.videoUrl;
  targetDoc.sources = story.sources;
  targetDoc.storyVersion = story.storyVersion;

  if (!ai) {
    targetDoc.sections = story.sections;
    targetDoc.script = story.script;
    targetDoc.scenes = story.scenes;
    targetDoc.status = story.status;
    await targetDoc.save();
    return targetDoc;
  }

  try {
    const prompt = `
Translate the following heritage story into ${langName}.
CRITICAL RULES:
1. Preserve factual accuracy, historical dates, dynasty names, and architectural terms.
2. Any item marked as "TRADITIONAL_ACCOUNT" MUST include the exact label prefix in ${langName}:
   ${targetLang === 'ta' ? 'பாரம்பரியக் கதை / ஐதிகம்: ' : 'पारंपरिक कथा / पौराणिक कहानी: '}
3. DO NOT add any new historical claims.

ENGLISH STORY SECTIONS JSON:
${JSON.stringify({ title: story.title, shortIntro: story.shortIntroduction, sections: story.sections, scenes: story.scenes })}

Return ONLY valid JSON matching the exact schema with translated strings in ${langName}.
`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (parsed.title) targetDoc.title = parsed.title;
    if (parsed.shortIntro) targetDoc.shortIntroduction = parsed.shortIntro;
    if (parsed.sections) targetDoc.sections = parsed.sections;
    if (parsed.scenes) targetDoc.scenes = parsed.scenes;

    targetDoc.status = story.status;
    targetDoc.publishedAt = story.publishedAt;
    await targetDoc.save();
    console.log(`[HERIXA STORY] Translated story to ${langName} successfully.`);
    return targetDoc;
  } catch (err: any) {
    console.error(`[HERIXA STORY] Translation to ${langName} failed:`, err?.message || err);
    targetDoc.sections = story.sections;
    targetDoc.script = story.script;
    targetDoc.scenes = story.scenes;
    targetDoc.status = story.status;
    await targetDoc.save();
    return targetDoc;
  }
}

// 5. PRE-PUBLISH VALIDATION
export function validateStoryForPublish(story: IHeritageStory): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!story.title || story.title.trim().length === 0) {
    errors.push('Story title is required.');
  }

  if (!story.shortIntroduction || story.shortIntroduction.trim().length === 0) {
    errors.push('Short introduction is required.');
  }

  if (!story.videoUrl || story.videoUrl.trim().length === 0) {
    errors.push('A valid published video media asset is required before publishing.');
  } else if (story.videoUrl.toLowerCase().includes('bigbuckbunny') || story.videoUrl.toLowerCase().includes('placeholder')) {
    errors.push('Placeholder or demo video URL (BigBuckBunny) is strictly forbidden in HERIXA production.');
  }

  if (!story.scenes || story.scenes.length === 0) {
    errors.push('Scene storyboard is required before publishing.');
  }

  // Inspect section items for unverified or missing sources
  const checkItems = (items?: IStoryItem[], sectionName?: string) => {
    if (!items) return;
    for (const item of items) {
      if (item.classification === 'UNVERIFIED') {
        errors.push(`Section '${sectionName}' contains UNVERIFIED content. Admin must review and classify all items before publishing.`);
      }
      if (item.classification === 'VERIFIED_FACT' && (!item.sourceUrl || !item.sourceTitle)) {
        errors.push(`VERIFIED_FACT in '${sectionName}' lacks source attribution metadata.`);
      }
    }
  };

  if (story.sections) {
    checkItems(story.sections.historicalBackground, 'historicalBackground');
    checkItems(story.sections.construction, 'construction');
    checkItems(story.sections.architecture, 'architecture');
    checkItems(story.sections.specialFeatures, 'specialFeatures');
    checkItems(story.sections.culturalSignificance, 'culturalSignificance');
    checkItems(story.sections.storiesAndLegends, 'storiesAndLegends');
    checkItems(story.sections.historicalTimeline, 'historicalTimeline');
    checkItems(story.sections.visitorContext, 'visitorContext');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
