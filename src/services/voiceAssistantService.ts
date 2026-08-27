import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getApiUrl } from './api';
import { MONUMENTS, Monument } from '../data/monuments';
import { getLanguageByCode } from '../config/languages';

export interface AssistantResponse {
  success: boolean;
  answer: string;
  language: string;
  source: 'ai' | 'local-fallback' | 'cache';
}

const CACHE_PREFIX = 'HERIXA_ASSISTANT_CACHE_';

// Static Translations for Local Frontend Fallback
const LOCALIZATION_MAP: Record<string, Record<string, string>> = {
  'Brihadeeswarar Temple': {
    ta: 'பிரகதீஸ்வரர் கோவில்',
    hi: 'बृहदेश्वर मंदिर',
    te: 'బృహదీశ్వర ఆలయం',
    ml: 'ബൃഹദീശ്വര ക്ഷേത്രം',
    kn: 'ಬೃಹದೀಶ್ವರ ದೇವಾಲಯ',
  },
  'Meenakshi Amman Temple': {
    ta: 'மீனாட்சி அம்மன் கோவில்',
    hi: 'மீனாட்சி அம்மன் கோவில்', // matches what was in backend
  },
  'Mahabalipuram Shore Temple': {
    ta: 'மகாபலிபுரம் கடற்கரை கோவில்',
    hi: 'महाबलीपुरम शोर मंदिर',
  },
  'Gangaikonda Choleswarar Temple': {
    ta: 'கங்கை கொண்ட சோழீஸ்வரர் கோவில்',
    hi: 'गंगाकोंडचोलपुरम मंदिर',
  },
  'Airavatesvara Temple': {
    ta: 'ஐராவதேஸ்வரர் கோவில்',
    hi: 'ऐरावतेश्वर मंदिर',
  },
  'Thirumalai Nayakkar Palace': {
    ta: 'திருமலை நாயக்கர் அரண்மனை',
    hi: 'तिरुमलई नायककर महल',
  },
  'Chola Dynasty': {
    ta: 'சோழ வம்சம்',
    hi: 'चोल राजवंश',
  },
  'Pandya & Nayak Dynasties': {
    ta: 'பாண்டிய மற்றும் நாயக்க வம்சங்கள்',
    hi: 'பாண்டிய மற்றும் நாயக்க வம்சங்கள்',
  },
  'Pallava Dynasty': {
    ta: 'பல்லவ வம்சம்',
    hi: 'பல்லவ வம்சம்',
  },
  'Nayak Dynasty': {
    ta: 'நாயக்க வம்சம்',
    hi: 'நாயக்க வம்சம்',
  },
  'Tamil Nadu': {
    ta: 'தமிழ்நாடு',
    hi: 'तमिलनाडु',
    te: 'తమిళనాడు',
    ml: 'തമിഴ്‌നാട്',
    kn: 'ತಮಿಳುನಾಡು',
  },
  'Thanjavur': {
    ta: 'தஞ்சாவூர்',
    hi: 'तंजावुर',
    te: 'తంజావూరు',
    ml: 'തഞ്ചാവൂർ',
    kn: 'తంజావూరు',
  },
  'Madurai': {
    ta: 'மதுரை',
    hi: 'मदुरै',
  },
  'Mamallapuram': {
    ta: 'மாமல்லபுரம்',
    hi: 'महाबलीपुरम',
  },
  'Ariyalur District': {
    ta: 'அரியலூர் மாவட்டம்',
    hi: 'अरियालूर जिला',
  },
  'Darasuram': {
    ta: 'தாராசுரம்',
    hi: 'दारासुरम',
  },
  'Temples': {
    ta: 'கோவில்',
    hi: 'मंदिर',
  },
  'Sculptures': {
    ta: 'சிற்பம்',
    hi: 'मूर्ति',
  },
  'Forts': {
    ta: 'கோட்டை',
    hi: 'किला',
  },
  'Artifacts': {
    ta: 'கைவினைப்பொருள்',
    hi: 'कलाकृति',
  },
};

const getLocalizedTerm = (term: string, lang: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn'): string => {
  if (lang === 'en') return term;
  return LOCALIZATION_MAP[term]?.[lang] || term;
};

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/**
 * Ask HERIXA Guide about a specific monument.
 * Attempts to hit the backend API, and falls back to local cache/offline logic on failure.
 */
export const askVoiceAssistant = async (
  monumentId: string,
  question: string,
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn' = 'en',
  explainSimply: boolean = false,
  history: ChatTurn[] = []
): Promise<AssistantResponse> => {
  const cacheKey = `${CACHE_PREFIX}${monumentId}_${language}`;
  const questionKey = `${question.trim().toLowerCase()}_${explainSimply ? 'simple' : 'detail'}`;

  // 1. Try to contact the backend
  const endpoint = '/api/assistant/ask';

  console.log("[VOICE DEBUG] Request endpoint:", endpoint);
  console.log("[VOICE DEBUG] Sending Voice Assistant request");

  try {
    const result = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        monumentId,
        question,
        language,
        explainSimply,
        history,
      }),
      timeout: 60000, // 60 seconds timeout
    });

    console.log("[VOICE DEBUG] Voice Assistant response received");

    if (result && result.success) {
      // Save to cache asynchronously
      saveToCache(cacheKey, questionKey, result.answer).catch((err) =>
        console.warn('Failed to cache assistant response:', err)
      );

      return {
        success: true,
        answer: result.answer,
        language: result.language,
        source: result.source || 'ai',
      };
    }
  } catch (apiError: any) {
    if (apiError.isTimeout) {
      console.error('[VOICE ERROR] Timeout: Voice Assistant request timed out. Status: Timeout');
    } else if (apiError.isNetworkError) {
      console.warn('[VOICE ERROR] Network: Unable to connect to Voice Assistant server.', apiError.message);
    } else {
      console.error('[VOICE ERROR] Voice Assistant request failed:', apiError.message || apiError);
    }
    console.warn('VoiceAssistant API request failed. Checking local cache & fallback.');
  }

  // 2. Try to fetch from cache on API failure
  try {
    const cachedAnswer = await getFromCache(cacheKey, questionKey);
    if (cachedAnswer) {
      return {
        success: true,
        answer: cachedAnswer,
        language,
        source: 'cache',
      };
    }
  } catch (cacheError) {
    console.warn('Failed to read from AsyncStorage cache:', cacheError);
  }

  // 3. Fallback to Local client-side generation using static assets
  return generateClientLocalFallback(monumentId, question, language, explainSimply);
};

const saveToCache = async (cacheKey: string, questionKey: string, answer: string): Promise<void> => {
  let cacheMap: Record<string, string> = {};
  try {
    const existingCacheStr = await AsyncStorage.getItem(cacheKey);
    if (existingCacheStr) {
      cacheMap = JSON.parse(existingCacheStr);
    }
  } catch (e) {
    console.warn(`[HERIXA-ASSISTANT] Failed to read/parse assistant cache for key ${cacheKey}. Rebuilding cache.`, e);
    await AsyncStorage.removeItem(cacheKey).catch(() => {});
  }
  cacheMap[questionKey] = answer;
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheMap));
  } catch (e) {
    console.warn(`[HERIXA-ASSISTANT] Failed to write assistant cache for key ${cacheKey}`, e);
  }
};

const getFromCache = async (cacheKey: string, questionKey: string): Promise<string | null> => {
  try {
    const existingCacheStr = await AsyncStorage.getItem(cacheKey);
    if (!existingCacheStr) return null;
    const cacheMap = JSON.parse(existingCacheStr);
    return cacheMap[questionKey] || null;
  } catch (e) {
    console.warn(`[HERIXA-ASSISTANT] Malformed assistant cache for key ${cacheKey}. Clearing corrupted cache.`, e);
    await AsyncStorage.removeItem(cacheKey).catch(() => {});
    return null;
  }
};

export const clearAssistantCache = async (monumentId: string, language?: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn'): Promise<void> => {
  if (language) {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${monumentId}_${language}`);
  } else {
    const languages: ('en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn')[] = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];
    for (const lang of languages) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${monumentId}_${lang}`);
    }
  }
};

export const generateMonumentNarrationLocal = (
  monument: any,
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn'
): string => {
  const name = getLocalizedTerm(monument.name, language);
  const location = getLocalizedTerm(monument.location, language);
  const state = getLocalizedTerm(monument.state, language);
  const category = getLocalizedTerm(monument.category, language);
  const period = monument.period;
  const dynasty = getLocalizedTerm(monument.dynasty, language);

  const background = monument.background;
  const architecture = monument.architecture;
  const historicalSignificance = monument.historicalSignificance;
  const significance = monument.significance;
  const preservation = monument.preservation;
  const facts = monument.facts || [];

  const fact1 = facts[0] || '';
  const fact2 = facts[1] || '';

  if (language === 'ta') {
    return `${location}, ${state} இல் அமைந்துள்ள ${name} உங்களை வரவேற்கிறது. இந்த அற்புதமான ${category} ${period} இல் ${dynasty} அரசர்களால் கட்டப்பட்டது.

வரலாற்று ரீதியாக, ${background}

கட்டிடக்கலை ரீதியாக, ${architecture}

இது சிறந்த கலாச்சார மற்றும் வரலாற்று மதிப்பைக் கொண்டுள்ளது: ${historicalSignificance} ${significance}

தற்போது, ${preservation}

இங்கே சில சுவாரஸ்யமான தகவல்கள் இதோ:
1. ${fact1}
2. ${fact2}`;
  }

  if (language === 'hi') {
    return `${location}, ${state} में स्थित ${name} में आपका स्वागत है। इस भव्य ${category} का निर्माण ${period} में ${dynasty} द्वारा किया गया था।

ऐतिहासिक रूप से, ${background}

वास्तुकला की दृष्टि से, ${architecture}

यह अत्यधिक सांस्कृतिक मूल्य रखता है: ${historicalSignificance} ${significance}

वर्तमान में, ${preservation}

यहाँ कुछ दिलचस्प तथ्य दिए गए हैं:
1. ${fact1}
2. ${fact2}`;
  }

  if (language === 'te') {
    return `${location}, ${state} లో ఉన్న ${name} కు స్వాగతం. ఈ అద్భుతమైన ${category} ను ${period} లో ${dynasty} వారు నిర్మించారు.

చారిత్రకంగా, ${background}

నిర్మాణ శైలి విషయానికి వస్తే, ${architecture}

ఇది ఎంతో సాంస్కృతిక ప్రాముఖ్యతను కలిగి ఉంది: ${historicalSignificance} ${significance}

ప్రస్తుతం, ${preservation}

ఇక్కడ కొన్ని ఆసక్తికరమైన విషయాలు ఉన్నాయి:
1. ${fact1}
2. ${fact2}`;
  }

  if (language === 'ml') {
    return `${location}, ${state} ൽ സ്ഥിതി ചെയ്യുന്ന ${name} ലേക്ക് സ്വാഗതം. ഈ മനോഹരമായ ${category} ${period} ൽ ${dynasty} ഭരണകാലത്താണ് നിർമ്മിച്ചത്.

ചരിത്രപരമായി, ${background}

നിർമ്മാണ ശൈലി പരിശോധിച്ചാൽ, ${architecture}

ഇതിന് വലിയ സാംസ്കാരിക പ്രാധാധ്യമുണ്ട്: ${historicalSignificance} ${significance}

നിലവിൽ, ${preservation}

ചില രസകരമായ വസ്തുതകൾ ഇതാ:
1. ${fact1}
2. ${fact2}`;
  }

  if (language === 'kn') {
    return `${location}, ${state} ನಲ್ಲಿರುವ ${name} ಗೆ ಸುಸ್ವಾಗತ. ಈ ಭವ್ಯವಾದ ${category} ಅನ್ನು ${period} ನಲ್ಲಿ ${dynasty} ರಾಜರು ನಿರ್ಮಿಸಿದರು.

ಐತಿಹಾಸಿಕವಾಗಿ, ${background}

ವಾಸ್ತುಶಿಲ್ಪದ ಪ್ರಕಾರ, ${architecture}

ಇದು ಹೆಚ್ಚಿನ ಸಾಂಸ್ಕೃತಿಕ ಮಹತ್ವವನ್ನು ಹೊಂದಿದೆ: ${historicalSignificance} ${significance}

ప్రస్తుತ, ${preservation}

ಕೆಲವು ಆಸಕ್ತಿದಾಯಕ ಸಂಗತಿಗಳು ಇಲ್ಲಿವೆ:
1. ${fact1}
2. ${fact2}`;
  }

  // Default to English
  return `Welcome to the ${name} located in ${location}, ${state}. This magnificent ${category} was constructed during the ${period} by the ${dynasty}.

Historically, ${background}

Architecturally, ${architecture}

It holds immense cultural value: ${historicalSignificance} ${significance}

Currently, ${preservation}

Here are some interesting facts:
1. ${fact1}
2. ${fact2}`;
};

/**
 * Client-Side Fallback Generator
 */
const generateClientLocalFallback = (
  monumentId: string,
  question: string,
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn',
  explainSimply: boolean
): AssistantResponse => {
  // Find local monument
  const monument = MONUMENTS.find((m) => m.id === monumentId || m.name.toLowerCase() === monumentId.toLowerCase());
  
  if (!monument) {
    let unavail = 'Information about this monument is currently offline.';
    if (language === 'ta') unavail = 'இந்த நினைவுச்சின்னம் பற்றிய தகவல் தற்போது ஆஃப்லைனில் உள்ளது.';
    if (language === 'hi') unavail = 'इस स्मारक के बारे में जानकारी वर्तमान में ऑफ़लाइन है।';

    return {
      success: false,
      answer: unavail,
      language,
      source: 'local-fallback',
    };
  }

  const query = question.toLowerCase();

  const isNarrationQuery = /narration|tour guide|comprehensive|full historical/i.test(query);
  if (isNarrationQuery) {
    const narration = generateMonumentNarrationLocal(monument, language);
    return {
      success: true,
      answer: narration,
      language,
      source: 'local-fallback',
    };
  }

  // Localized variables
  const localizedName = getLocalizedTerm(monument.name, language);
  const localizedDynasty = getLocalizedTerm(monument.dynasty, language);
  const localizedPeriod = monument.period;
  const localizedLocation = getLocalizedTerm(monument.location, language);
  const localizedState = getLocalizedTerm(monument.state, language);
  const localizedCategory = getLocalizedTerm(monument.category, language);

  let answer = '';

  const isBuilderQuery = /built|who|made|creator|builder|dynasty|ruler|king|emperor|commission/i.test(query);
  const isArchitectureQuery = /architecture|design|structure|vimana|tower|pillar|stone|granite|carving|sculpture/i.test(query);
  const isHistoryQuery = /history|when|year|background|origin|past|old|consecrat/i.test(query);
  const isFactsQuery = /fact|interesting|secret|mysterious|shadow|weight|nandi|trivia/i.test(query);
  const isSignificanceQuery = /why|famous|significance|importance|cultural|festival|worship|sacred/i.test(query);

  if (isBuilderQuery) {
    if (language === 'ta') {
      answer = `${localizedName} ${localizedPeriod} இல் ${localizedDynasty} அரசர்களால் கட்டப்பட்டது. இது ${localizedState} மாநிலத்தில் உள்ள ${localizedLocation} இல் அமைந்துள்ளது.`;
    } else if (language === 'hi') {
      answer = `${localizedName} का निर्माण ${localizedPeriod} में ${localizedDynasty} द्वारा किया गया था। यह ${localizedState} के ${localizedLocation} में स्थित है।`;
    } else {
      answer = `The ${localizedName} was built by the ${localizedDynasty} during the ${localizedPeriod}. It is located in ${localizedLocation}, ${localizedState}.`;
    }

    if (!explainSimply) {
      if (language === 'ta') {
        answer += `\n\nவரலாற்று முக்கியத்துவம்: ${monument.historicalSignificance}`;
      } else if (language === 'hi') {
        answer += `\n\nऐतिहासिक महत्व: ${monument.historicalSignificance}`;
      } else {
        answer += `\n\nHistorical Significance: ${monument.historicalSignificance}`;
      }
    }
  } else if (isArchitectureQuery) {
    if (language === 'ta') {
      answer = `${localizedName} இன் கட்டிடக்கலை வடிவமைப்பு இதோ:\n\n${monument.architecture}`;
    } else if (language === 'hi') {
      answer = `${localizedName} की वास्तुकला का विवरण यहाँ है:\n\n${monument.architecture}`;
    } else {
      answer = `Here is the architectural detail of ${localizedName}:\n\n${monument.architecture}`;
    }
  } else if (isHistoryQuery) {
    if (language === 'ta') {
      answer = `${localizedName} இன் வரலாற்றுப் பின்னணி:\n\n${monument.background}\n\nமுக்கியத்துவம்: ${monument.historicalSignificance}`;
    } else if (language === 'hi') {
      answer = `${localizedName} की ऐतिहासिक पृष्ठभूमि:\n\n${monument.background}\n\nमहत्व: ${monument.historicalSignificance}`;
    } else {
      answer = `Historical background of ${localizedName}:\n\n${monument.background}\n\nSignificance: ${monument.historicalSignificance}`;
    }
  } else if (isFactsQuery) {
    const factsList = monument.facts.map((fact) => `- ${fact}`).join('\n');
    if (language === 'ta') {
      answer = `${localizedName} பற்றிய சில சுவாரஸ்யமான தகவல்கள் இதோ:\n\n${factsList}`;
    } else if (language === 'hi') {
      answer = `${localizedName} के बारे में कुछ दिलचस्प तथ्य यहाँ दिए गए हैं:\n\n${factsList}`;
    } else {
      answer = `Here are some interesting facts about ${localizedName}:\n\n${factsList}`;
    }
  } else if (isSignificanceQuery) {
    if (language === 'ta') {
      answer = `${localizedName} இன் கலாச்சார மற்றும் வரலாற்று முக்கியத்துவம்:\n\n${monument.significance}`;
    } else if (language === 'hi') {
      answer = `${localizedName} का सांस्कृतिक और ऐतिहासिक महत्व:\n\n${monument.significance}`;
    } else {
      answer = `The cultural and historical significance of ${localizedName}:\n\n${monument.significance}`;
    }
  } else {
    if (language === 'ta') {
      answer = `${localizedName} என்பது ஒரு ${localizedCategory} ஆகும்.\n\nவிளக்கம்: ${monument.description}`;
    } else if (language === 'hi') {
      answer = `${localizedName} एक ${localizedCategory} है।\n\nविवरण: ${monument.description}`;
    } else {
      answer = `${localizedName} is a ${localizedCategory}.\n\nDescription: ${monument.description}`;
    }
  }

  if (explainSimply && (isArchitectureQuery || isHistoryQuery || isSignificanceQuery || !isBuilderQuery && !isFactsQuery)) {
    const paragraph = answer.split('\n\n')[0];
    const sentences = paragraph.split('. ');
    const simpleVersion = sentences.slice(0, Math.min(sentences.length, 2)).join('. ');
    answer = simpleVersion + (simpleVersion.endsWith('.') ? '' : '.');
  }

  return {
    success: true,
    answer,
    language,
    source: 'local-fallback',
  };
};
