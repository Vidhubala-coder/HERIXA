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
 *
 * ROOT CAUSE FIX: Previously, when the backend returned { success: false } (e.g. 404 monument
 * not found), the code fell through to the local fallback which showed "information offline".
 * Now we properly distinguish:
 *  - Network error / timeout → try cache → local fallback
 *  - Backend responded but monument not found (404) → local fallback WITH monument name hint
 *  - Backend responded with AI error (500) → local fallback
 *  - Backend responded with success:true → use AI answer
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

  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

  // 1. Try to contact the backend
  const endpoint = '/api/assistant/ask';
  let backendReachable = false;
  let backendErrorMessage: string | null = null;

  try {
    if (isDev) {
      console.log(`[HERIXA ASSISTANT] POST ${endpoint}`);
      console.log(`[HERIXA ASSISTANT] Payload: monumentId=${monumentId}, lang=${language}, question="${question.substring(0, 60)}..."`);
    }

    const result = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        monumentId,
        question,
        language,
        explainSimply,
        history,
      }),
      timeout: 60000,
    });

    backendReachable = true;

    if (result && result.success) {
      // Cache successful AI response
      saveToCache(cacheKey, questionKey, result.answer).catch((err) =>
        console.warn('Failed to cache assistant response:', err)
      );
      if (isDev) {
        console.log(`[HERIXA ASSISTANT] AI response received (source: ${result.source || 'ai'}, length: ${result.answer?.length || 0} chars)`);
      }
      return {
        success: true,
        answer: result.answer,
        language: result.language || language,
        source: result.source || 'ai',
      };
    }

    // Backend reached but returned success:false.
    // Extract the actual error message from the backend response.
    backendErrorMessage = result?.message || result?.answer || null;
    if (isDev) {
      console.warn(`[HERIXA ASSISTANT] Backend returned success:false`);
      console.warn(`[HERIXA ASSISTANT] Backend message: ${backendErrorMessage}`);
      console.warn(`[HERIXA ASSISTANT] Full response:`, JSON.stringify(result).substring(0, 500));
    }
  } catch (apiError: any) {
    if (isDev) {
      console.error(`[HERIXA ASSISTANT] Request failed`);
      console.error(`[HERIXA ASSISTANT] Endpoint: ${endpoint}`);
      console.error(`[HERIXA ASSISTANT] Error type: ${apiError.isTimeout ? 'TIMEOUT' : apiError.isNetworkError ? 'NETWORK' : 'HTTP'}`);
      console.error(`[HERIXA ASSISTANT] Error message: ${apiError.message || apiError}`);
      if (apiError.status) console.error(`[HERIXA ASSISTANT] HTTP Status: ${apiError.status}`);
    } else {
      if (apiError.isTimeout) {
        console.warn('[VOICE] Request timed out, falling back to cache/local.');
      } else if (apiError.isNetworkError) {
        console.warn('[VOICE] Network unreachable, falling back to cache/local.');
      } else {
        console.warn('[VOICE] API error, falling back to cache/local:', apiError.message || apiError);
      }
    }
  }

  // 2. If backend was reachable but returned an error, show the backend's error message
  //    (e.g., "Monument not found", "AI rate limit", etc.)
  //    Do NOT silently fall to local keyword fallback — that creates misleading answers.
  if (backendReachable && backendErrorMessage) {
    // The backend explicitly told us it couldn't answer. Report this honestly.
    const userFacingError = getLocalizedAIUnavailableMessage(language, backendErrorMessage);
    return {
      success: false,
      answer: userFacingError,
      language,
      source: 'local-fallback',
    };
  }

  // 3. Try the cache (only when backend was unreachable / timed out)
  if (!backendReachable) {
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
  }

  // 4. Local client-side generation (offline fallback)
  return generateClientLocalFallback(monumentId, question, language, explainSimply);
};

/**
 * Generate a user-friendly localized message when the AI service is unavailable.
 */
const getLocalizedAIUnavailableMessage = (
  language: string,
  backendMessage?: string
): string => {
  // If the backend provided a specific message about the monument not being found,
  // preserve that context
  const isNotFound = backendMessage && /not found|not exist/i.test(backendMessage);

  if (language === 'ta') {
    return isNotFound
      ? 'இந்த நினைவுச்சின்னம் பற்றிய தகவல் தரவுத்தளத்தில் காணப்படவில்லை. Heritage Information பக்கத்தில் விவரங்களைப் பாருங்கள்.'
      : 'AI உதவியாளர் சேவை தற்போது கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும் அல்லது Heritage Information பக்கத்தைப் பாருங்கள்.';
  }
  if (language === 'hi') {
    return isNotFound
      ? 'इस स्मारक की जानकारी डेटाबेस में नहीं मिली। Heritage Information पेज पर विवरण देखें।'
      : 'AI सहायक सेवा वर्तमान में अनुपलब्ध है। बाद में पुन: प्रयास करें या Heritage Information पेज देखें।';
  }
  if (language === 'te') {
    return isNotFound
      ? 'ఈ స్మారక చిహ్నం గురించి డేటాబేస్‌లో సమాచారం కనుగొనబడలేదు. Heritage Information పేజీలో వివరాలు చూడండి.'
      : 'AI అసిస్టెంట్ సేవ ప్రస్తుతం అందుబాటులో లేదు. తర్వాత మళ్ళీ ప్రయత్నించండి లేదా Heritage Information పేజీ చూడండి.';
  }
  if (language === 'ml') {
    return isNotFound
      ? 'ഈ സ്‌മാരകത്തെക്കുറിച്ചുള്ള വിവരങ്ങൾ ഡാറ്റാബേസിൽ കണ്ടെത്താനായില്ല. Heritage Information പേജിൽ വിശദാംശങ്ങൾ കാണുക.'
      : 'AI അസിസ്റ്റന്റ് സേവനം നിലവിൽ ലഭ്യമല്ല. പിന്നീട് വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ Heritage Information പേജ് കാണുക.';
  }
  if (language === 'kn') {
    return isNotFound
      ? 'ಈ ಸ್ಮಾರಕದ ಬಗ್ಗೆ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಮಾಹಿತಿ ಕಂಡುಬಂದಿಲ್ಲ. Heritage Information ಪುಟದಲ್ಲಿ ವಿವರಗಳನ್ನು ನೋಡಿ.'
      : 'AI ಸಹಾಯಕ ಸೇವೆ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ. ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ Heritage Information ಪುಟವನ್ನು ನೋಡಿ.';
  }
  // English default
  return isNotFound
    ? 'This monument was not found in the database. Please check the Heritage Information page for details.'
    : 'The AI assistant service is currently unavailable. Please try again later or view the Heritage Information page.';
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
  
  // If monument not in local static array, build a helpful response from available info
  // (This is the common case for monuments stored only in MongoDB)
  if (!monument) {
    // The monumentId may be the actual display name (e.g. "Brihadeeswarar Temple")
    // or a MongoDB ObjectId. Use whichever looks like a readable name.
    const displayName = /^[a-f0-9]{24}$/i.test(monumentId)
      ? 'this monument'
      : monumentId;

    let genericAnswer = '';
    const q = question.toLowerCase();
    const isNarrationQ = /narration|tour guide|comprehensive|tell me about|explain|describe/i.test(q);

    if (language === 'ta') {
      genericAnswer = isNarrationQ
        ? `${displayName} பற்றிய விரிவான தகவல் தற்போது இணைய இணைப்பு இல்லாமல் கிடைக்கவில்லை. ஆனால் நீங்கள் Heritage Information பொத்தானை அழுத்தி இந்த நினைவுச்சின்னம் பற்றிய முழு விவரங்களைப் பார்க்கலாம்.`
        : `${displayName} பற்றிய இந்தக் கேள்விக்கு பதிலளிக்க, Heritage Information பக்கத்தில் விரிவான தகவல்கள் உள்ளன. அங்கு பாருங்கள்.`;
    } else if (language === 'hi') {
      genericAnswer = isNarrationQ
        ? `${displayName} के बारे में विस्तृत जानकारी अभी ऑफ़लाइन उपलब्ध नहीं है। Heritage Information बटन दबाकर इस स्मारक के बारे में पूरी जानकारी देखें।`
        : `${displayName} के बारे में इस प्रश्न का उत्तर Heritage Information पृष्ठ पर विस्तार से उपलब्ध है।`;
    } else {
      genericAnswer = isNarrationQ
        ? `Detailed information about ${displayName} is not available offline right now. Tap "Heritage Information" below to read the full details about this monument.`
        : `Information about ${displayName} is available in the Heritage Information section. Please tap the Heritage Information button to explore the full details.`;
    }

    return {
      success: true,
      answer: genericAnswer,
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
