import { IMonument } from '../models/monument';
import { generateGroundedResponse } from './geminiService';

interface AskOptions {
  monument: IMonument;
  question: string;
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  explainSimply: boolean;
  history?: { role: 'user' | 'model'; text: string }[];
}

interface AssistantResponse {
  success: boolean;
  answer: string;
  language: string;
  source: 'gemini' | 'local-fallback';
}

// Static Translations for Fallback Mode
const LOCALIZATION_MAP: Record<string, Record<string, string>> = {
  // Monument Names
  'Brihadeeswarar Temple': {
    ta: 'பிரகதீஸ்வரர் கோவில்',
    hi: 'बृहदेश्वर मंदिर',
  },
  'Meenakshi Amman Temple': {
    ta: 'மீனாட்சி அம்மன் கோவில்',
    hi: 'मीनाक्षी अम्मन मंदिर',
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
  // Dynasties
  'Chola Dynasty': {
    ta: 'சோழ வம்சம்',
    hi: 'चोल राजवंश',
  },
  'Pandya & Nayak Dynasties': {
    ta: 'பாண்டிய மற்றும் நாயக்க வம்சங்கள்',
    hi: 'पांड्य और नायक राजवंश',
  },
  'Pallava Dynasty': {
    ta: 'பல்லவ வம்சம்',
    hi: 'पल्लव राजवंश',
  },
  'Nayak Dynasty': {
    ta: 'நாயக்க வம்சம்',
    hi: 'नायक राजवंश',
  },
  // Locations/States
  'Tamil Nadu': {
    ta: 'தமிழ்நாடு',
    hi: 'तमिलनाडु',
  },
  'Thanjavur': {
    ta: 'தஞ்சாவூர்',
    hi: 'तंजावुर',
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
  // Categories
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

export const askAssistant = async (options: AskOptions): Promise<AssistantResponse> => {
  const { monument, question, language, explainSimply, history } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const answer = await generateGroundedResponse({ monument, question, language, explainSimply, history });
      return {
        success: true,
        answer,
        language,
        source: 'gemini',
      };
    } catch (err) {
      console.log('[AI DEBUG] Gemini unavailable, using local fallback');
      console.warn('Gemini request failed, falling back to structured local engine:', err);
      return askLocalFallback(monument, question, language, explainSimply);
    }
  } else {
    console.log('[AI DEBUG] Gemini unavailable, using local fallback');
    return askLocalFallback(monument, question, language, explainSimply);
  }
};

const askLocalFallback = (
  monument: IMonument,
  question: string,
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn',
  explainSimply: boolean
): AssistantResponse => {
  const query = question.toLowerCase();

  // Localized terms
  const localizedName = getLocalizedTerm(monument.name, language);
  const localizedDynasty = getLocalizedTerm(monument.dynasty, language);
  const localizedPeriod = monument.period;
  const localizedLocation = getLocalizedTerm(monument.location, language);
  const localizedState = getLocalizedTerm(monument.state, language);
  const localizedCategory = getLocalizedTerm(monument.category, language);

  let answer = '';

  // Multilingual intent classification based on keywords
  const isBuilderQuery = /built|who|made|creator|builder|dynasty|ruler|king|emperor|commission|கட்டிய|அரசர்|மன்னர்|உருவாக்கிய|किसने|बनाया|शासक|राजा|सम्राट/i.test(query);
  const isArchitectureQuery = /architecture|design|structure|vimana|tower|pillar|stone|granite|carving|sculpture|கட்டடக்கலை|வடிவமைப்பு|கோபுரம்|தூண்|கல்|சிலை|स्थापत्य|वास्तुकला|नक्काशी|स्तंभ|पत्थर|विमान/i.test(query);
  const isHistoryQuery = /history|when|year|background|origin|past|old|consecrat|வரலாறு|பின்னணி|ஆண்டு|எப்போது|வரலாற்று|इतिहास|कब|वर्ष|पृष्ठभूमि/i.test(query);
  const isFactsQuery = /fact|interesting|secret|mysterious|shadow|weight|nandi|trivia|சுவாரஸ்யமான|உண்மை|ரகசியம்|நிழல்|நந்தி|तथ्य|रोचक|रहस्य|नंदी|प्रतिबिंब/i.test(query);
  const isSignificanceQuery = /why|famous|significance|importance|cultural|festival|worship|sacred|ஏன்|முக்கியத்துவம்|கலாச்சார|திருவிழா|வணக்கம்|பாதுகாப்பு|महत्व|प्रसिद्धि|सांस्कृतिक|त्योहार|पूजा/i.test(query);

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
        answer += `\n\nவிவரம்: ${monument.historicalSignificance}`;
      } else if (language === 'hi') {
        answer += `\n\nविवरण: ${monument.historicalSignificance}`;
      } else {
        answer += `\n\nDetails: ${monument.historicalSignificance}`;
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
      answer = `${localizedName} இன் வரலாற்றுப் பின்னணி:\n\n${monument.historicalBackground}\n\nமுக்கியத்துவம்: ${monument.historicalSignificance}`;
    } else if (language === 'hi') {
      answer = `${localizedName} की ऐतिहासिक पृष्ठभूमि:\n\n${monument.historicalBackground}\n\nमहत्व: ${monument.historicalSignificance}`;
    } else {
      answer = `Historical background of ${localizedName}:\n\n${monument.historicalBackground}\n\nSignificance: ${monument.historicalSignificance}`;
    }
  } else if (isFactsQuery) {
    const factsList = monument.interestingFacts.map((fact) => `- ${fact}`).join('\n');
    if (language === 'ta') {
      answer = `${localizedName} பற்றிய சில சுவாரஸ்யமான தகவல்கள் இதோ:\n\n${factsList}`;
    } else if (language === 'hi') {
      answer = `${localizedName} के बारे में कुछ दिलचस्प तथ्य यहाँ दिए गए हैं:\n\n${factsList}`;
    } else {
      answer = `Here are some interesting facts about ${localizedName}:\n\n${factsList}`;
    }
  } else if (isSignificanceQuery) {
    if (language === 'ta') {
      answer = `${localizedName} இன் கலாச்சார மற்றும் வரலாற்று முக்கியத்துவம்:\n\n${monument.culturalSignificance}`;
    } else if (language === 'hi') {
      answer = `${localizedName} का सांस्कृतिक और ऐतिहासिक महत्व:\n\n${monument.culturalSignificance}`;
    } else {
      answer = `The cultural and historical significance of ${localizedName}:\n\n${monument.culturalSignificance}`;
    }
  } else {
    // Default overview response
    if (language === 'ta') {
      answer = `${localizedName} என்பது ஒரு ${localizedCategory} ஆகும்.\n\nவிளக்கம்: ${monument.description}`;
    } else if (language === 'hi') {
      answer = `${localizedName} एक ${localizedCategory} है।\n\nविवरण: ${monument.description}`;
    } else {
      answer = `${localizedName} is a ${localizedCategory}.\n\nDescription: ${monument.description}`;
    }
  }

  // Handle explainSimply mode for fallback responses if query matches default overview or detail blocks
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
