import { GoogleGenAI } from '@google/genai';
import { IProtocolItem, IProtocolSections, IProtocolSource } from '../models/HeritageProtocol';
import { Types } from 'mongoose';

// SSRF prevention: Validate URL host
function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    // Prevent internal / private IP / localhost access
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Fetch source content safely
export async function fetchSourceContent(url: string): Promise<{ text: string; title: string; organization: string }> {
  if (!isSafeUrl(url)) {
    throw new Error('Invalid or unsupported URL. Only public HTTP/HTTPS URLs are allowed.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HERIXA-Heritage-Bot/1.0 (+https://herixa.org)'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Source returned HTTP status ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
      throw new Error('Source returned unsupported content type. Only HTML or plain text pages are supported.');
    }

    const rawText = await res.text();
    if (rawText.length > 2 * 1024 * 1024) {
      throw new Error('Source page size exceeds maximum limit of 2MB.');
    }

    // Basic HTML tag stripping
    let cleanText = rawText
      .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract title if available
    const titleMatch = rawText.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
    const organization = new URL(url).hostname.replace(/^www\./, '');

    return {
      text: cleanText.substring(0, 15000), // Cap text sent to LLM at 15k chars
      title,
      organization
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Timeout: Source URL took too long to respond (12s limit).');
    }
    throw err;
  }
}

// Generate default general guidance protocol items
export function getDefaultProtocolSections(monumentName: string): IProtocolSections {
  return {
    beforeVisit: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Check current visiting hours, entry fees, and weather conditions prior to arrival.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    entryGuidelines: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Obtain required entry tickets or tokens at designated counters before entering.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    dressGuidance: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Modest and respectful attire covering shoulders and knees is appropriate when visiting cultural and sacred heritage sites.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    traditionalPractices: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Remove shoes and footwear at designated shoe counters where indicated near active sanctums or inner halls.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    photography: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Look for posted signs regarding camera or mobile phone restrictions in specific interior or sacred areas.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    dos: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Follow posted notices and directions provided by site authorities and heritage security staff.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      },
      {
        id: new Types.ObjectId().toString(),
        text: 'Maintain peaceful decorum and keep noise levels low in reverence of historic monuments.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    donts: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Do not touch, carve, or deface ancient stone carvings, murals, or inscriptions.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      },
      {
        id: new Types.ObjectId().toString(),
        text: 'Littering is strictly prohibited; dispose of trash in designated waste containers.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    respectfulBehaviour: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Respect local visitors and devotees participating in traditional practices or cultural events.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    accessibility: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Ancient stone steps and raised thresholds exist across historic corridors; exercise caution while navigating levels.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    restrictions: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Flammable materials, plastics, or unauthorized equipment may be prohibited past security checkpoints.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ],
    visitorNotes: [
      {
        id: new Types.ObjectId().toString(),
        text: 'Heritage rules and visiting guidelines may be modified by site authorities. Please observe instructions posted on site.',
        classification: 'GENERAL_GUIDANCE',
        lastVerifiedAt: new Date()
      }
    ]
  };
}

// Extract protocol using Gemini
export async function extractProtocolFromSource(
  monumentName: string,
  sourceUrl: string,
  sourceTitle: string,
  sourceOrganization: string,
  sourceText: string
): Promise<IProtocolSections> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Protocol AI] Gemini API key not found. Returning default general guidance template.');
    return getDefaultProtocolSections(monumentName);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert heritage compliance officer and researcher for HERIXA.
Your task is to analyze text extracted from an official or trusted website for the monument "${monumentName}" and produce a JSON object containing visitor protocol guidelines.

SOURCE METADATA:
URL: ${sourceUrl}
Title: ${sourceTitle}
Organization: ${sourceOrganization}

SOURCE CONTENT:
"""
${sourceText}
"""

CRITICAL AUDIT CONSTRAINTS:
1. DO NOT INVENT temple-specific rules, dress codes, opening times, or photography bans not present or supported by the text.
2. If a rule is explicitly supported by the text, set classification to "VERIFIED", and set sourceUrl, sourceTitle, sourceOrganization, and referenceSnippet.
3. If a statement is a universal general visitor etiquette item (e.g. "Maintain cleanliness"), set classification to "GENERAL_GUIDANCE".
4. DO NOT include empty or unverified claims.

OUTPUT FORMAT (Respond with STRICT JSON ONLY, no markdown backticks, no code block wrapping):
{
  "beforeVisit": [
    { "text": "...", "classification": "VERIFIED|GENERAL_GUIDANCE", "sourceUrl": "${sourceUrl}", "sourceTitle": "${sourceTitle}", "sourceOrganization": "${sourceOrganization}", "referenceSnippet": "..." }
  ],
  "entryGuidelines": [],
  "dressGuidance": [],
  "traditionalPractices": [],
  "photography": [],
  "dos": [],
  "donts": [],
  "respectfulBehaviour": [],
  "accessibility": [],
  "restrictions": [],
  "visitorNotes": []
}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawJson = response.text || '';
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[Protocol AI] Failed to parse Gemini JSON output:', cleanJson);
      return getDefaultProtocolSections(monumentName);
    }

    const categories: (keyof IProtocolSections)[] = [
      'beforeVisit', 'entryGuidelines', 'dressGuidance', 'traditionalPractices',
      'photography', 'dos', 'donts', 'respectfulBehaviour', 'accessibility',
      'restrictions', 'visitorNotes'
    ];

    const result: IProtocolSections = getDefaultProtocolSections(monumentName);

    for (const cat of categories) {
      if (Array.isArray(parsed[cat]) && parsed[cat].length > 0) {
        const items: IProtocolItem[] = parsed[cat].map((item: any) => ({
          id: new Types.ObjectId().toString(),
          text: String(item.text || '').trim(),
          classification: (item.classification === 'VERIFIED' ? 'VERIFIED' : 'GENERAL_GUIDANCE') as any,
          sourceUrl: item.classification === 'VERIFIED' ? sourceUrl : undefined,
          sourceTitle: item.classification === 'VERIFIED' ? sourceTitle : undefined,
          sourceOrganization: item.classification === 'VERIFIED' ? sourceOrganization : undefined,
          referenceSnippet: item.referenceSnippet ? String(item.referenceSnippet).substring(0, 300) : undefined,
          lastVerifiedAt: new Date()
        })).filter((i: IProtocolItem) => i.text.length > 0);

        if (items.length > 0) {
          result[cat] = items;
        }
      }
    }

    return result;
  } catch (err: any) {
    console.error('[Protocol AI] Gemini extraction error:', err.message || err);
    return getDefaultProtocolSections(monumentName);
  }
}

// Translate protocol sections to Tamil or Hindi
export async function translateProtocolSections(
  sections: IProtocolSections,
  targetLang: 'ta' | 'hi'
): Promise<IProtocolSections> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sections;

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const ai = new GoogleGenAI({ apiKey });

  const targetLangName = targetLang === 'ta' ? 'Tamil' : 'Hindi';
  const prompt = `You are a professional translator for heritage visitor guidelines.
Translate the text of the following JSON protocol structure into ${targetLangName}.
CRITICAL REQUIREMENT:
- DO NOT add new facts or modify the meaning of any rule.
- Keep the exact JSON structure and all non-text keys (id, classification, sourceUrl, sourceTitle, sourceOrganization, lastVerifiedAt) intact.
- Translate only the "text" string in each item.

JSON INPUT:
${JSON.stringify(sections, null, 2)}

OUTPUT FORMAT (STRICT JSON ONLY):`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawJson = response.text || '';
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return parsed as IProtocolSections;
  } catch (err) {
    console.error(`[Protocol AI] Failed to translate protocol to ${targetLang}:`, err);
    return sections; // Fallback to original
  }
}
