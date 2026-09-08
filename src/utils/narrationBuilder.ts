/**
 * HERIXA Full Heritage Narration Builder
 * Generates natural 90-120 second monument narrations in 6 languages.
 * Uses actual MongoDB monument data — never fabricates facts.
 * Supports speech chunking for long-text TTS.
 */

import { sanitizeAndValidateLanguageText } from '../services/monumentVoiceGuideService';
// NOTE: getMonumentVoiceGuide / getHowToExperienceGuide are NOT imported here.
// Heritage History and How to Experience are completely separate services.
// History = past story (this file). HTE = present visitor guide (monumentVoiceGuideService.ts).

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
  const cut = t.slice(0, maxChars);
  const lastDot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return lastDot > 80 ? t.slice(0, lastDot + 1) : cut + "...";
}

/** Normalize monument ID/name/slug to canonical heritage history key */
function normalizeToHistoryKey(rawIdOrName?: string): string {
  if (!rawIdOrName) return '';
  const clean = rawIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('brihadees') || clean.includes('peruvudaiyar') || clean.includes('thanjavur') || clean.includes('bigtemple')) return 'brihadeeswarar';
  if (clean.includes('meenakshi') || clean.includes('maduraiamman')) return 'meenakshi-amman';
  if (clean.includes('mahabali') || clean.includes('mamalla') || clean.includes('shore')) return 'mahabalipuram';
  if (clean.includes('airavate') || clean.includes('darasuram')) return 'airavatesvara';
  if (clean.includes('gangai') || clean.includes('gangaikonda') || clean.includes('cholapuram')) return 'gangaikonda-cholapuram';
  if (clean.includes('thirumalai') || clean.includes('nayakkar') || clean.includes('nayak')) return 'thirumalai-nayakkar';
  return '';
}

// ─── DEDICATED HERITAGE HISTORY NARRATIONS ────────────────────────────────────
// One continuous historically accurate story per monument per language.
// NO headings, NO bullet markers — pure spoken prose.
// NEVER call getMonumentVoiceGuide / getHowToExperienceGuide here.

const MONUMENT_HISTORY_NARRATIONS: Record<string, Partial<Record<SupportedLanguage, string>>> = {

  'brihadeeswarar': {
    en: `The Brihadeesvarar Temple, known locally as the Big Temple, stands as one of the greatest architectural achievements of the Chola dynasty. It was commissioned by the emperor Rajaraja Chola the First, who reigned from 985 to 1014 of the Common Era, and was consecrated around the year 1010. Rajaraja built this temple not merely as a place of worship, but as a profound expression of Chola imperial power and his personal devotion to Lord Shiva. Located in Thanjavur in Tamil Nadu, the temple was constructed primarily from granite. Its vimana, the great pyramidal tower above the main sanctum, rises to approximately 66 metres in height, making it one of the tallest temple towers built in ancient India. The Chola craftsmen transported granite from considerable distances and shaped it with extraordinary precision. A celebrated phenomenon associated with this vimana is that at noon, its shadow does not fall on the surrounding ground, a feat of planning that continues to attract architectural study to this day. The outer walls are inscribed with thousands of Tamil inscriptions recording the administrative and cultural life of the Chola empire. A massive Nandi, carved from a single block of stone, guards the approach to the sanctum. Over the centuries, the Brihadeesvarar Temple survived the ebb and flow of dynastic history, and was recognised as a UNESCO World Heritage Site in 1987 as part of the Great Living Chola Temples. Today it remains both an active place of worship and a monument that speaks to the ambition and refinement of Chola civilisation.`,
    ta: `பிரகடீஸ்வரர் கோவில், பெரிய கோவில் என்று பரவலாக அழைக்கப்படும் இத்தலம், சோழ வம்சத்தின் மிகப் பெருமையான கட்டிடக்கலை சாதனையாகும். 985 முதல் 1014 ஆம் ஆண்டுவரை ஆட்சி செய்த சோழப் பேரரசன் ஒன்றாம் ராஜராஜ சோழனால் கட்டுவிக்கப்பட்டு, கி.பி. சுமார் 1010 ஆம் ஆண்டில் திருமஞ்சனம் செய்யப்பட்டது. ராஜராஜன் இந்தக் கோவிலை சோழ சாம்ராஜ்யத்தின் மகத்தான சக்தியையும் சிவபெருமானிடத்தில் தன் ஆழமான பக்தியையும் வெளிப்படுத்தும் வகையில் நிர்மாணித்தார். தஞ்சாவூரில் அமைந்திருக்கும் இந்தக் கோவில் முழுவதும் கரிங்கல்லால் கட்டப்பட்டது. முதன்மை சன்னதியின் மேல் உயர்ந்து நிற்கும் விமானம் சுமார் 66 மீட்டர் உயரம் கொண்டது, இது பண்டைய இந்தியாவில் கட்டப்பட்ட மிக உயரமான கோவில் கோபுரங்களில் ஒன்றாகும். இந்த விமானத்தின் மிகவும் பேசப்படும் சிறப்பு என்னவெனில், நண்பகல் நேரத்தில் அதன் நிழல் தரையில் விழாது என்பதாகும். கோவிலின் வெளிச்சுவர்களில் ஆயிரக்கணக்கான தமிழ் கல்வெட்டுகள் பொறிக்கப்பட்டுள்ளன. ஒரே கல்லில் செதுக்கப்பட்ட மாபெரும் நந்தி சிலை சன்னதியின் முன்னே காவல் நிற்கிறது. 1987 ஆம் ஆண்டு மாபெரும் சோழர் கோவில்கள் என்ற பட்டியலில் யுனெஸ்கோ உலக பாரம்பரிய தளமாக அங்கீகரிக்கப்பட்டது. இன்றும் இது ஒரு வழிபாட்டுத் தலமாகவும் உலக பாரம்பரிய சின்னமாகவும் தொடர்ந்து விளங்கி, சோழர் நாகரிகத்தின் மேன்மையை நமக்கு நினைவூட்டுகிறது.`,
    hi: `बृहदेश्वर मंदिर, जिसे बड़ा मंदिर भी कहा जाता है, चोल राजवंश की सबसे महान वास्तुकला उपलब्धि के रूप में खड़ा है। इसे महान सम्राट राजराज चोल प्रथम ने बनवाया था, जिन्होंने 985 से 1014 ईस्वी तक शासन किया। मंदिर का अभिषेक लगभग 1010 ईस्वी में हुआ। राजराज ने इस मंदिर को न केवल पूजा स्थान, बल्कि चोल शाही शक्ति और भगवान शिव के प्रति भक्ति की अभिव्यक्ति के रूप में बनवाया। तमिलनाडु के तंजावुर में स्थित यह मंदिर मुख्यतः ग्रेनाइट से बना है। मुख्य गर्भगृह के ऊपर स्थित विमान लगभग 66 मीटर की ऊंचाई तक उठता है। इस विमान की एक प्रसिद्ध विशेषता यह है कि दोपहर के समय इसकी छाया जमीन पर नहीं पड़ती। मंदिर की बाहरी दीवारें हजारों तमिल शिलालेखों से ढकी हैं। एक ही पत्थर से बना विशाल नंदी मंदिर के प्रवेश मार्ग की रक्षा करता है। 1987 में इसे महान जीवित चोल मंदिरों के रूप में यूनेस्को विश्व धरोहर स्थल का दर्जा मिला। आज बृहदेश्वर मंदिर एक सक्रिय पूजा स्थल और चोल सभ्यता की प्रतिभा का जीवंत प्रमाण बना हुआ है।`,
    te: `బృహదీశ్వర దేవాలయం, పెద్ద దేవాలయం అని కూడా పిలవబడే ఈ ఆలయం, చోళ రాజవంశం యొక్క అత్యంత గొప్ప వాస్తుశిల్ప సాధనగా నిలుస్తుంది. 985 నుండి 1014 సి.ఇ. వరకు పాలించిన మొదటి రాజరాజ చోళుని చేత నిర్మించబడి, దాదాపు 1010 సి.ఇ. లో ప్రతిష్ఠించబడింది. తమిళనాడులోని తంజావూరులో ఉన్న ఈ ఆలయం ప్రధానంగా గ్రానైట్ తో నిర్మించబడింది. విమానం దాదాపు 66 మీటర్ల ఎత్తుకు చేరుకుంటుంది. మధ్యాహ్నం సమయంలో విమానం నీడ నేలపై పడదు అనే అద్భుతమైన ఇంజనీరింగ్ వాస్తవం నేటికీ అధ్యయన విషయంగా ఉంది. వేలాది తమిళ శాసనాలు ఆలయం బయటి గోడలపై చెక్కబడ్డాయి. 1987 లో UNESCO ప్రపంచ వారసత్వ స్థలంగా గుర్తించబడింది. నేటికీ ఇది జీవంతమైన ఆరాధనా స్థలం మరియు చోళ నాగరికత యొక్క సాక్ష్యంగా నిలుస్తుంది.`,
    ml: `ബൃഹദീശ്വര ക്ഷേത്രം, ബിഗ് ടെമ്പിൾ എന്നും അറിയപ്പെടുന്ന ഈ ക്ഷേത്രം, ചോള രാജവംശത്തിന്റെ ഏറ്റവും മഹത്തായ വാസ്തുവിദ്യാ സൃഷ്ടിയാണ്. 985 മുതൽ 1014 സി.ഇ. വരെ ഭരിച്ച ഒന്നാം രാജരാജ ചോളൻ ഇത് നിർമ്മിക്കാൻ ആദേശിച്ചു, ഏകദേശം 1010 സി.ഇ. ൽ ക്ഷേത്രം പ്രതിഷ്ഠിക്കപ്പെട്ടു. തമിഴ്‌നാട്ടിലെ തഞ്ചാവൂരിൽ ഗ്രാനൈറ്റ് കൊണ്ടു നിർമ്മിച്ച ഈ ക്ഷേത്രം ഏകദേശം 66 മീറ്ററോളം ഉയർന്ന് നിൽക്കുന്നു. ഉച്ചസമയത്ത് ഈ ഘടനയുടെ നിഴൽ നിലത്ത് വീഴില്ല എന്നത് ഒരു ഗണ്യമായ ഇഞ്ചിനീയറിംഗ് നേട്ടമാണ്. 1987-ൽ UNESCO ലോക പൈതൃക സൈറ്റായി അംഗീകൃതമായി. ഇന്നും ഇത് ഒരു സജീവ ആരാധനാ കേന്ദ്രവും ചോള സംസ്കാരത്തിന്റെ ജീവനുള്ള സാക്ഷ്യവുമായി നിലകൊള്ളുന്നു.`,
    kn: `ಬೃಹದೀಶ್ವರ ದೇವಾಲಯ, ದೊಡ್ಡ ದೇವಾಲಯ ಎಂದೂ ಕರೆಯಲ್ಪಡುವ ಇದು, ಚೋಳ ರಾಜವಂಶದ ಅತ್ಯಂತ ಮಹತ್ತರ ವಾಸ್ತುಶಿಲ್ಪ ಸಾಧನೆಯಾಗಿದೆ. 985 ರಿಂದ 1014 ಸಿ.ಇ. ವರೆಗೆ ಆಳಿದ ಮೊದಲನೇ ರಾಜರಾಜ ಚೋಳನಿಂದ ನಿರ್ಮಿಸಲ್ಪಟ್ಟು, ಸುಮಾರು 1010 ಸಿ.ಇ. ಯಲ್ಲಿ ಪ್ರತಿಷ್ಠಾಪನೆಗೊಂಡಿತು. ತಂಜಾವೂರಿನಲ್ಲಿ ಗ್ರಾನೈಟ್‌ನಿಂದ ನಿರ್ಮಿಸಲ್ಪಟ್ಟ ಈ ದೇವಾಲಯ ವಿಮಾನ ಸುಮಾರು 66 ಮೀಟರ್ ಎತ್ತರಕ್ಕೆ ಏರುತ್ತದೆ. 1987 ರಲ್ಲಿ UNESCO ವಿಶ್ವ ಪರಂಪರೆ ತಾಣ ಮಾನ್ಯತೆ ಪಡೆಯಿತು. ಇಂದಿಗೂ ಇದು ಜೀವಂತ ಆರಾಧನಾ ಕೇಂದ್ರ ಮತ್ತು ಚೋಳ ನಾಗರಿಕತೆಯ ಸ್ಮರಣೆಯಾಗಿ ನಿಲ್ಲುತ್ತದೆ.`,
  },

  'meenakshi-amman': {
    en: `The Meenakshi Amman Temple in Madurai is one of the most celebrated temple complexes in southern India. Its origins reach deep into the history of the Pandya dynasty, one of the ancient kingdoms of Tamil Nadu. Ancient texts describe Madurai as a great Pandya city, and the veneration of the goddess Meenakshi at this site is among the most enduring traditions of Tamil cultural and religious life. The Pandya rulers built and patronised temples at this location over many centuries, establishing Madurai as a major centre of faith. The present architectural character of the temple was largely shaped during the Nayak period, when the Nayak kings — particularly during the seventeenth century — undertook extensive construction that gave the complex its current magnificent form. The temple is dedicated to Goddess Meenakshi, a form of the divine Parvati, and to Lord Sundareswarar, a form of Shiva. It is renowned for its fourteen magnificent gopurams, the sculptured gateway towers that rise above the city, with the tallest reaching approximately 52 metres. These gopurams are encrusted with thousands of colourful sculptured figures from Hindu mythology. Inside, the Hall of Thousand Pillars — the Airakkal Mandapam — is an extraordinary example of Nayak craftsmanship. The temple has continued as an active centre of worship without interruption for centuries, and remains one of the most visited religious sites in India, a symbol of the living heritage of Madurai and Tamil civilisation.`,
    ta: `மதுரையில் அமைந்துள்ள மீனாட்சி அம்மன் கோவில் தென்னிந்தியாவில் மிகவும் பிரபலமான கோவில் வளாகங்களில் ஒன்றாகும். இதன் வேர்கள் பாண்டிய வம்சத்தின் நீண்ட வரலாற்றில் ஆழமாக பதிந்துள்ளன. பண்டைய இலக்கியங்கள் மதுரையை பாண்டியர்களின் தலைமை நகரமாகவும், இங்கு மீனாட்சி தேவியை வழிபடும் மரபு தமிழ் பண்பாட்டின் மிகப் பழைமையான மத நடைமுறைகளில் ஒன்று என்றும் குறிப்பிடுகின்றன. பாண்டிய மன்னர்கள் பல நூற்றாண்டுகளாக இங்கு கோவில்களை கட்டிக் காத்தனர். இன்று நாம் காணும் கட்டிடக்கலை வடிவம் பெரும்பாலும் நாயக்க காலத்தில் உருவானது. குறிப்பாக பதினேழாம் நூற்றாண்டில் நாயக்க மன்னர்கள் கோவிலை விரிவாக்கி புதுப்பித்து இன்றைய மாபெரும் வடிவம் அளித்தனர். கோவில் மீனாட்சி அம்மன் மற்றும் சுந்தரேஸ்வரனுக்கு அர்ப்பணிக்கப்பட்டுள்ளது. பதினான்கு மாபெரும் கோபுரங்கள் மதுரை நகரின் வானத்தில் உயர்ந்து நிற்கின்றன. அவற்றில் உயரமானது சுமார் 52 மீட்டர் உயரம் கொண்டது. கோவிலுக்குள் ஆயிரக்கால் மண்டபம் நாயக்க கலைஞர்களின் நுட்பமான சிற்பவேலை நிறைந்த கல்தூண்களால் திகழ்கிறது. பல நூற்றாண்டுகளாக தொடர்ச்சியான வழிபாட்டு மரபுடன் வாழும் இந்தக் கோவில், இன்று மதுரையின் மற்றும் தமிழ் நாகரிகத்தின் உயிர்த்துடிப்பான பாரம்பரியத்தின் அடையாளமாக திகழ்கிறது.`,
    hi: `मदुरै में स्थित मीनाक्षी अम्मन मंदिर दक्षिण भारत के सबसे प्रसिद्ध मंदिर परिसरों में से एक है। इसकी जड़ें पांड्य वंश के लंबे इतिहास में गहराई से समाई हुई हैं। वर्तमान वास्तुकला का स्वरूप मुख्यतः नायक काल में आकार लिया, विशेषकर सत्रहवीं शताब्दी में। मंदिर देवी मीनाक्षी और भगवान सुंदरेश्वरर को समर्पित है। चौदह विशाल गोपुरम मदुरै के आकाश में उठते हैं, सबसे ऊंचा लगभग 52 मीटर। हजार स्तम्भ हॉल नायक शिल्पकला का अद्भुत उदाहरण है। यह मंदिर सदियों से निरंतर पूजा का केंद्र बना हुआ है।`,
    te: `మదురైలో ఉన్న మీనాక్షి అమ్మన్ ఆలయం దక్షిణ భారతదేశంలో అత్యంత ప్రసిద్ధ ఆలయ సముదాయాలలో ఒకటి. పాండ్య పాలకులు శతాబ్దాలుగా ఇక్కడ దేవాలయాలను నిర్మించారు. నేటి వాస్తుశిల్ప రూపం ప్రధానంగా నాయక కాలంలో రూపుదిద్దుకొంది. ఆలయం మీనాక్షి మరియు సుందరేశ్వరర్ కు అంకితమైంది. పదునాలుగు గొప్ప గోపురాలు మదురై నగరం మీదుగా ఆకాశంలో ఎత్తుగా నిలుస్తున్నాయి, వాటిలో ఉన్నతమైనది సుమారు 52 మీటర్ల ఎత్తుగలది. ఈ ఆలయం నేటికీ మదురై యొక్క సజీవ వారసత్వ చిహ్నంగా ఉంది.`,
    ml: `മദുരൈയിലെ മീനാക്ഷി അമ്മൻ ക്ഷേത്രം ദക്ഷിണ ഭാരതത്തിലെ ഏറ്റവും പ്രശസ്തമായ ക്ഷേത്ര സമുച്ചയങ്ങളിൽ ഒന്നാണ്. ഇതിന്റെ വേരുകൾ പാണ്ഡ്യ രാജവംശത്തിന്റെ ദീർഘ ചരിത്രത്തിൽ ആഴ്ന്നിറങ്ങിയിരിക്കുന്നു. ഇന്ന് കാണുന്ന വാസ്തുവിദ്യ പ്രധാനമായും നായക്ക കാലഘട്ടത്തിൽ രൂപപ്പെട്ടതാണ്. ദേവി മീനാക്ഷിക്കും ഭഗവാൻ സുന്ദരേശ്വരരക്കും സമർപ്പിതമായ ഈ ക്ഷേത്രത്തിന്റെ പതിനാല് ഗോപുരങ്ങൾ മദുരൈ നഗരത്തിന് മുകളിൽ ഉയർന്ന് നിൽക്കുന്നു. ഇന്നും ഇത് ജീവനുള്ള മദുരൈ സംസ്കാരത്തിന്റെ ചിഹ്നമായി നിലകൊള്ളുന്നു.`,
    kn: `ಮಧುರೈನಲ್ಲಿರುವ ಮೀನಾಕ್ಷಿ ಅಮ್ಮನ್ ದೇವಾಲಯ ದಕ್ಷಿಣ ಭಾರತದ ಅತ್ಯಂತ ಪ್ರಸಿದ್ಧ ದೇವಾಲಯ ಸಮುಚ್ಚಯಗಳಲ್ಲಿ ಒಂದಾಗಿದೆ. ಇದರ ಬೇರುಗಳು ಪಾಂಡ್ಯ ರಾಜವಂಶದ ದೀರ್ಘ ಇತಿಹಾಸದಲ್ಲಿ ಆಳವಾಗಿ ನೆಟ್ಟಿವೆ. ಇಂದು ಕಾಣುವ ವಾಸ್ತುಶಿಲ್ಪ ಮುಖ್ಯವಾಗಿ ನಾಯಕ ಕಾಲದಲ್ಲಿ ರೂಪುಗೊಂಡಿತು. ದೇವಾಲಯ ದೇವಿ ಮೀನಾಕ್ಷಿ ಮತ್ತು ಸುಂದರೇಶ್ವರರಿಗೆ ಸಮರ್ಪಿತವಾಗಿದೆ. ಹದಿನಾಲ್ಕು ಭವ್ಯ ಗೋಪುರಗಳು ಮಧುರೈ ನಗರದ ಮೇಲೆ ಎದ್ದು ನಿಲ್ಲುತ್ತವೆ. ಇಂದಿಗೂ ಮಧುರೈ ಮತ್ತು ತಮಿಳು ನಾಗರಿಕತೆಯ ಜೀವಂತ ಪರಂಪರೆಯ ಸಂಕೇತ.`,
  },

  'mahabalipuram': {
    en: `The Shore Temple at Mahabalipuram — historically known as Mamallapuram — stands at the edge of the Bay of Bengal as one of the oldest surviving structural stone temples on the Indian subcontinent. It was built during the reign of the Pallava king Narasimhavarman the Second, also known as Rajasimha, who ruled in the early eighth century of the Common Era. The Pallavas were a dynasty that presided over an era of great artistic and architectural innovation in southern India. The Shore Temple represents the culmination of their tradition of stone architecture. The complex contains shrines dedicated to both Lord Shiva and Lord Vishnu, reflecting the religious pluralism of Pallava rule. Constructed from granite blocks, the temple was built to face the rising sun from the east, and its tiered towers rise dramatically above the coastal landscape. Centuries of exposure to salt-laden sea winds have weathered many of its sculptural details, yet the temple retains a powerful and austere beauty. The site at Mahabalipuram is remarkable not only for the Shore Temple but for a wider ensemble of Pallava monuments, including cave temples, rock reliefs, and monolithic rathas carved from existing boulders. The entire group was recognised as a UNESCO World Heritage Site in 1984. Today the Shore Temple remains one of the most evocative heritage sites along the Indian coastline.`,
    ta: `மகாபலிபுரத்திலுள்ள கடற்கரை கோவில், வரலாற்றில் மாமல்லபுரம் என்றும் அழைக்கப்படும் இந்த தலத்தின் கடற்கரையில், இந்திய துணைக்கண்டத்தின் மிகப் பழமையான கட்டுமானக் கல் கோவில்களில் ஒன்றாக நிலைத்திருக்கிறது. பல்லவ மன்னர் இரண்டாம் நரசிம்மவர்மன், ராஜசிம்மன் என்று அழைக்கப்படுபவர், கி.பி. எட்டாம் நூற்றாண்டின் தொடக்கத்தில் இதனை நிர்மாணித்தார். கோவில் வளாகம் சிவபெருமானுக்கும் திருமாலுக்கும் சமர்ப்பிக்கப்பட்ட கோவில்களைக் கொண்டுள்ளது. கிழக்கு நோக்கி சூரியன் உதிக்கும் திசையில் கட்டப்பட்ட இந்தக் கோவில், நிலைகளாக அமைந்த கோபுரங்களுடன் கடற்கரை நிலப்பரப்பின் மேல் கம்பீரமாக உயர்கிறது. மகாபலிபுரத்தில் கடற்கரை கோவிலுடன் குகைக் கோவில்கள், பாறை நிவாரணங்கள், மற்றும் தனிக்கல் ரதங்கள் உட்பட பல்லவ நினைவுச்சின்னங்கள் உள்ளன. 1984 ஆம் ஆண்டு யுனெஸ்கோ உலக பாரம்பரிய தளமாக அங்கீகரிக்கப்பட்டது.`,
    hi: `महाबलीपुरम में स्थित शोर टेम्पल बंगाल की खाड़ी के किनारे भारतीय उपमहाद्वीप के सबसे पुराने संरचनात्मक पाषाण मंदिरों में से एक है। पल्लव राजा नरसिम्हवर्मन द्वितीय, जिन्हें राजसिम्हा भी कहा जाता है, के शासनकाल में आठवीं शताब्दी ईस्वी के प्रारंभ में बनाया गया। मंदिर परिसर में भगवान शिव और विष्णु दोनों को समर्पित गर्भगृह हैं। 1984 में यूनेस्को विश्व धरोहर स्थल के रूप में मान्यता दी गई।`,
    te: `మహాబలిపురంలోని షోర్ టెంపిల్ బంగాళాఖాతం అంచున భారత ఉపఖండంలోని అత్యంత పురాతన నిర్మాణాత్మక రాతి ఆలయాలలో ఒకటిగా నిలుస్తుంది. పల్లవ రాజు రెండవ నరసింహవర్మన్ ఆధ్వర్యంలో సి.ఇ. ఎనిమిదవ శతాబ్దం ప్రారంభంలో నిర్మించబడింది. 1984 లో UNESCO ప్రపంచ వారసత్వ స్థల గుర్తింపు లభించింది.`,
    ml: `മഹാബലിപുരത്തിലെ ഷോർ ടെമ്പിൾ ബംഗാൾ ഉൾക്കടലിന്റെ അതിർത്തിയിൽ ഭാരതീയ ഉപഭൂഖണ്ഡത്തിലെ ഏറ്റവും പഴക്കമേറിയ ഘടനാ ശിലാ ക്ഷേത്രങ്ങളിൽ ഒന്നായി നിലകൊള്ളുന്നു. പല്ലവ രാജാവ് രണ്ടാം നരസിംഹവർമൻ ഭരണ കാലത്ത് സി.ഇ. എട്ടാം നൂറ്റാണ്ടിൽ നിർമ്മിക്കപ്പെട്ടു. 1984-ൽ UNESCO ലോക പൈതൃക സൈറ്റ് ആയി അംഗീകൃതമായി.`,
    kn: `ಮಹಾಬಲಿಪುರಂನಲ್ಲಿರುವ ಶೋರ್ ಟೆಂಪಲ್ ಬಂಗಾಳ ಕೊಲ್ಲಿಯ ಅಂಚಿನಲ್ಲಿ ಭಾರತೀಯ ಉಪಖಂಡದ ಅತ್ಯಂತ ಪ್ರಾಚೀನ ರಚನಾತ್ಮಕ ಶಿಲಾ ದೇವಾಲಯಗಳಲ್ಲಿ ಒಂದಾಗಿ ನಿಲ್ಲುತ್ತದೆ. ಪಲ್ಲವ ರಾಜ ಎರಡನೇ ನರಸಿಂಹವರ್ಮನ್ ಆಳ್ವಿಕೆಯ ಅಡಿ ಸಿ.ಇ. ಎಂಟನೇ ಶತಮಾನದ ಆರಂಭದಲ್ಲಿ ನಿರ್ಮಿಸಲಾಯಿತು. 1984 ರಲ್ಲಿ UNESCO ವಿಶ್ವ ಪರಂಪರೆ ತಾಣ ಮಾನ್ಯತೆ ಪಡೆಯಿತು.`,
  },

  'airavatesvara': {
    en: `The Airavatesvara Temple at Darasuram, near Kumbakonam in Tamil Nadu, is a masterwork of Chola artistic achievement. It was built by Rajaraja Chola the Second, who reigned in the twelfth century of the Common Era. While smaller in scale than the Brihadeesvarar Temple at Thanjavur, the Airavatesvara Temple is celebrated for the extraordinary delicacy and density of its sculptural ornamentation. According to tradition, the temple takes its name from Airavata, the divine white elephant of Indra, who is said to have worshipped the presiding deity Shiva here. The temple complex features a remarkable stone mandapam designed in the form of a chariot with sculpted wheels and horses. The entire surface of the temple, from its base mouldings to its upper reaches, is carved with a profusion of miniature figures, deities, guardians, and decorative motifs. The quality of stone-cutting at Airavatesvara is considered by many scholars to represent the pinnacle of Chola sculptural art. Like the Brihadeesvarar and the Gangaikonda Cholapuram temples, the Airavatesvara Temple was included in the UNESCO World Heritage designation for the Great Living Chola Temples in 2004. Today it stands as evidence of the extraordinary artistic legacy of the Chola empire.`,
    ta: `குடந்தை அருகில் உள்ள தாராசுரத்திலுள்ள ஐராவதேஸ்வரர் கோவில், சோழர்களின் கலைச்சாதனையின் உச்சகட்ட படைப்பாகும். பன்னிரண்டாம் நூற்றாண்டில் ஆட்சி புரிந்த இரண்டாம் ராஜராஜ சோழன் கட்டுவித்தார். ஐராவதம் என்னும் இந்திரனின் வெள்ளை யானை இங்குள்ள சிவபெருமானை வழிபட வந்தது என்று மரபு கூறுகிறது. கோவிலின் கற்களால் ஆன மண்டபம் சக்கரங்களும் குதிரைகளும் கொண்ட தேர் வடிவத்தில் கட்டப்பட்டது. கோவிலின் தளத்திலிருந்து மேற்பகுதி வரை சிறு சிறு தெய்வங்கள் மற்றும் அலங்கார வடிவங்களின் பரப்பால் நிரம்பியுள்ளது. 2004 ஆம் ஆண்டு யுனெஸ்கோ உலக பாரம்பரிய தளமாக சேர்க்கப்பட்டது.`,
    hi: `तमिलनाडु के कुंभकोणम के निकट दारासुरम स्थित ऐरावतेश्वर मंदिर चोल कलात्मक उपलब्धि की उत्कृष्ट कृति है। बारहवीं शताब्दी में राजराज चोल द्वितीय ने बनवाया। मंदिर परिसर में पत्थर का मंडप रथ के रूप में बना है। 2004 में महान जीवित चोल मंदिरों के अंतर्गत यूनेस्को विश्व धरोहर स्थल का दर्जा मिला।`,
    te: `తమిళనాడులో కుంభకోణం సమీపంలోని దారాసురంలో ఉన్న ఐరావతేశ్వర దేవాలయం చోళ కళాత్మక సాధన యొక్క మేలైన రచన. పన్నెండవ శతాబ్దంలో రెండవ రాజరాజ చోళుని చేత నిర్మించబడింది. ఆలయ సముదాయంలో రథ ఆకారంలో నిర్మించిన రాతి మండపం ఉంది. 2004 లో UNESCO ప్రపంచ వారసత్వ స్థల హోదా పొందింది.`,
    ml: `തമിഴ്‌നാട്ടിൽ കുംഭകോണത്തിനടുത്ത് ദാരസുരത്ത് സ്ഥിതി ചെയ്യുന്ന ഐരാവതേശ്വര ക്ഷേത്രം ചോള കലാ സാധനയുടെ ഒരു ഉത്കൃഷ്ട നേട്ടമാണ്. പന്ത്രണ്ടാം നൂറ്റാണ്ടിൽ രണ്ടാം രാജരാജ ചോളൻ നിർമ്മിച്ചു. 2004-ൽ UNESCO ലോക പൈതൃക സൈറ്റ് ആയി ഉൾപ്പെടുത്തലാവി.`,
    kn: `ತಮಿಳುನಾಡಿನ ಕುಂಭಕೋಣದ ಬಳಿ ದಾರಾಸುರಂನಲ್ಲಿರುವ ಐರಾವತೇಶ್ವರ ದೇವಾಲಯ ಚೋಳ ಕಲಾ ಸಾಧನೆಯ ಒಂದು ಶ್ರೇಷ್ಠ ರಚನೆ. ಹನ್ನೆರಡನೇ ಶತಮಾನದಲ್ಲಿ ಎರಡನೇ ರಾಜರಾಜ ಚೋಳ ನಿರ್ಮಿಸಿದ. 2004 ರಲ್ಲಿ UNESCO ವಿಶ್ವ ಪರಂಪರೆ ತಾಣ ಮಾನ್ಯತೆ ಪಡೆಯಿತು.`,
  },

  'gangaikonda-cholapuram': {
    en: `The Gangaikonda Cholapuram Temple is a monument to one of the most ambitious military and political achievements of the Chola empire. It was built by Rajendra Chola the First, son of the great Rajaraja Chola, who led a remarkable northern campaign that extended Chola power as far as the banks of the river Ganges in the early eleventh century. To commemorate this extraordinary campaign, Rajendra took the title Gangaikonda Cholan — the Chola who took the Ganges — and established a new imperial capital bearing the same name: Gangaikonda Cholapuram. The temple at the heart of this capital was consecrated around 1035 of the Common Era and dedicated to Lord Shiva. Its vimana rises to approximately 55 metres, tapering more gently than the tower at Thanjavur, giving it an elegant and distinctive silhouette. The temple contains notable sculptures of deities and portrait figures of the Chola royal family. Inscriptions recording Rajendra's campaigns and the empire's administration are etched into the walls. As the city of Gangaikonda Cholapuram declined over the centuries, the temple remained as the solitary reminder of what was once a great Chola capital. In 2004 it was included in the UNESCO World Heritage designation for the Great Living Chola Temples. Today it stands in relative quietude, a monument to the full scope of Chola ambition.`,
    ta: `கங்கைகொண்ட சோழபுரம் கோவில் சோழ சாம்ராஜ்யத்தின் மிகவும் துணிச்சலான சாதனைகளில் ஒன்றின் நினைவுச்சின்னம். மகா ராஜராஜ சோழனின் மகனான முதலாம் ராஜேந்திர சோழனால் கட்டப்பட்டது. கங்கை ஆற்றின் கரைகள் வரை சோழ சக்தியை விரிவாக்கிய வெற்றியை கொண்டாட, ராஜேந்திரன் கங்கைகொண்ட சோழன் என்ற பட்டத்தை ஏற்று, புதிய தலைநகரை உருவாக்கினார். கி.பி. சுமார் 1035 இல் திருமஞ்சனம் செய்யப்பட்ட இந்தக் கோவிலின் விமானம் சுமார் 55 மீட்டர் உயரம் கொண்டது. 2004 ஆம் ஆண்டு யுனெஸ்கோ உலக பாரம்பரிய தளமாக சேர்க்கப்பட்டது.`,
    hi: `गंगैकोंड चोलपुरम मंदिर चोल साम्राज्य की सबसे महत्वाकांक्षी उपलब्धि का स्मारक है। राजेंद्र चोल प्रथम ने गंगा नदी तक चोल शक्ति विस्तार की स्मृति में गंगैकोंड चोलन की उपाधि धारण कर यह राजधानी स्थापित की। लगभग 1035 ईस्वी में अभिषिक्त इस मंदिर का विमान लगभग 55 मीटर ऊंचा है। 2004 में यूनेस्को विश्व धरोहर स्थल का दर्जा मिला।`,
    te: `గంగైకొండ చోళపురం దేవాలయం చోళ సామ్రాజ్యంలో అత్యంత ధైర్యసాహసమైన సాధనకు నిదర్శనమైన స్మారక చిహ్నం. మొదటి రాజేంద్ర చోళుడు గంగా నదీ తీరాల వరకు చోళ శక్తిని విస్తరించిన విజయాన్ని స్మరించడానికి ఈ రాజధానిని స్థాపించాడు. సిఇ 1035 లో ప్రతిష్ఠించబడిన ఈ ఆలయం విమానం సుమారు 55 మీటర్ల ఎత్తుగలది. 2004 లో UNESCO ప్రపంచ వారసత్వ స్థలంగా గుర్తించబడింది.`,
    ml: `ഗംഗൈകൊണ്ട ചോളപുരം ക്ഷേത്രം ചോള സാമ്രാജ്യത്തിന്റെ ഏറ്റവും ധൈര്യശാലിയായ നേട്ടത്തിന്റെ സ്മാരകമാണ്. ഒന്നാം രാജേന്ദ്ര ചോളൻ ഗംഗാ നദിക്കരകൾ വരെ ചോള ശക്തി വ്യാപിപ്പിച്ചതിന്റെ ഓർമ്മയ്ക്കായി ഈ രാജ തലസ്ഥാനം സ്ഥാപിച്ചു. ഏകദേശം 1035 ൽ പ്രതിഷ്ഠിക്കപ്പെട്ട ഈ ക്ഷേത്രത്തിന്റെ വിമാനം ഏകദേശം 55 മീറ്ററോളം ഉയർന്നിരിക്കുന്നു. 2004-ൽ UNESCO ലോക പൈതൃക സൈറ്റ് ആയി ഗണിക്കപ്പെട്ടു.`,
    kn: `ಗಂಗೈಕೊಂಡ ಚೋಳಪುರಂ ದೇವಾಲಯ ಚೋಳ ಸಾಮ್ರಾಜ್ಯದ ಅತ್ಯಂತ ದಿಟ್ಟ ಸಾಧನೆಯ ಸ್ಮಾರಕ. ಮೊದಲನೇ ರಾಜೇಂದ್ರ ಚೋಳ ಗಂಗಾ ನದಿ ತೀರಗಳಿಗೆ ಚೋಳ ಶಕ್ತಿ ವಿಸ್ತರಿಸಿ ಗೆಲುವಿನ ಸ್ಮರಣೆಯಲ್ಲಿ ಈ ರಾಜಧಾನಿ ಸ್ಥಾಪಿಸಿದ. 2004 ರಲ್ಲಿ UNESCO ವಿಶ್ವ ಪರಂಪರೆ ತಾಣ ಗೌರವ ಪಡೆಯಿತು.`,
  },

  'thirumalai-nayakkar': {
    en: `The Thirumalai Nayakkar Palace in Madurai is one of the finest surviving examples of the architectural tradition under the Nayak rulers of Tamil Nadu. It was built in 1636 of the Common Era by Thirumalai Nayak, one of the most prominent rulers of the Nayak dynasty that controlled much of southern Tamil Nadu during the seventeenth century. The palace represents a distinctive architectural style combining elements of the Dravidian tradition with Indo-Saracenic design, characterised by massive arches, imposing columns, and elaborate stucco ornamentation. In its original form, the palace was a far larger complex. The principal surviving section is the Swarga Vilasam — the Celestial Pavilion — a vast open courtyard enclosed by massive stone columns and elegant arched galleries. The columns were constructed from brick and mortar and finished with intricate lime plaster stucco work. Over the centuries, significant portions of the original palace were demolished or fell into disuse, and the building underwent partial restoration during the colonial period. Today the surviving portions are maintained as a heritage site, and the Sound and Light show held in the evenings allows visitors to understand the drama and history of this remarkable royal building. The Thirumalai Nayakkar Palace remains an important example of the Nayak contribution to Tamil architectural heritage.`,
    ta: `மதுரையிலுள்ள திருமலை நாயக்கர் மகால் தமிழகத்தின் நாயக்க மன்னர்களின் கட்டிடக்கலை மரபின் சிறந்த எஞ்சிய மாதிரிகளில் ஒன்று. 1636 ஆம் ஆண்டில் திருமலை நாயக்கரால் கட்டப்பட்டது. திராவிட மரபின் கூறுகளையும் இந்தோ-சாரசேனிய வடிவமைப்பு தாக்கங்களையும் இணைத்த ஒரு தனிச்சிறப்பான கட்டிடக்கலை பாணியை பிரதிபலிக்கிறது. இன்று எஞ்சியிருக்கும் முக்கிய பகுதி சொர்க்கவிலாசம் என்று அழைக்கப்படும் வான் மண்டபமாகும். மாலை வேளைகளில் நடக்கும் ஒலி ஒளி நிகழ்ச்சி பார்வையாளர்களுக்கு இந்த அரச கட்டடத்தோடு தொடர்புடைய வரலாற்றை உணர்த்துகிறது.`,
    hi: `मदुरै में स्थित तिरुमलई नायक्कर महल तमिलनाडु के नायक शासकों के वास्तुकला परंपरा का बेहतरीन उदाहरण है। 1636 ईस्वी में तिरुमलई नायक ने बनवाया। द्रविड़ और इंडो-सारासेनिक शैलियों की संयोजन विशेषता है। स्वर्ग विलासम मुख्य बचा हुआ हिस्सा है। यहाँ का ध्वनि एवं प्रकाश शो इस महल से जुड़े इतिहास का अनुभव कराता है।`,
    te: `మదురైలోని థిరుమలై నాయక్కర్ మహల్ తమిళనాడులో నాయక్ పాలకుల వాస్తుశిల్ప సంప్రదాయంలో అద్భుతమైన మచ్చుతునక. 1636 సి.ఇ. లో థిరుమలై నాయక్ నిర్మించాడు. ద్రావిడ మరియు ఇండో-సారసేనిక్ శైలుల సమ్మేళనం ఈ భవనం యొక్క విశేషం. స్వర్గవిలాసం ప్రధాన మనుగడ ఉన్న విభాగం. సాయంత్రపు సౌండ్ అండ్ లైట్ షో ఈ భవనంతో అనుబంధించబడిన చరిత్రను సందర్శకులకు అనుభవింపజేస్తుంది.`,
    ml: `മദുരൈയിലെ തിരുമലൈ നായക്കർ കൊട്ടാരം 1636 സി.ഇ. ൽ തിരുമലൈ നായകൻ നിർമ്മിച്ചു. ദ്രാവിഡ-ഇൻഡോ-സാരസെനിക് ശൈലിയിലുള്ള ഈ ഘടന ഭീമൻ കൽ‌ തൂണുകളും ആകർഷകമായ കമാന ഗ്യാലറികളും ഉള്ള സ്വർഗ്ഗ വിലാസം സൂക്ഷ്മഭാഗം ഇന്നും നൽകുന്നു. സൗണ്ട് ആൻഡ് ലൈറ്റ് ഷോ ഈ രാജ ഐതിഹ്യം ദർശകർക്ക് അനുഭവിപ്പിക്കുന്നു.`,
    kn: `ಮಧುರೈನ ತಿರುಮಲೈ ನಾಯಕ್ಕರ್ ಅರಮನೆ 1636 ಸಿ.ಇ. ಯಲ್ಲಿ ತಿರುಮಲೈ ನಾಯಕ ನಿರ್ಮಿಸಿದ. ದ್ರಾವಿಡ ಮತ್ತು ಇಂಡೋ-ಸಾರಸೆನಿಕ್ ಶೈಲಿಗಳ ಸಂಯೋಜನೆ ಇದರ ವೈಶಿಷ್ಟ್ಯ. ಸ್ವರ್ಗ ವಿಲಾಸ ಭಾರೀ ಕಲ್ಲಿನ ಸ್ತಂಭಗಳು ಮತ್ತು ಕಮಾನು ಗ್ಯಾಲರಿಗಳಿಂದ ಸುತ್ತುವರಿದ ವಿಶಾಲ ಆಂಗಣ ಹೊಂದಿದೆ. ಸೌಂಡ್ ಅಂಡ್ ಲೈಟ್ ಶೋ ರಾಜ ಇತಿಹಾಸ ಅನುಭವಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.`,
  },
};

/**
 * Look up dedicated Heritage History narration for a monument.
 * Returns monument-specific historical prose if available.
 * NEVER calls getMonumentVoiceGuide or getHowToExperienceGuide.
 */
function lookupMonumentHistory(ctx: NarrationContext, lang: SupportedLanguage): string | null {
  const key = normalizeToHistoryKey(ctx.monumentId) || normalizeToHistoryKey(ctx.monumentName);
  if (!key) return null;
  const monument = MONUMENT_HISTORY_NARRATIONS[key];
  if (!monument) return null;
  return monument[lang] || monument['en'] || null;
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
  // CRITICAL FIX: Use dedicated Heritage History narration.
  // NEVER call getMonumentVoiceGuide / getHowToExperienceGuide here.
  // Those return visitor guidance (HTE), not historical narration.
  const dedicated = lookupMonumentHistory(ctx, 'ta');
  if (dedicated) return sanitizeAndValidateLanguageText(dedicated, 'ta');

  // Fallback using MongoDB data — still 100% Tamil, no English mixing
  const name = ctx.monumentName;
  const place = [ctx.location, ctx.state].filter(Boolean).join(", ");
  const sections: string[] = [];

  sections.push(
    place
      ? `வணக்கம். நீங்கள் இப்போது ${place} இல் அமைந்துள்ள ${name} ஐ பார்க்கிறீர்கள்.`
      : `வணக்கம். நீங்கள் இப்போது ${name} ஐ பார்க்கிறீர்கள்.`
  );
  if (ctx.dynasty) sections.push(`இது ${ctx.dynasty} ஆட்சிக் காலத்தில் கட்டப்பட்ட வரலாற்றுச் சின்னமாகும்.`);
  const hist = pick(ctx.historicalBackground, ctx.shortHistory, ctx.description);
  if (hist) sections.push(trimProse(hist, 280));
  if (ctx.unescoStatus?.toLowerCase().includes('world heritage')) sections.push(`இது யுனெஸ்கோ உலக பாரம்பரிய தளமாக அங்கீகரிக்கப்பட்டுள்ளது.`);
  sections.push(`${name} நமது பண்பாட்டின் உயிரோட்டமான சாட்சி.`);

  return sanitizeAndValidateLanguageText(sections.filter(Boolean).join(" "), 'ta');
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

/**
 * Primary Heritage HISTORY narration function.
 * Returns monument-specific historical story (the PAST).
 * NEVER calls getMonumentVoiceGuide / getHowToExperienceGuide.
 * Those are for visitor guidance (present). This is history (past).
 */
export function getHeritageHistory(ctx: NarrationContext, lang: SupportedLanguage): string {
  if (ctx.confidence < MEDIUM_CONFIDENCE) return buildLowConfidenceNarration(lang);
  if (ctx.confidence < HIGH_CONFIDENCE) return buildMediumConfidenceNarration(ctx, lang);
  // Try dedicated monument-specific narration first
  const dedicated = lookupMonumentHistory(ctx, lang);
  if (dedicated) {
    return lang === 'ta' ? sanitizeAndValidateLanguageText(dedicated, 'ta') : dedicated;
  }
  // Fall back to generic template using MongoDB data
  return buildSuccessNarration(ctx, lang);
}

/** @deprecated Use getHeritageHistory for history narrations. */
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

/** Build narration by confidence tier. */
export function buildNarration(ctx: NarrationContext, lang: SupportedLanguage): string {
  return getHeritageHistory(ctx, lang);
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
