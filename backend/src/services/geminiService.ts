import { GoogleGenAI } from '@google/genai';
import { IMonument } from '../models/monument';
import dotenv from 'dotenv';
import path from 'path';
import { ASSISTANT_RESPONSE_TIMEOUT } from '../config/aiConfig';
import { withAIRetry } from '../utils/aiRetry';

interface GenerateOptions {
  monument: IMonument;
  question: string;
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  explainSimply: boolean;
  history?: { role: 'user' | 'model'; text: string }[];
}

const handleGeminiError = (err: any): Error => {
  const errMsg = err?.message || '';
  const errStatus = err?.status || err?.statusCode || '';
  const errCode = err?.code || '';
  
  const errStr = `${errMsg} ${errStatus} ${errCode}`.toLowerCase();
  
  console.log(`[HERIXA AI] Error status: ${errStatus || 'unknown'}, code: ${errCode || 'unknown'}`);
  
  // Clean safe details for logging
  const safeDetails = errMsg.replace(/AQ\.[A-Za-z0-9_\-]+/g, 'REDACTED_API_KEY');
  console.log(`[HERIXA AI] Error details: ${safeDetails}`);

  if (errStatus === 429 || errStr.includes('429') || errStr.includes('resource_exhausted')) {
    let subCategory = 'temporary service limit';
    if (errStr.includes('quota') || errStr.includes('limit:') || errStr.includes('exhausted') || errStr.includes('per day')) {
      subCategory = 'quota exceeded';
    } else if (errStr.includes('rate limit') || errStr.includes('requests per minute') || errStr.includes('requests per second')) {
      subCategory = 'rate limit';
    } else if (errStr.includes('billing') || errStr.includes('account') || errStr.includes('blocked') || errStr.includes('payment')) {
      subCategory = 'billing/account restriction';
    } else if (errStr.includes('size') || errStr.includes('input') || errStr.includes('too large') || errStr.includes('limit')) {
      subCategory = 'request size/input limit';
    } else if (errStr.includes('model') || errStr.includes('available')) {
      subCategory = 'model-specific availability';
    } else if (errStr.includes('config') || errStr.includes('key')) {
      subCategory = 'invalid API configuration';
    }
    console.log(`[HERIXA AI] HTTP 429 detected: ${subCategory}`);
  }

  if (
    errStr.includes('401') || 
    errStr.includes('unauthenticated') || 
    errStr.includes('credentials') || 
    errStr.includes('api key') ||
    errStr.includes('key is invalid')
  ) {
    return new Error('Gemini authentication failed. Please check the Gemini API configuration.');
  }
  
  if (
    errStr.includes('429') || 
    errStr.includes('quota') || 
    errStr.includes('exhausted') || 
    errStr.includes('rate limit')
  ) {
    return new Error('Gemini API rate limit reached.');
  }
  
  if (
    errStr.includes('enotfound') || 
    errStr.includes('econnrefused') || 
    errStr.includes('fetch failed') ||
    errStr.includes('network') ||
    errStr.includes('connect')
  ) {
    return new Error('Unable to connect to Gemini service.');
  }
  
  return err instanceof Error ? err : new Error(String(err));
};

export const generateGroundedResponse = async (
  options: GenerateOptions
): Promise<string> => {
  dotenv.config({ path: path.join(__dirname, '../../.env') });

  const apiKey = process.env.GEMINI_API_KEY;
  console.log('[AR DEBUG] Gemini API key configured:', !!apiKey);

  if (!apiKey) {
    throw new Error('Gemini GenAI SDK is not initialized (missing API key)');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      timeout: ASSISTANT_RESPONSE_TIMEOUT
    }
  });
  const { monument, question, language, explainSimply, history } = options;
  
  console.log('[AI DEBUG] Assistant request received');
  console.log('[AI DEBUG] Monument context loaded: ' + monument.name);
  console.log('[AI DEBUG] Language: ' + language);
  console.log('[AI DEBUG] Explain simply: ' + explainSimply);

  const monumentContext = `
MONUMENT REFERENCE CONTEXT:
Name: ${monument.name}
Slug: ${monument.slug}
Location: ${monument.location}, ${monument.state}, ${monument.country || 'India'}
Category: ${monument.category}
Construction Period: ${monument.period}
Dynasty: ${monument.dynasty}
Description: ${monument.description}
Historical Background: ${monument.historicalBackground || ''}
Historical Significance: ${monument.historicalSignificance || ''}
Architecture Details: ${monument.architecture || ''}
Architectural Style: ${monument.architecturalStyle || ''}
Full History: ${monument.fullHistory || ''}
Cultural Significance: ${monument.culturalSignificance || ''}
Cultural Importance: ${monument.culturalImportance || ''}
Religious Importance: ${monument.religiousImportance || ''}
Restoration History: ${monument.restorationHistory || ''}
Preservation Status: ${monument.preservationStatus || ''}
Rulers/Patrons: ${(monument.rulers || []).join(', ')}
Materials Used: ${(monument.materialsUsed || []).join(', ')}
Inscriptions: ${(monument.inscriptions || []).join(', ')}
Nearby Places: ${(monument.nearbyPlaces || []).join(', ')}
Visiting Information: ${monument.visitingInformation || ''}
Opening Hours: ${monument.openingHours || ''}
Best Time To Visit: ${monument.bestTimeToVisit || ''}
Entry Fee: ${monument.entryFee || ''}

Basic Information:
- District: ${monument.district || ''}
- Coordinates: ${monument.coordinates ? `Latitude: ${monument.coordinates.latitude}, Longitude: ${monument.coordinates.longitude}` : ''}
- Monument Type: ${monument.monumentType || ''}
- Historical Period: ${monument.historicalPeriod || ''}
- Construction Year: ${monument.constructionYear || ''}
- Construction Period: ${monument.constructionPeriod || ''}
- Ruler/King: ${monument.ruler || ''}
- Builder: ${monument.builder || ''}
- Architect: ${monument.architect || ''}
- Alternative Names: ${(monument.alternativeNames || []).join(', ')}
- Local Names: ${(monument.localNames || []).join(', ')}
- Historical Names: ${(monument.historicalNames || []).join(', ')}

History:
- Short History: ${monument.shortHistory || ''}
- Origin Story: ${monument.originStory || ''}
- Construction History: ${monument.constructionHistory || ''}
- Important Rulers: ${(monument.importantRulers || []).join(', ')}
- Dynasty History: ${monument.dynastyHistory || ''}
- Origin: ${monument.origin || ''}
- Original Purpose: ${monument.originalPurpose || ''}
- Why It Was Built: ${monument.whyItWasBuilt || ''}
- Historical Development: ${monument.historicalDevelopment || ''}
- Historical Changes: ${monument.historicalChanges || ''}
- Historical Personalities: ${(monument.historicalPersonalities || []).join(', ')}
- Timeline Events:
${(monument.historicalTimeline || []).map((evt) => `- ${evt.year}: ${evt.title} - ${evt.description} (Significance: ${evt.significance || 'N/A'})`).join('\n')}
- Structured Historical Events:
${(monument.historicalEvents || []).map((evt) => `- ${evt.period}: ${evt.title} - ${evt.description}`).join('\n')}

Architecture & Structure:
- Building Materials: ${monument.buildingMaterials || ''}
- Structural Features: ${monument.structuralFeatures || ''}
- Vimana Details: ${monument.vimanaDetails || ''}
- Gopuram Details: ${monument.gopuramDetails || ''}
- Mandapa Details: ${monument.mandapaDetails || ''}
- Sculpture Details: ${monument.sculptureDetails || ''}
- Pillar Details: ${monument.pillarDetails || ''}
- Ceiling Details: ${monument.ceilingDetails || ''}
- Inscription Details: ${monument.inscriptionDetails || ''}
- Engineering Features: ${monument.engineeringFeatures || ''}
- Architecture Description: ${monument.architectureDescription || ''}
- Layout: ${monument.layout || ''}
- Entrance: ${monument.entrance || ''}
- Gopuram: ${monument.gopuram || ''}
- Vimana: ${monument.vimana || ''}
- Mandapa: ${monument.mandapa || ''}
- Pillars: ${monument.pillars || ''}
- Sculptures: ${monument.sculptures || ''}
- Materials: ${monument.materials || ''}
- Unique Architectural Features: ${monument.uniqueArchitecturalFeatures || ''}

Cultural & Religious Importance:
- Social Importance: ${monument.socialImportance || ''}
- Artistic Importance: ${monument.artisticImportance || ''}
- Cultural Practices: ${monument.culturalPractices || ''}
- Traditional Practices: ${monument.traditionalPractices || ''}
- Festivals: ${(monument.festivals || []).join(', ')}
- Rituals: ${(monument.rituals || []).join(', ')}

Legends & Mythology:
- Legends: ${(monument.legends || []).join('\n')}
- Mythology: ${monument.mythology || ''}
- Local Stories: ${(monument.localStories || []).join('\n')}
- Interesting Stories: ${(monument.interestingStories || []).join('\n')}
- Mythological Stories: ${(monument.mythologicalStories || []).join('\n')}
- Local Traditions: ${(monument.localTraditions || []).join('\n')}

Preservation & Restoration:
- Preservation History: ${monument.preservationHistory || ''}
- Restoration History: ${monument.restorationHistory || ''}
- Damage History: ${monument.damageHistory || ''}
- Conservation Efforts: ${monument.conservationEfforts || ''}
- Current Condition: ${monument.currentCondition || ''}
- Conservation Authority: ${monument.conservationAuthority || ''}

Heritage Recognition:
- Heritage Status: ${monument.heritageStatus || ''}
- UNESCO Status: ${monument.unescoStatus || ''}
- UNESCO Year: ${monument.unescoYear || ''}
- Heritage Recognition Details: ${monument.heritageRecognition || ''}
- Protected Status: ${monument.protectedStatus || ''}

Visitor Information:
- Dress Code: ${monument.dressCode || ''}
- Visitor Guidelines: ${monument.visitorGuidelines || ''}
- How To Reach: ${monument.howToReach || ''}
- Visiting Information: ${monument.visitingInformation || ''}
- Opening Hours: ${monument.openingHours || ''}
- Best Time to Visit: ${monument.bestTimeToVisit || ''}
- Entry Fee: ${monument.entryFee || ''}
- Nearby Places: ${(monument.nearbyPlaces || []).join(', ')}
- Opening Information: ${monument.openingInformation || ''}
- Dress Guidelines: ${monument.dressGuidelines || ''}
- Photography Rules: ${monument.photographyRules || ''}
- Accessibility Guidelines: ${monument.accessibility || ''}

Educational Facts:
- Did You Know: ${(monument.didYouKnow || []).join('\n')}
- Important Facts: ${(monument.importantFacts || []).join('\n')}
- Quiz Topics: ${(monument.quizTopics || []).join(', ')}
- Architectural Highlights: ${(monument.architecturalHighlights || []).join('\n')}
- Historical Highlights: ${(monument.historicalHighlights || []).join('\n')}

History Sections (Custom Admin-Created):
${(monument.historySections || []).map((sec: any) => `- Section [${sec.id || ''}] "${sec.title}" (Order: ${sec.order}):\n  ${sec.content}`).join('\n')}

3D Model URL Status: UNAVAILABLE

Available Gallery Photographs/Images:
- Historical/Archival Photos:
${(monument.historicalImages || []).map((img: any) => `  * "${img.title || 'Untitled'}" (${img.year || 'Unknown year'}) [${img.verificationStatus || 'unverified'}] - Description: ${img.description || 'N/A'}`).join('\n') || '  None'}
- Modern Photos:
${(monument.modernImages || []).map((img: any) => `  * "${img.title || 'Untitled'}" (${img.year || 'Unknown year'}) [${img.verificationStatus || 'unverified'}] - Description: ${img.description || 'N/A'}`).join('\n') || '  None'}
- Architecture Photos:
${(monument.architectureImages || []).map((img: any) => `  * "${img.title || 'Untitled'}" (${img.year || 'Unknown year'}) [${img.verificationStatus || 'unverified'}] - Description: ${img.description || 'N/A'}`).join('\n') || '  None'}
- Restoration Photos:
${(monument.restorationImages || []).map((img: any) => `  * "${img.title || 'Untitled'}" (${img.year || 'Unknown year'}) [${img.verificationStatus || 'unverified'}] - Description: ${img.description || 'N/A'}`).join('\n') || '  None'}
- Sculpture Photos:
${(monument.sculptureImages || []).map((img: any) => `  * "${img.title || 'Untitled'}" (${img.year || 'Unknown year'}) [${img.verificationStatus || 'unverified'}] - Description: ${img.description || 'N/A'}`).join('\n') || '  None'}
- Inscription Photos:
${(monument.inscriptionImages || []).map((img: any) => `  * "${img.title || 'Untitled'}" (${img.year || 'Unknown year'}) [${img.verificationStatus || 'unverified'}] - Description: ${img.description || 'N/A'}`).join('\n') || '  None'}
`;

  // Check if this is a "Full History" query
  const query = question.toLowerCase();
  const isFullHistoryQuery = /full history|complete history|entire history|everything about|history in detail|detailed history|முழு வரலாறு|முழு வரலாற்றையும்|கோவிலின் வரலாறு|விரிவாக சொல்லு|எல்லாவற்றையும் சொல்லு|पूरा इतिहास|पूर्ण इतिहास|विस्तृत इतिहास|इतिहास विस्तार से/i.test(query);

  let systemInstruction = `You are the HERIXA cultural heritage assistant, an educational cultural heritage guide.
Answer questions about the provided monument using the supplied monument context as the primary factual source.
Use all available fields in the context, including basic info, full history, history sections, timeline events, architectural details, legends, preservation, and visitor guidelines.

Do not invent or fabricate facts, dates, rulers, dynasties, architectural details, historical events, locations, construction information, AR recognition results, or 3D models.
If the requested information is not present in the supplied monument context, clearly state: "Information about this topic is currently unavailable in the HeritageAR knowledge base." or equivalent instead of fabricating or inventing facts.

Explain to the user that 3D monument models are currently unavailable in HERIXA.

The user may ask questions in English, Tamil, Hindi, Telugu, Malayalam, or Kannada. Respond entirely in the selected language (detecting the language of the question, or if specifically requested):
- For English: Provide clear, natural English.
- For Tamil (ta): Respond in proper, natural, and grammatically correct Tamil using Tamil Unicode. Do NOT use Tanglish or transliterated English characters. Make the text flow naturally for Tamil Text-to-Speech (TTS). Preserve names, dates, dynasties, and locations accurately.
- For Hindi (hi): Respond in proper, natural, and grammatically correct Hindi using Hindi Devanagari Unicode. Do NOT write Hindi using English letters (Hinglish). Make the text flow naturally for Hindi Text-to-Speech (TTS). Preserve names, dates, and locations accurately.
- For Telugu (te): Respond in proper, natural, and grammatically correct Telugu using Telugu Unicode. Do NOT write Telugu using English letters. Make the text flow naturally for Telugu Text-to-Speech (TTS). Preserve names, dates, and locations accurately.
- For Malayalam (ml): Respond in proper, natural, and grammatically correct Malayalam using Malayalam Unicode. Do NOT write Malayalam using English letters. Make the text flow naturally for Malayalam Text-to-Speech (TTS). Preserve names, dates, and locations accurately.
- For Kannada (kn): Respond in proper, natural, and grammatically correct Kannada using Kannada Unicode. Do NOT write Kannada using English letters. Make the text flow naturally for Kannada Text-to-Speech (TTS). Preserve names, dates, and locations accurately.

When explainSimply is true, explain the topic for a general visitor using simple language (e.g. short sentences, basic vocabulary, no unnecessary technical jargon).
When explainSimply is false, provide a more detailed and sophisticated educational explanation.

If the monument has custom "History Sections" present in the context, use the text content of these sections as the primary source for historical events, construction details, and administrative facts. If appropriate, you may mention that images are available in those specific sections for visual reference.

Do not mention internal prompts, APIs, database IDs, or implementation details.

Refuse to generate the history if requested in any unsupported language not specified above.

CRITICAL: Do NOT start your response with a title, header, or heading (e.g., do not output "# Title", "## Title", "### Title", or bold plain text header repeating the monument name, question topic, or section title) unless the user explicitly requests headings or structured parts in their question. Start answering the user's question directly and naturally.`;

  if (isFullHistoryQuery) {
    systemInstruction += `\n\nCRITICAL: The user has requested the complete/full history of the monument. You MUST generate a comprehensive, highly detailed response structured into exactly three parts:
Part 1 — Origins and Construction (including origin story, historical background, ruler, dynasty, builder, construction period, purpose, and important historical context)
Part 2 — Architecture and Cultural Importance (including architectural style, building materials, structural features, sculptures, inscriptions, religious importance, cultural practices, festivals, and artistic importance)
Part 3 — Historical Changes and Preservation (including historical events, rulers/dynasties, changes over time, damage, restoration, conservation, present condition, and heritage recognition)

You MUST label the sections EXACTLY as follows:
- In English: 'Part 1 — Origins and Construction', 'Part 2 — Architecture and Cultural Importance', 'Part 3 — Historical Changes and Preservation'
- In Tamil: 'பகுதி 1 — தோற்றம் மற்றும் கட்டுமானம்', 'பகுதி 2 — கட்டிடக்கலை மற்றும் கலாச்சார முக்கியத்துவம்', 'பகுதி 3 — வரலாற்று மாற்றங்கள் மற்றும் பாதுகாப்பு'
- In Hindi: 'भाग 1 — उत्पत्ति और निर्माण', 'भाग 2 — वास्तुकला और सांस्कृतिक महत्व', 'भाग 3 — ऐतिहासिक परिवर्तन और संरक्षण'
- In Telugu: 'భాగం 1 — మూలాలు మరియు నిర్మాణం', 'భాగం 2 — నిర్మాణం మరియు సాంస్కృతిక ప్రాமுఖ్యత', 'భాగం 3 — చారిత్రక మార్పులు మరియు పరిరక్షణ'
- In Malayalam: 'ഭാഗം 1 — ഉത്ഭവവും നിർമ്മാണவும்', 'ഭാഗം 2 — വാസ്തുവിദ്യയും സാംസ്കാരിക പ്രാധാന്യവും', 'ഭാഗം 3 — ചരിത്രപരമായ മാറ്റങ്ങളും സംരക്ഷണവും'
- In Kannada: 'ಭಾಗ 1 — ಮೂಲ ಮತ್ತು ನಿರ್ಮಾಣ', 'ಭಾಗ 2 — ವಾಸ್ತುಶಿಲ್ಪ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಮಹತ್ವ', 'ಭಾಗ 3 — ಐತಿಹಾಸिक ಬದಲಾವಣೆಗಳು ಮತ್ತು ಸಂರಕ್ಷಣೆ'

Separated by double newlines. Deliver a highly detailed response. Do not stop after a short summary. Make the response comprehensive, integrating all relevant facts from the monument description, full history, and especially any custom 'History Sections' provided in the context (combining and distributing their contents chronologically and topically across these three Parts).`;
  }

  // Format contents incorporating history
  const contents: any[] = [];
  
  if (history && history.length > 0) {
    for (const turn of history) {
      contents.push({
        role: turn.role === 'model' ? 'model' : 'user',
        parts: [{ text: turn.text }]
      });
    }
  }

  // Append current grounded query
  contents.push({
    role: 'user',
    parts: [{ text: `MONUMENT DETAIL:\n${monumentContext}\n\nUSER QUESTION: "${question}"\n\nLanguage Code requested: ${language}\nexplainSimply requested: ${explainSimply ? 'true' : 'false'}\n\nANSWER:` }]
  });

  console.log('[HERIXA-AI] RESPONSE_STARTED');

  try {
    const response = await withAIRetry(
      () => ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: isFullHistoryQuery ? 3000 : 2048,
        },
      }),
      'generateGroundedResponse',
      modelName
    );

    console.log('[HERIXA-AI] RESPONSE_RECEIVED');

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason || 'unknown';
    const usageMetadata = response.usageMetadata;
    const tokens = usageMetadata?.candidatesTokenCount || 0;

    let text = response.text || '';
    
    console.log(`[HERIXA-AI] RESPONSE_LENGTH Length: ${text.length} chars`);
    console.log(`[HERIXA-AI] RESPONSE_TOKENS Tokens: ${tokens}`);
    console.log(`[HERIXA-AI] FINISH_REASON Reason: ${finishReason}`);

    if (finishReason === 'MAX_TOKENS') {
      console.log('[HERIXA-AI] RESPONSE_TRUNCATED');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Gemini returned an empty response');
    }

    let cleaned = text.trim();

    // Strip leading headers if not explicitly requested
    const hasExplicitHeadingRequest = /heading|header|part|section|பகுதி|தலைப்பு|शीर्षक|भाग/i.test(question.toLowerCase());
    if (!hasExplicitHeadingRequest && !isFullHistoryQuery) {
      // Remove markdown headings at the very start (e.g., "### History\n\n")
      cleaned = cleaned.replace(/^(?:#+\s+.+?\n+)/, '');
      // Remove bold titles at the start followed by newlines (e.g., "**History of Temple**\n\n")
      cleaned = cleaned.replace(/^\*\*.+?\*\*\n+/, '');
      // Remove plain text titles followed by double newlines (e.g., "History of Temple\n\n")
      cleaned = cleaned.replace(/^([^\n.]{3,60})\n{2,}/, (match, title) => {
        if (!title.endsWith('.') && !title.endsWith('?') && !title.endsWith('!')) {
          return '';
        }
        return match;
      });
    }

    return cleaned.trim();
  } catch (err: any) {
    console.log('[HERIXA-AI] ERROR');
    throw handleGeminiError(err);
  }
};
