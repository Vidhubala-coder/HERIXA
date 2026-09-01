/**
 * HERIXA Full Heritage Narration Builder
 * Generates natural 90-120 second monument narrations in 6 languages.
 * Uses actual MongoDB monument data — never fabricates facts.
 * Supports speech chunking for long-text TTS.
 */

export type SupportedLanguage = "en" | "ta" | "hi" | "te" | "ml" | "kn";

/** Subset of IMonument relevant for narration */
export interface NarrationContext {
  monumentId: string;
  monumentName: string;
  confidence: number;
  // Basic (always from RecognitionResultData)
  dynasty?: string;
  architecturalHighlights?: string[];
  imageUrl?: string;
  // Enriched from /api/monuments/:id/narration
  location?: string;
  state?: string;
  district?: string;
  period?: string;
  ruler?: string;
  builder?: string;
  architect?: string;
  description?: string;
  historicalBackground?: string;
  historicalSignificance?: string;
  architecture?: string;
  culturalSignificance?: string;
  architecturalStyle?: string;
  constructionPeriod?: string;
  constructionHistory?: string;
  whyItWasBuilt?: string;
  originStory?: string;
  shortHistory?: string;
  fullHistory?: string;
  vimanaDetails?: string;
  gopuramDetails?: string;
  mandapaDetails?: string;
  sculptureDetails?: string;
  pillarDetails?: string;
  inscriptionDetails?: string;
  buildingMaterials?: string;
  uniqueArchitecturalFeatures?: string;
  engineeringFeatures?: string;
  structuralFeatures?: string;
  culturalImportance?: string;
  religiousImportance?: string;
  artisticImportance?: string;
  unescoStatus?: string;
  unescoYear?: string;
  heritageStatus?: string;
  heritageRecognition?: string;
  bestTimeToVisit?: string;
  visitingInformation?: string;
  nearbyPlaces?: string[];
  interestingFacts?: string[];
  didYouKnow?: string[];
  preservationStatus?: string;
  legends?: string[];
  mythology?: string;
  // Visualization metadata (passed through from narration endpoint)
  modelUrl?: string;
  heritagePreviewImages?: { _id?: string; id?: string; uri: string; viewType: string; title: string; description?: string; order: number; enabled: boolean }[];
  interactivePreviewEnabled?: boolean;
}

const HIGH_CONFIDENCE = 0.80;
const MEDIUM_CONFIDENCE = 0.35;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick first non-empty string from a list of candidates */
function pick(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    if (c && c.trim().length > 15) return c.trim();
  }
  return "";
}

/** Trim a long prose field to a safe spoken sentence limit */
function trimProse(text: string, maxChars = 280): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  // Cut at last sentence boundary before maxChars
  const cut = t.slice(0, maxChars);
  const lastDot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return lastDot > 80 ? t.slice(0, lastDot + 1) : cut + "...";
}

// ─── LOW CONFIDENCE ───────────────────────────────────────────────────────────

export function buildLowConfidenceNarration(lang: SupportedLanguage): string {
  switch (lang) {
    case "ta": return "இந்த நினைவுச்சின்னத்தை நம்பகமாக அடையாளம் காண முடியவில்லை. கட்டிடம் தெளிவாக தெரியும் கோணத்தில் இருந்து மீண்டும் ஸ்கேன் செய்யவும்.";
    case "hi": return "इस स्मारक को विश्वसनीय रूप से पहचाना नहीं जा सका। कृपया स्मारक को स्पष्ट रूप से देखते हुए दोबारा स्कैन करें।";
    case "te": return "ఈ స్మారకాన్ని నమ్మకంగా గుర్తించలేదు. స్మారకం స్పష్టంగా కనిపించే కోణం నుండి మళ్ళీ స్కాన్ చేయండి.";
    case "ml": return "ഈ സ്മാരകം വ്യക്തമായി തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. കൃത്യമായ ദിശയിൽ നിന്ന് വീണ്ടും സ്കാൻ ചെയ്യുക.";
    case "kn": return "ಈ ಸ್ಮಾರಕವನ್ನು ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಸ್ಪಷ್ಟ ಕೋನದಿಂದ ಮತ್ತೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.";
    default: return "I couldn't confidently identify this monument. Please try scanning from a clearer angle with the structure fully visible.";
  }
}

// ─── MEDIUM CONFIDENCE ────────────────────────────────────────────────────────

export function buildMediumConfidenceNarration(ctx: NarrationContext, lang: SupportedLanguage): string {
  const pct = Math.round(ctx.confidence * 100);
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const parts: string[] = [];

  switch (lang) {
    case "ta":
      parts.push(`இது ${name} ஆக இருக்கலாம். இனங்காணல் நம்பகத்தன்மை ${pct} சதவீதம்.`);
      if (place) parts.push(`இது ${place} இல் அமைந்துள்ளது.`);
      if (ctx.dynasty) parts.push(`இது ${ctx.dynasty} ஆட்சியில் கட்டப்பட்டது.`);
      const archTa = pick(ctx.architecture, ctx.description);
      if (archTa) parts.push(trimProse(archTa, 200));
      parts.push("நல்ல முடிவுக்கு வேறொரு கோணத்தில் மீண்டும் ஸ்கேன் செய்யலாம்.");
      break;
    case "hi":
      parts.push(`यह ${name} हो सकता है। पहचान विश्वसनीयता ${pct}% है।`);
      if (place) parts.push(`यह ${place} में स्थित है।`);
      if (ctx.dynasty) parts.push(`यह ${ctx.dynasty} के शासनकाल में बनाया गया था।`);
      const archHi = pick(ctx.architecture, ctx.description);
      if (archHi) parts.push(trimProse(archHi, 200));
      parts.push("बेहतर परिणाम के लिए किसी अन्य कोण से पुनः स्कैन करें।");
      break;
    default:
      parts.push(`This may be ${name}. Recognition confidence is ${pct}%.`);
      if (place) parts.push(`It is located in ${place}.`);
      if (ctx.dynasty) parts.push(`Built under the ${ctx.dynasty}.`);
      const archEn = pick(ctx.architecture, ctx.description);
      if (archEn) parts.push(trimProse(archEn, 200));
      parts.push("For a better result, try scanning from another angle.");
  }
  return parts.filter(Boolean).join(" ");
}

// ─── FULL 90-120 SECOND NARRATION (per language) ─────────────────────────────

function buildEnglishNarration(ctx: NarrationContext): string {
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.district, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  // 1 — Introduction
  const intro = place
    ? `Welcome. You are now looking at ${name}, located in ${place}.`
    : `Welcome. You are now looking at ${name}.`;
  sections.push(intro + " HERIXA has identified this monument with high confidence.");

  // 2 — Historical origin
  const histParts: string[] = [];
  if (ctx.ruler || ctx.builder) {
    const who = ctx.ruler || ctx.builder;
    histParts.push(`This monument was commissioned by ${who}.`);
  }
  if (ctx.dynasty && ctx.constructionPeriod) {
    histParts.push(`It was built during the ${ctx.constructionPeriod} under the ${ctx.dynasty}.`);
  } else if (ctx.dynasty && ctx.period) {
    histParts.push(`Built during the ${ctx.period}, it stands as a testament to the ${ctx.dynasty}.`);
  } else if (ctx.dynasty) {
    histParts.push(`It was created under the ${ctx.dynasty}.`);
  }
  const histProse = pick(ctx.historicalBackground, ctx.shortHistory, ctx.constructionHistory, ctx.originStory);
  if (histProse) histParts.push(trimProse(histProse, 280));
  const whyBuilt = pick(ctx.whyItWasBuilt);
  if (whyBuilt) histParts.push(trimProse(whyBuilt, 200));
  if (histParts.length) sections.push(histParts.join(" "));

  // 3 — Architecture
  const archParts: string[] = [];
  if (ctx.architecturalStyle) archParts.push(`${name} is a remarkable example of ${ctx.architecturalStyle} architecture.`);
  const archProse = pick(ctx.architecture);
  if (archProse) archParts.push(trimProse(archProse, 280));
  if (ctx.vimanaDetails) archParts.push(trimProse(ctx.vimanaDetails, 160));
  if (ctx.gopuramDetails) archParts.push(trimProse(ctx.gopuramDetails, 160));
  if (ctx.mandapaDetails) archParts.push(trimProse(ctx.mandapaDetails, 160));
  if (ctx.buildingMaterials) archParts.push(`The structure was built using ${ctx.buildingMaterials}.`);
  if (ctx.engineeringFeatures || ctx.uniqueArchitecturalFeatures) {
    archParts.push(trimProse(pick(ctx.engineeringFeatures, ctx.uniqueArchitecturalFeatures), 200));
  }
  if (ctx.architecturalHighlights && ctx.architecturalHighlights.length > 0) {
    archParts.push(`Key architectural highlights include: ${ctx.architecturalHighlights.slice(0, 3).join("; ")}.`);
  }
  if (archParts.length) sections.push(archParts.join(" "));

  // 4 — Sculptures, inscriptions, unique features
  const featParts: string[] = [];
  if (ctx.sculptureDetails) featParts.push(trimProse(ctx.sculptureDetails, 200));
  if (ctx.inscriptionDetails) featParts.push(trimProse(ctx.inscriptionDetails, 200));
  if (ctx.pillarDetails) featParts.push(trimProse(ctx.pillarDetails, 160));
  if (ctx.interestingFacts && ctx.interestingFacts.length > 0) {
    featParts.push(`Here is something remarkable: ${ctx.interestingFacts.slice(0, 2).join(" Also, ")}`);
  }
  if (featParts.length) sections.push(featParts.join(" "));

  // 5 — Cultural significance
  const cultParts: string[] = [];
  if (ctx.unescoStatus && ctx.unescoStatus.toLowerCase().includes("world heritage")) {
    const yr = ctx.unescoYear ? ` in ${ctx.unescoYear}` : "";
    cultParts.push(`${name} has been recognized as a UNESCO World Heritage Site${yr}.`);
  }
  const cultProse = pick(ctx.culturalImportance, ctx.culturalSignificance);
  if (cultProse) cultParts.push(trimProse(cultProse, 250));
  const relProse = pick(ctx.religiousImportance);
  if (relProse) cultParts.push(trimProse(relProse, 200));
  const histSig = pick(ctx.historicalSignificance);
  if (histSig) cultParts.push(trimProse(histSig, 250));
  if (cultParts.length) sections.push(cultParts.join(" "));

  // 6 — Tourism & visiting
  const tourParts: string[] = [];
  if (ctx.bestTimeToVisit) tourParts.push(`The best time to visit ${name} is ${ctx.bestTimeToVisit}.`);
  if (ctx.visitingInformation) tourParts.push(trimProse(ctx.visitingInformation, 200));
  if (ctx.nearbyPlaces && ctx.nearbyPlaces.length > 0) {
    tourParts.push(`Nearby heritage sites include ${ctx.nearbyPlaces.slice(0, 2).join(" and ")}.`);
  }
  if (tourParts.length) sections.push(tourParts.join(" "));

  // 7 — Closing
  sections.push(`${name} is more than an architectural structure — it is a living record of the civilization that created it. You can now explore its full heritage information or experience it in an immersive 3D view within HERIXA.`);

  return sections.filter(Boolean).join("\n\n");
}

function buildTamilNarration(ctx: NarrationContext): string {
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  // 1 — Introduction
  sections.push(
    place
      ? `வணக்கம். நீங்கள் இப்போது ${place} இல் அமைந்துள்ள ${name} ஐ பார்க்கிறீர்கள். HERIXA இந்த நினைவுச்சின்னத்தை அதிக நம்பகத்தன்மையுடன் அடையாளம் காண்கிறது.`
      : `வணக்கம். நீங்கள் இப்போது ${name} ஐ பார்க்கிறீர்கள். HERIXA இந்த நினைவுச்சின்னத்தை அடையாளம் காண்கிறது.`
  );

  // 2 — History (use English prose + Tamil framing for DB content)
  const histParts: string[] = [];
  if (ctx.ruler || ctx.builder) {
    histParts.push(`இந்த நினைவுச்சின்னத்தை ${ctx.ruler || ctx.builder} கட்டியுள்ளார்கள்.`);
  }
  if (ctx.dynasty && ctx.period) {
    histParts.push(`இது ${ctx.period} காலத்தில் ${ctx.dynasty} ஆட்சியில் கட்டப்பட்டது.`);
  } else if (ctx.dynasty) {
    histParts.push(`இது ${ctx.dynasty} ஆட்சியில் கட்டப்பட்டது.`);
  }
  const hist = pick(ctx.historicalBackground, ctx.shortHistory, ctx.description);
  if (hist) histParts.push(trimProse(hist, 280));
  if (histParts.length) sections.push(histParts.join(" "));

  // 3 — Architecture
  const archParts: string[] = [];
  if (ctx.architecturalStyle) {
    archParts.push(`${name} என்பது ${ctx.architecturalStyle} கட்டிடக்கலையின் சிறந்த எடுத்துக்காட்டு.`);
  }
  const arch = pick(ctx.architecture);
  if (arch) archParts.push(trimProse(arch, 280));
  if (ctx.vimanaDetails) archParts.push(`விமானம்: ${trimProse(ctx.vimanaDetails, 150)}`);
  if (ctx.gopuramDetails) archParts.push(`கோபுரம்: ${trimProse(ctx.gopuramDetails, 150)}`);
  if (ctx.architecturalHighlights && ctx.architecturalHighlights.length > 0) {
    archParts.push(`கட்டிடக்கலை சிறப்புகள்: ${ctx.architecturalHighlights.slice(0, 3).join("; ")}.`);
  }
  if (ctx.buildingMaterials) archParts.push(`இந்த கட்டிடம் ${ctx.buildingMaterials} கொண்டு கட்டப்பட்டது.`);
  if (archParts.length) sections.push(archParts.join(" "));

  // 4 — Sculptures & Features
  const featParts: string[] = [];
  if (ctx.sculptureDetails) featParts.push(`சிற்பங்கள்: ${trimProse(ctx.sculptureDetails, 200)}`);
  if (ctx.interestingFacts && ctx.interestingFacts.length > 0) {
    featParts.push(`சுவாரஸ்யமான உண்மை: ${ctx.interestingFacts.slice(0, 2).join(". மேலும், ")}.`);
  }
  if (featParts.length) sections.push(featParts.join(" "));

  // 5 — Cultural significance
  const cultParts: string[] = [];
  if (ctx.unescoStatus && ctx.unescoStatus.toLowerCase().includes("world heritage")) {
    cultParts.push(`${name} யுனெஸ்கோ உலக பாரம்பரிய தளமாக அங்கீகரிக்கப்பட்டுள்ளது.`);
  }
  const cult = pick(ctx.culturalImportance, ctx.culturalSignificance);
  if (cult) cultParts.push(trimProse(cult, 250));
  const rel = pick(ctx.religiousImportance);
  if (rel) cultParts.push(trimProse(rel, 200));
  const sig = pick(ctx.historicalSignificance);
  if (sig) cultParts.push(trimProse(sig, 250));
  if (cultParts.length) sections.push(cultParts.join(" "));

  // 6 — Tourism
  const tourParts: string[] = [];
  if (ctx.bestTimeToVisit) tourParts.push(`${name} ஐ சுற்றுலாவுக்கு சிறந்த நேரம்: ${ctx.bestTimeToVisit}.`);
  if (ctx.nearbyPlaces && ctx.nearbyPlaces.length > 0) {
    tourParts.push(`அருகிலுள்ள தளங்கள்: ${ctx.nearbyPlaces.slice(0, 2).join(", ")}.`);
  }
  if (tourParts.length) sections.push(tourParts.join(" "));

  // 7 — Closing
  sections.push(`${name} என்பது ஒரு கட்டிடம் மட்டுமல்ல — இது அதை உருவாக்கிய நாகரிகத்தின் உயிரோட்டமான சாட்சி. HERIXA இல் முழுமையான பாரம்பரிய தகவல்களையும் 3D காட்சியையும் ஆராயுங்கள்.`);

  return sections.filter(Boolean).join("\n\n");
}

function buildHindiNarration(ctx: NarrationContext): string {
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  sections.push(
    place
      ? `नमस्ते। आप अभी ${place} में स्थित ${name} को देख रहे हैं। HERIXA ने इस स्मारक को उच्च विश्वसनीयता के साथ पहचाना है।`
      : `नमस्ते। आप अभी ${name} को देख रहे हैं। HERIXA ने इस स्मारक को पहचाना है।`
  );

  const histParts: string[] = [];
  if (ctx.ruler || ctx.builder) histParts.push(`यह स्मारक ${ctx.ruler || ctx.builder} द्वारा निर्मित है।`);
  if (ctx.dynasty && ctx.period) histParts.push(`यह ${ctx.period} में ${ctx.dynasty} के शासनकाल में बनाया गया था।`);
  else if (ctx.dynasty) histParts.push(`यह ${ctx.dynasty} के शासनकाल में बनाया गया था।`);
  const hist = pick(ctx.historicalBackground, ctx.shortHistory, ctx.description);
  if (hist) histParts.push(trimProse(hist, 280));
  if (histParts.length) sections.push(histParts.join(" "));

  const archParts: string[] = [];
  if (ctx.architecturalStyle) archParts.push(`${name} ${ctx.architecturalStyle} वास्तुकला का एक उत्कृष्ट उदाहरण है।`);
  const arch = pick(ctx.architecture);
  if (arch) archParts.push(trimProse(arch, 280));
  if (ctx.vimanaDetails) archParts.push(trimProse(ctx.vimanaDetails, 160));
  if (ctx.buildingMaterials) archParts.push(`यह ${ctx.buildingMaterials} से निर्मित है।`);
  if (ctx.architecturalHighlights && ctx.architecturalHighlights.length > 0) {
    archParts.push(`वास्तुकला की विशेषताएं: ${ctx.architecturalHighlights.slice(0, 3).join("; ")}.`);
  }
  if (archParts.length) sections.push(archParts.join(" "));

  const featParts: string[] = [];
  if (ctx.sculptureDetails) featParts.push(trimProse(ctx.sculptureDetails, 200));
  if (ctx.interestingFacts && ctx.interestingFacts.length > 0) {
    featParts.push(`कुछ रोचक तथ्य: ${ctx.interestingFacts.slice(0, 2).join(". इसके अलावा, ")}.`);
  }
  if (featParts.length) sections.push(featParts.join(" "));

  const cultParts: string[] = [];
  if (ctx.unescoStatus && ctx.unescoStatus.toLowerCase().includes("world heritage")) {
    cultParts.push(`${name} को यूनेस्को विश्व धरोहर स्थल के रूप में मान्यता प्राप्त है।`);
  }
  const cult = pick(ctx.culturalImportance, ctx.culturalSignificance);
  if (cult) cultParts.push(trimProse(cult, 250));
  const sig = pick(ctx.historicalSignificance);
  if (sig) cultParts.push(trimProse(sig, 250));
  if (cultParts.length) sections.push(cultParts.join(" "));

  const tourParts: string[] = [];
  if (ctx.bestTimeToVisit) tourParts.push(`यहां आने का सबसे अच्छा समय ${ctx.bestTimeToVisit} है।`);
  if (ctx.nearbyPlaces && ctx.nearbyPlaces.length > 0) {
    tourParts.push(`निकटवर्ती स्थान: ${ctx.nearbyPlaces.slice(0, 2).join(" और ")}.`);
  }
  if (tourParts.length) sections.push(tourParts.join(" "));

  sections.push(`${name} केवल एक वास्तुशिल्प संरचना नहीं है — यह उस सभ्यता का जीवंत प्रमाण है जिसने इसे बनाया था। HERIXA में पूरी जानकारी और 3D दृश्य का अन्वेषण करें।`);

  return sections.filter(Boolean).join("\n\n");
}

function buildTeluguNarration(ctx: NarrationContext): string {
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  sections.push(
    place
      ? `నమస్కారం. మీరు ఇప్పుడు ${place} లో ఉన్న ${name} చూస్తున్నారు. HERIXA ఈ స్మారకాన్ని అధిక విశ్వాసంతో గుర్తించింది.`
      : `నమస్కారం. మీరు ఇప్పుడు ${name} చూస్తున్నారు.`
  );

  const histParts: string[] = [];
  if (ctx.ruler || ctx.builder) histParts.push(`ఈ స్మారకాన్ని ${ctx.ruler || ctx.builder} నిర్మించారు.`);
  if (ctx.dynasty && ctx.period) histParts.push(`ఇది ${ctx.period} లో ${ctx.dynasty} పాలనలో నిర్మించబడింది.`);
  const hist = pick(ctx.historicalBackground, ctx.shortHistory, ctx.description);
  if (hist) histParts.push(trimProse(hist, 280));
  if (histParts.length) sections.push(histParts.join(" "));

  const archParts: string[] = [];
  if (ctx.architecturalStyle) archParts.push(`${name} ${ctx.architecturalStyle} నిర్మాణ శైలికి అద్భుతమైన ఉదాహరణ.`);
  const arch = pick(ctx.architecture);
  if (arch) archParts.push(trimProse(arch, 280));
  if (ctx.architecturalHighlights && ctx.architecturalHighlights.length > 0) {
    archParts.push(`నిర్మాణ విశేషాలు: ${ctx.architecturalHighlights.slice(0, 3).join("; ")}.`);
  }
  if (archParts.length) sections.push(archParts.join(" "));

  const cultParts: string[] = [];
  if (ctx.unescoStatus && ctx.unescoStatus.toLowerCase().includes("world heritage")) {
    cultParts.push(`${name} UNESCO ప్రపంచ వారసత్వ స్థలంగా గుర్తింపు పొందింది.`);
  }
  const cult = pick(ctx.culturalImportance, ctx.culturalSignificance);
  if (cult) cultParts.push(trimProse(cult, 250));
  if (cultParts.length) sections.push(cultParts.join(" "));

  if (ctx.bestTimeToVisit) sections.push(`సందర్శించడానికి అత్యుత్తమ సమయం: ${ctx.bestTimeToVisit}.`);

  sections.push(`${name} కేవలం ఒక నిర్మాణం మాత్రమే కాదు — ఇది దాన్ని నిర్మించిన నాగరికత యొక్క జీవంతమైన సాక్ష్యం. HERIXA లో పూర్తి వివరాలు మరియు 3D వీక్షణను అన్వేషించండి.`);

  return sections.filter(Boolean).join("\n\n");
}

function buildMalayalamNarration(ctx: NarrationContext): string {
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  sections.push(
    place
      ? `നമസ്കാരം. നിങ്ങൾ ഇപ്പോൾ ${place} ൽ സ്ഥിതിചെയ്യുന്ന ${name} കാണുകയാണ്. HERIXA ഈ സ്മാരകം ഉയർന്ന ആത്മവിശ്വാസത്തോടെ തിരിച്ചറിഞ്ഞിരിക്കുന്നു.`
      : `നമസ്കാരം. നിങ്ങൾ ഇപ്പോൾ ${name} കാണുകയാണ്.`
  );

  const histParts: string[] = [];
  if (ctx.ruler || ctx.builder) histParts.push(`ഈ സ്മാരകം ${ctx.ruler || ctx.builder} നിർമ്മിച്ചതാണ്.`);
  if (ctx.dynasty && ctx.period) histParts.push(`ഇത് ${ctx.period} ൽ ${ctx.dynasty} ഭരണകാലത്ത് നിർമ്മിക്കപ്പെട്ടു.`);
  const hist = pick(ctx.historicalBackground, ctx.shortHistory, ctx.description);
  if (hist) histParts.push(trimProse(hist, 280));
  if (histParts.length) sections.push(histParts.join(" "));

  const archParts: string[] = [];
  if (ctx.architecturalStyle) archParts.push(`${name} ${ctx.architecturalStyle} വാസ്തുവിദ്യയുടെ ഒരു മികച്ച ഉദാഹരണമാണ്.`);
  const arch = pick(ctx.architecture);
  if (arch) archParts.push(trimProse(arch, 280));
  if (ctx.architecturalHighlights && ctx.architecturalHighlights.length > 0) {
    archParts.push(`വാസ്തുവിദ്യാ സവിശേഷതകൾ: ${ctx.architecturalHighlights.slice(0, 3).join("; ")}.`);
  }
  if (archParts.length) sections.push(archParts.join(" "));

  const cultParts: string[] = [];
  if (ctx.unescoStatus && ctx.unescoStatus.toLowerCase().includes("world heritage")) {
    cultParts.push(`${name} UNESCO ലോക പൈതൃക സൈറ്റായി അംഗീകരിക്കപ്പെട്ടിരിക്കുന്നു.`);
  }
  const cult = pick(ctx.culturalImportance, ctx.culturalSignificance);
  if (cult) cultParts.push(trimProse(cult, 250));
  if (cultParts.length) sections.push(cultParts.join(" "));

  if (ctx.bestTimeToVisit) sections.push(`സന്ദർശനത്തിനുള്ള ഏറ്റവും നല്ല സമയം: ${ctx.bestTimeToVisit}.`);

  sections.push(`${name} ഒരു വാസ്തുവിദ്യാ ഘടന മാത്രമല്ല — ഇത് അതിനെ സൃഷ്ടിച്ച നാഗരികതയുടെ ജീവനുള്ള സാക്ഷ്യമാണ്. HERIXA ൽ പൂർണ്ണ വിവരങ്ങളും 3D കാഴ്ചയും പര്യവേക്ഷണം ചെയ്യുക.`);

  return sections.filter(Boolean).join("\n\n");
}

function buildKannadaNarration(ctx: NarrationContext): string {
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  sections.push(
    place
      ? `ನಮಸ್ಕಾರ. ನೀವು ಈಗ ${place} ನಲ್ಲಿರುವ ${name} ಅನ್ನು ನೋಡುತ್ತಿದ್ದೀರಿ. HERIXA ಈ ಸ್ಮಾರಕವನ್ನು ಹೆಚ್ಚಿನ ವಿಶ್ವಾಸದಿಂದ ಗುರುತಿಸಿದೆ.`
      : `ನಮಸ್ಕಾರ. ನೀವು ಈಗ ${name} ಅನ್ನು ನೋಡುತ್ತಿದ್ದೀರಿ.`
  );

  const histParts: string[] = [];
  if (ctx.ruler || ctx.builder) histParts.push(`ಈ ಸ್ಮಾರಕವನ್ನು ${ctx.ruler || ctx.builder} ನಿರ್ಮಿಸಿದರು.`);
  if (ctx.dynasty && ctx.period) histParts.push(`ಇದನ್ನು ${ctx.period} ನಲ್ಲಿ ${ctx.dynasty} ಆಳ್ವಿಕೆಯ ಅಡಿಯಲ್ಲಿ ನಿರ್ಮಿಸಲಾಯಿತು.`);
  const hist = pick(ctx.historicalBackground, ctx.shortHistory, ctx.description);
  if (hist) histParts.push(trimProse(hist, 280));
  if (histParts.length) sections.push(histParts.join(" "));

  const archParts: string[] = [];
  if (ctx.architecturalStyle) archParts.push(`${name} ${ctx.architecturalStyle} ವಾಸ್ತುಶಿಲ್ಪದ ಒಂದು ಅದ್ಭುತ ಉದಾಹರಣೆ.`);
  const arch = pick(ctx.architecture);
  if (arch) archParts.push(trimProse(arch, 280));
  if (ctx.architecturalHighlights && ctx.architecturalHighlights.length > 0) {
    archParts.push(`ವಾಸ್ತುಶಿಲ್ಪ ವೈಶಿಷ್ಟ್ಯಗಳು: ${ctx.architecturalHighlights.slice(0, 3).join("; ")}.`);
  }
  if (archParts.length) sections.push(archParts.join(" "));

  const cultParts: string[] = [];
  if (ctx.unescoStatus && ctx.unescoStatus.toLowerCase().includes("world heritage")) {
    cultParts.push(`${name} UNESCO ವಿಶ್ವ ಪರಂಪರೆ ತಾಣವಾಗಿ ಗುರುತಿಸಲ್ಪಟ್ಟಿದೆ.`);
  }
  const cult = pick(ctx.culturalImportance, ctx.culturalSignificance);
  if (cult) cultParts.push(trimProse(cult, 250));
  if (cultParts.length) sections.push(cultParts.join(" "));

  if (ctx.bestTimeToVisit) sections.push(`ಭೇಟಿ ನೀಡಲು ಅತ್ಯುತ್ತಮ ಸಮಯ: ${ctx.bestTimeToVisit}.`);

  sections.push(`${name} ಕೇವಲ ವಾಸ್ತುಶಿಲ್ಪ ರಚನೆ ಮಾತ್ರವಲ್ಲ — ಇದು ಅದನ್ನು ನಿರ್ಮಿಸಿದ ನಾಗರಿಕತೆಯ ಜೀವಂತ ದಾಖಲೆ. HERIXA ನಲ್ಲಿ ಪೂರ್ಣ ವಿವರಗಳು ಮತ್ತು 3D ವೀಕ್ಷಣೆಯನ್ನು ಅನ್ವೇಷಿಸಿ.`);

  return sections.filter(Boolean).join("\n\n");
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function buildSuccessNarration(ctx: NarrationContext, lang: SupportedLanguage): string {
  switch (lang) {
    case "ta": return buildTamilNarration(ctx);
    case "hi": return buildHindiNarration(ctx);
    case "te": return buildTeluguNarration(ctx);
    case "ml": return buildMalayalamNarration(ctx);
    case "kn": return buildKannadaNarration(ctx);
    default:   return buildEnglishNarration(ctx);
  }
}

export function buildNarration(ctx: NarrationContext, lang: SupportedLanguage): string {
  if (ctx.confidence >= HIGH_CONFIDENCE) return buildSuccessNarration(ctx, lang);
  if (ctx.confidence >= MEDIUM_CONFIDENCE) return buildMediumConfidenceNarration(ctx, lang);
  return buildLowConfidenceNarration(lang);
}

/**
 * Split a narration into speech-safe chunks by paragraph boundaries.
 * Expo Speech handles ~500 chars per call safely on most devices.
 */
export function splitIntoChunks(narration: string, maxChars = 480): string[] {
  const paragraphs = narration.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      chunks.push(para);
    } else {
      // Split long paragraph at sentence boundaries
      const sentences = para.split(/(?<=[.!?])\s+/);
      let current = "";
      for (const sentence of sentences) {
        if ((current + " " + sentence).trim().length > maxChars) {
          if (current.trim()) chunks.push(current.trim());
          current = sentence;
        } else {
          current = current ? current + " " + sentence : sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }

  return chunks.filter(c => c.length > 0);
}
