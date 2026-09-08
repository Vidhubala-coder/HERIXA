import { getLanguageByCode } from '../config/languages';

export type VoiceGuideLanguage = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';

export interface HowToExperienceGuideData {
  monumentId: string;
  monumentName: string;
  language: VoiceGuideLanguage;
  startHere: string;
  dontMiss: string[];
  lookClosely: string[];
  experienceTheSpace: string;
  photographyTips: string;
  respectHeritage: string;
  beforeYouLeave: string;
  fullNarrationText: string;
}

interface GuideContent {
  startHere: string;
  dontMiss: string[];
  lookClosely: string[];
  experienceTheSpace: string;
  photographyTips: string;
  respectHeritage: string;
  beforeYouLeave: string;
}

const MONUMENT_EXPERIENCE_GUIDES: Record<string, Record<VoiceGuideLanguage, GuideContent>> = {
  // 1. Brihadeesvarar Temple
  brihadeeswarar: {
    en: {
      startHere: "Begin your experience by standing at the eastern gateway near the Keralanthagan Gopuram to take in the soaring monumental entrance.",
      dontMiss: [
        "The towering 216-foot Vimana, crafted entirely from granite.",
        "The massive monolithic Nandi pavilion carved out of a single block of stone.",
        "The grand main sanctum housing the colossal Shiva Lingam."
      ],
      lookClosely: [
        "Inspect the thousands of Tamil inscriptions covering the outer stone plinth.",
        "Observe the ancient Chola ceiling frescoes inside the inner ambulatory passage."
      ],
      experienceTheSpace: "Feel the immense architectural proportion and shadowless engineering design as you walk around the expansive paved courtyard.",
      photographyTips: "The best light for photographing the Vimana is early morning or late afternoon from the southern courtyard angle.",
      respectHeritage: "Maintain peaceful decorum in active worship areas and follow posted notices regarding shoe deposit counters.",
      beforeYouLeave: "Look back from the main entrance tower to appreciate how the entire complex forms a unified imperial masterpiece."
    },
    ta: {
      startHere: "கேரளாந்தகன் கோபுரம் அமைந்த கிழக்கு நுழைவாயிலில் நின்றபடி கோவிலின் கம்பீரமான முகப்பை கண்டு உங்கள் அனுபவத்தை தொடங்குங்கள்.",
      dontMiss: [
        "முழுவதும் கருங்கல்லால் செதுக்கப்பட்ட 216 அடி உயர பிரம்மாண்ட விமானம்.",
        "ஒரே கல்லில் செதுக்கப்பட்ட மிகப்பெரிய நந்தி மண்டபம்.",
        "பிரம்மாண்ட சிவலிங்கம் எழுந்தருளியுள்ள முதன்மை சன்னதி."
      ],
      lookClosely: [
        "வெளிப்பிரகார சுவாரசியமான கல்வெட்டுகளில் பொறிக்கப்பட்டுள்ள சோழர் கால வரலாற்று எழுத்துக்களை கவனியுங்கள்.",
        "உள்நடைகூடங்களில் காணப்படும் சோழர் கால ஓவியங்களை கூர்ந்து நோக்குங்கள்."
      ],
      experienceTheSpace: "பரந்த பிரகாரத்தில் நடக்கும்போது, நிழல் விழாதவாறு வடிவமைக்கப்பட்ட சோழர்களின் பொறியியல் அதிசயத்தை உணருங்கள்.",
      photographyTips: "காலை அல்லது மாலை வேளையில் தெற்கு பிரகாரத்தில் இருந்து விமானத்தை படம் பிடிப்பது அழகாக இருக்கும்.",
      respectHeritage: "வழிபாட்டு பகுதிகளில் அமைதியை பேணவும், காலணி பாதுகாப்பு மைய வழிகாட்டுதல்களை பின்பற்றவும்.",
      beforeYouLeave: "கோவிலை விட்டு வெளியேறும் முன் நுழைவாயிலில் இருந்து விமானத்தின் முழு அழகையும் மீண்டும் ஒருமுறை ரசியுங்கள்."
    },
    hi: {
      startHere: "पूर्वी केरालांतक गोपुरम के पास खड़े होकर मंदिर के भव्य प्रवेश द्वार को देखकर अपनी यात्रा शुरू करें।",
      dontMiss: [
        "216 फीट ऊंचा विशाल ग्रेनाइट निर्मित विमान।",
        "एक ही पत्थर से तराशा गया विशाल नंदी मंडप।",
        "मुख्य गर्भगृह में स्थापित विशाल शिवलिंग।"
      ],
      lookClosely: [
        "बाहरी दीवार की नींव पर उकेरे गए प्राचीन तमिल शिलालेखों को ध्यान से देखें।",
        "आंतरिक गलियारे में स्थित चोल काल के भित्ति चित्रों का अवलोकन करें।"
      ],
      experienceTheSpace: "विशाल प्रांगण में टहलते हुए चोलकालीन वास्तुकला और छायाविहीन वास्तुकला की अद्भुत अनुभूति करें।",
      photographyTips: "सुबह या देर शाम को दक्षिणी प्रांगण से विमान का फोटो खींचना सबसे अच्छा रहता है।",
      respectHeritage: "पूजा स्थलों पर शांति बनाए रखें और जूते स्टैंड के नियमों का पालन करें।",
      beforeYouLeave: "प्रवेश द्वार से पूरे मंदिर परिसर के भव्य स्वरूप को निहारकर अपनी यात्रा समाप्त करें।"
    },
    te: {
      startHere: "తూర్పు కేరళాంతక గోపురం వద్ద నిలబడి ఆలయ అత్యద్భుతమైన ప్రవేశ ద్వారాన్ని వీక్షించడంతో మీ అనుభవాన్ని ప్రారంభించండి.",
      dontMiss: [
        "గ్రానైట్‌తో నిర్మించిన 216 అడుగుల భారీ విమాన గోపురం.",
        "ఏకశిలతో చెక్కిన భారీ నంది మండపం.",
        "ప్రధాన గర్భగుడిలోని భారీ శివలింగం."
      ],
      lookClosely: [
        "గోడ పునాదిపై చెక్కబడిన వేలాది తమిళ శాసనాలను పరిశీలించండి.",
        "లోపలి ప్రదక్షిణ మార్గంలోని ప్రాచీన చోళ వర్ణచిత్రాలను చూడండి."
      ],
      experienceTheSpace: "విశాలమైన ప్రాంగణంలో నడుస్తూ చోళుల అద్భుత నిర్మాణ నైపుణ్యాన్ని అనుభవించండి.",
      photographyTips: "ఉదయం లేదా సాయంత్రం సమయంలో దక్షిణ ప్రాంగణం నుండి విమానాన్ని ఫోటో తీయడం ఉత్తమం.",
      respectHeritage: "పూజా ప్రాంతాలలో ప్రశాంతతను పాటించండి మరియు ఆలయ మార్గదర్శకాలను అనుసరించండి.",
      beforeYouLeave: "నిష్క్రమించే ముందు ప్రవేశ ద్వారం నుండి ఆలయ సంపూర్ణ సౌందర్యాన్ని మరోసారి వీక్షించండి."
    },
    ml: {
      startHere: "കിഴക്കേ കേരളാന്തകൻ ഗോപുരത്തിന് മുന്നിൽ നിന്ന് ക്ഷേത്രത്തിന്റെ ഗാംഭീര്യമുള്ള പ്രവേശന കവാടം കണ്ടുകൊണ്ട് അനുഭവം ആരംഭിക്കുക.",
      dontMiss: [
        "216 അടി ഉയരമുള്ള കൂറ്റൻ ഗ്രാഫൈറ്റ് വിമാനം.",
        "ഒറ്റക്കല്ലിൽ കൊത്തിയെടുത്ത കൂറ്റൻ നന്ദി മണ്ഡപം.",
        "പ്രധാന ശ്രീകോവിലിലെ കൂറ്റൻ ശിവലിംഗം."
      ],
      lookClosely: [
        "പുറത്തെ കൽച്ചുവരുകളിൽ കൊത്തിവച്ചിട്ടുള്ള പുരാതന തമിഴ് ശാസനങ്ങൾ ശ്രദ്ധിക്കുക.",
        "അകത്തെ ഇടനാഴിയിലെ ചോള ചിത്രരചനകൾ സൂക്ഷ്മമായി വീക്ഷിക്കുക."
      ],
      experienceTheSpace: "വിശാലമായ മുറ്റത്തൂടെ നടക്കുമ്പോൾ ചോള വാസ്തുവിദ്യയുടെ വിസ്മയം അനുഭവിക്കുക.",
      photographyTips: "രാവിലെയും വൈകുന്നേരവും തെക്കേ മുറ്റത്ത് നിന്നുള്ള ചിത്രം മനോഹരമായിരിക്കും.",
      respectHeritage: "ആരാധനാ സ്ഥലങ്ങളിൽ സമാധാനം പാലിക്കുക, ചെരുപ്പ് കേന്ദ്ര നിർദ്ദേശങ്ങൾ പാലിക്കുക.",
      beforeYouLeave: "മടങ്ങുന്നതിന് മുൻപ് പ്രവേശന കവാടത്തിൽ നിന്ന് ക്ഷേത്ര സമുച്ചയത്തിന്റെ പൂർണ്ണ ഭംഗി ഒന്നുകൂടി ആസ്വദിക്കുക."
    },
    kn: {
      startHere: "ಪೂರ್ವದ ಕೇರಳಾಂತಕನ್ ಗೋಪುರದ ಬಳಿ ನಿಂತು ದೇವಾಲಯದ ಭವ್ಯ ಪ್ರವೇಶದ್ವಾರವನ್ನು ವೀಕ್ಷಿಸುವ ಮೂಲಕ ನಿಮ್ಮ ಅನುಭವವನ್ನು ಪ್ರಾರಂಭಿಸಿ.",
      dontMiss: [
        "೨೧೬ ಅಡಿ ಎತ್ತರದ ಭವ್ಯ ಗ್ರಾನೈಟ್ ವಿಮಾನ ಗೋಪುರ.",
        "ಏಕಶಿಲೆಯಲ್ಲಿ ಕೆತ್ತಲಾದ ಬೃಹತ್ ನಂದಿ ಮಂಟಪ.",
        "ಮುಖ್ಯ ಗರ್ಭಗುಡಿಯಲ್ಲಿರುವ ಬೃಹತ್ ಶಿವಲಿಂಗ."
      ],
      lookClosely: [
        "ಹೊರಗೋಡೆಯ ತಳಪಾಯದ ಮೇಲಿರುವ ಪುರಾತನ ತಮಿಳು ಶಾಸನಗಳನ್ನು ಗಮನಿಸಿ.",
        "ಒಳಪ್ರದಕ್ಷಿಣೆ ಮಾರ್ಗದಲ್ಲಿರುವ ಚೋಳರ ವರ್ಣಚಿತ್ರಗಳನ್ನು ವೀಕ್ಷಿಸಿ."
      ],
      experienceTheSpace: "ವಿಶಾಲವಾದ ಪ್ರಾಂಗಣದಲ್ಲಿ ನಡೆಯುತ್ತಾ ಚೋಳರ ಶಿಲ್ಪಕಲಾ ವೈಭವವನ್ನು ಅನುಭವಿಸಿ.",
      photographyTips: "ಬೆಳಿಗ್ಗೆ ಅಥವಾ ಸಂಜೆ ವೇಳೆಯಲ್ಲಿ ದಕ್ಷಿಣ ಪ್ರಾಂಗಣದಿಂದ ವಿಮಾನದ ಫೋಟೋ ತೆಗೆಯುವುದು ಉತ್ತಮ.",
      respectHeritage: "ಪೂಜಾ ಸ್ಥಳಗಳಲ್ಲಿ ಶಾಂತತೆಯನ್ನು ಕಾಪಾಡಿ ಮತ್ತು ನಿಯಮಗಳನ್ನು ಪಾಲಿಸಿ.",
      beforeYouLeave: "ನಿರ್ಗಮಿಸುವ ಮೊದಲು ಪ್ರವೇಶದ್ವಾರದಿಂದ ಇಡೀ ದೇವಾಲಯದ ಭವ್ಯ ನೋಟವನ್ನು ಮತ್ತೊಮ್ಮೆ ವೀಕ್ಷಿಸಿ."
    }
  },

  // 2. Meenakshi Amman Temple
  'meenakshi-amman': {
    en: {
      startHere: "Begin inside the temple towers area by looking up at the high sculptured Gopurams radiating rich colors.",
      dontMiss: [
        "The 14 colorful multi-storied Gopuram towers.",
        "The sacred Golden Lotus Tank reflection.",
        "The Hall of Thousand Pillars with musical carved columns."
      ],
      lookClosely: [
        "Examine the ceiling lotus murals above the tank corridors.",
        "Listen to the different acoustic tones of the musical stone pillars."
      ],
      experienceTheSpace: "Feel the vibrant cultural energy and traditional devotion in the cool granite halls.",
      photographyTips: "Respect inner photography guidelines posted near sanctum gates.",
      respectHeritage: "Wear traditional attire and keep mobile devices set to silent mode.",
      beforeYouLeave: "Sit beside the Golden Lotus Tank to take in the spiritual harmony."
    },
    ta: {
      startHere: "உயரமான வண்ண சிற்பக் கோபுரங்களை நிமிர்ந்து பார்த்து உங்கள் பாரம்பரிய அனுபவத்தை தொடங்குங்கள்.",
      dontMiss: [
        "பல்வேறு புராண கதைகளை விளக்கும் 14 கோபுரங்கள்.",
        "தெற்கு கோபுரம் பிரதிபலிக்கும் தங்கத்தாமரை குளம்.",
        "இசைத்தூண்கள் நிறைந்த ஆயிரம் கால் மண்டபம்."
      ],
      lookClosely: [
        "குளத்தைச் சுற்றியுள்ள மண்டப மேல்தள தாமரை ஓவியங்களை கூர்ந்து பாருங்கள்.",
        "இசைத்தூண்களை தட்டும்போது எழும் அபூர்வ நாதங்களை கவனியுங்கள்."
      ],
      experienceTheSpace: "குளிர்ந்த கல் மண்டபங்களில் தமிழ் பாரம்பரியத்தின் ஆன்மீக அதிர்வை உணருங்கள்.",
      photographyTips: "சன்னதி நுழைவாயிலில் உள்ள புகைப்பட கட்டுப்பாட்டு அறிவிப்புகளை பின்பற்றுங்கள்.",
      respectHeritage: "மரபு ஆடை அணிந்து மொபைல் போன்களை அமைதியில் வைக்கவும்.",
      beforeYouLeave: "தங்கத்தாமரை குளக்கரையில் சிறிது நேரம் அமர்ந்து அமைதியை அனுபவியுங்கள்."
    },
    hi: {
      startHere: "भव्य और रंगीन गोपुरमों की विशालता को देखकर अपनी यात्रा शुरू करें।",
      dontMiss: [
        "14 विशाल और रंगीन गोपुरम शिखर।",
        "पवित्र स्वर्ण कमल तालाब की सुंदरता।",
        "संगीतमय खंभों वाला हजार खंभों का मंडप।"
      ],
      lookClosely: [
        "तालाब की छत पर बनी कमल पुष्प पेंटिंग्स को ध्यान से देखें।",
        "संगीतमय पत्थरों की अनूठी ध्वनि को सुनें।"
      ],
      experienceTheSpace: "ठंडे पत्थरों के मंडप में आध्यात्मिक और सांस्कृतिक ऊर्जा का अनुभव करें।",
      photographyTips: "गर्भगृह के पास फोटोग्राफी नियमों का पालन करें।",
      respectHeritage: "पारंपरिक वस्त्र धारण करें और मोबाइल शांत रखें।",
      beforeYouLeave: "स्वर्ण कमल तालाब के पास बैठकर कुछ क्षण शांति का अनुभव करें।"
    },
    te: {
      startHere: "ఎత్తైన రంగుల గోపురాలను వీక్షిస్తూ మీ ప్రయాణాన్ని ప్రారంభించండి.",
      dontMiss: [
        "14 రంగుల బహుళ అంతస్తుల గోపురాలు.",
        "పవిత్ర స్వర్ణ కమల తటాకం.",
        "వేయి స్తంభాల మండపం మరియు సంగీత స్తంభాలు."
      ],
      lookClosely: [
        "తటాకం పైకప్పుపై ఉన్న కమల వర్ణచిత్రాలను పరిశీలించండి.",
        "సంగీత స్తంభాల నాదాన్ని వినండి."
      ],
      experienceTheSpace: "చల్లని రాతి మండపాలలో ఆధ్యాత్మిక వాతావరణాన్ని అనుభవించండి.",
      photographyTips: "గర్భగుడి వద్ద ఫోటోగ్రఫీ నిబంధనలను పాటించండి.",
      respectHeritage: "సంప్రదాయ దుస్తులు ధరించండి మరియు మొబైల్ సైలెంట్‌లో ఉంచండి.",
      beforeYouLeave: "స్వర్ణ కమల తటాకం వద్ద కొద్దిసేపు ప్రశాంతంగా గడపండి."
    },
    ml: {
      startHere: "വർണ്ണാഭമായ ഗോപുരങ്ങളുടെ ഭംഗി കണ്ടുകൊണ്ട് യാത്ര ആരംഭിക്കുക.",
      dontMiss: [
        "14 വർണ്ണാഭമായ ഗോപുരങ്ങൾ.",
        "വിശുദ്ധ സ്വർണ്ണ താമരക്കുളം.",
        "ആയിരംകാൽ മണ്ഡപവും സംഗീത തൂണുകളും."
      ],
      lookClosely: [
        "കുളത്തിന് മുകളിലെ താമര ചിത്രരചനകൾ സൂക്ഷ്മമായി കാണുക.",
        "സംഗീത തൂണുകളുടെ ശബ്ദ തരംഗങ്ങൾ ശ്രദ്ധിക്കുക."
      ],
      experienceTheSpace: "തണുത്ത കൽ മണ്ഡപങ്ങളിൽ ഭക്തിസാന്ദ്രമായ അന്തരീക്ഷം അനുഭവിക്കുക.",
      photographyTips: "ഫോട്ടോ നിയന്ത്രണങ്ങൾ പാലിക്കുക.",
      respectHeritage: "പാരമ്പര്യ വസ്ത്രങ്ങൾ ധരിക്കുക, ഫോൺ നിശബ്ദമാക്കുക.",
      beforeYouLeave: "സ്വർണ്ണ താമരക്കുളക്കരയിൽ അൽപ്പസമയം ശാന്തമായി ഇരിക്കുക."
    },
    kn: {
      startHere: "ಬಣ್ಣಬಣ್ಣದ ಎತ್ತರದ ಗೋಪುರಗಳನ್ನು ವೀಕ್ಷಿಸುತ್ತಾ ನಿಮ್ಮ ಅನುಭವವನ್ನು ಪ್ರಾರಂಭಿಸಿ.",
      dontMiss: [
        "೧೪ ವರ್ಣರಂಜಿತ ಗೋಪುರಗಳು.",
        "ಪವಿತ್ರ ಸ್ವರ್ಣ ಕಮಲ ಕೊಳ.",
        "ಸಾಕಷ್ಟು ಸಂಗೀತ ಕಂಬಗಳಿರುವ ಸಾವಿರ ಕಂಬಗಳ ಮಂಟಪ."
      ],
      lookClosely: [
        "ಕೊಳದ ಮೇಲ್ಛಾವಣಿಯ ಕಮಲ ವರ್ಣಚಿತ್ರಗಳನ್ನು ಗಮನಿಸಿ.",
        "ಸಂಗೀತ ಕಂಬಗಳ ಧ್ವನಿಯನ್ನು ಆಲಿಸಿ."
      ],
      experienceTheSpace: "ತಣ್ಣನೆಯ ಕಲ್ಲಿನ ಮಂಟಪಗಳಲ್ಲಿ ಆಧ್ಯಾತ್ಮಿಕ ಶಕ್ತಿಯನ್ನು ಅನುಭವಿಸಿ.",
      photographyTips: "ಛಾಯಾಗ್ರಹಣ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸಿ.",
      respectHeritage: "ಸಾಂಪ್ರದಾಯಿಕ ಉಡುಪು ಧರಿಸಿ ಮತ್ತು ಮೊಬೈಲ್ ಮೌನವಾಗಿರಿಸಿ.",
      beforeYouLeave: "ಸ್ವರ್ಣ ಕಮಲ ಕೊಳದ ದಂಡೆಯ ಮೇಲೆ ಕುಳಿತು ಪ್ರಶಾಂತತೆಯನ್ನು ಆನಂದಿಸಿ."
    }
  },

  // 3. Mahabalipuram Shore Temple
  mahabalipuram: {
    en: {
      startHere: "Begin on the landscaped seaside pathway looking towards the twin structural towers with the Bay of Bengal behind.",
      dontMiss: [
        "The twin oceanfront granite Vimana towers.",
        "The Somaskanda relief carving inside the main shrine.",
        "The bedrock reclining Vishnu image."
      ],
      lookClosely: [
        "Inspect the lion and bull sculptures carved along the perimeter boundary wall.",
        "Notice the salt-weathered texture on the Pallava granite blocks."
      ],
      experienceTheSpace: "Feel the ocean breeze as you admire 8th-century Pallava coastal architecture.",
      photographyTips: "Capture the towers against the sea during sunrise or Golden Hour light.",
      respectHeritage: "Walk on designated sandy pathways and do not climb carved plinths.",
      beforeYouLeave: "Pause near the outer lion wall to take in the coastal monument landscape."
    },
    ta: {
      startHere: "வங்காள விரிகுடா கடலின் பின்னணியில் நிற்கும் இரட்டை கோபுரங்களை பார்த்து உங்கள் அனுபவத்தை தொடங்குங்கள்.",
      dontMiss: [
        "கடற்கரையில் நிற்கும் இரட்டை கருங்கல் விமான கோபுரங்கள்.",
        "உள்சன்னதியில் உள்ள சோமஸ்கந்தர் புடைப்புச் சிற்பம்.",
        "பாறையில் செதுக்கப்பட்ட அனந்தசயன விஷ்ணு சிலை."
      ],
      lookClosely: [
        "சுற்று மதிலில் வரிசையாக செதுக்கப்பட்டுள்ள சிம்ம மற்றும் நந்தி சிற்பங்களை கவனியுங்கள்.",
        "கடல் காற்றினால் கல்லில் ஏற்பட்டுள்ள தொன்மை அமைப்பை கூர்ந்து பாருங்கள்."
      ],
      experienceTheSpace: "கடல் காற்றை சுவாசித்தபடி 8ஆம் நூற்றாண்டு பல்லவர் கால கடற்கரை கட்டிடக்கலையை ரசியுங்கள்.",
      photographyTips: "சூரிய உதயத்தின் போது கடலின் பின்னணியில் கோவிலை படம் பிடிப்பது அற்புதமாக இருக்கும்.",
      respectHeritage: "மணல் பாதையிலேயே நடந்து செல்லவும், சிற்ப பீடங்களின் மீது ஏற வேண்டாம்.",
      beforeYouLeave: "வெளி மதிலின் அருகே நின்று கடல் மற்றும் கோவிலின் அழகை மீண்டும் ஒருமுறை பாருங்கள்."
    },
    hi: {
      startHere: "समुद्र के किनारे स्थित तटीय मार्ग से दोनों मंदिरों का अवलोकन करके शुरुआत करें।",
      dontMiss: [
        "समुद्र तट पर स्थित दो ग्रेनाइट विमान शिखर।",
        "मुख्य मंदिर में उकेरी गई सोमस्कंद मूर्ति।",
        "चट्टान में उकेरी गई भगवान विष्णु की शयन मुद्रा।"
      ],
      lookClosely: [
        "चारों ओर की दीवार पर उकेरी गई सिंह मूर्तियों को देखें।",
        "समुद्री हवा से प्रभावित प्राचीन पत्थरों की बनावट का अवलोकन करें।"
      ],
      experienceTheSpace: "समुद्री हवा के साथ पल्लवकालीन तटीय वास्तुकला की सुंदरता का अनुभव करें।",
      photographyTips: "सूर्योदय के समय समुद्र के साथ मंदिरों का फोटो लें।",
      respectHeritage: "निर्दिष्ट पैदल मार्गों पर ही चलें और मूर्तियों पर न चढ़ें।",
      beforeYouLeave: "बाहरी दीवार के पास रुककर तटीय धरोहर के दृश्य का आनंद लें।"
    },
    te: {
      startHere: "సముద్ర తీర మార్గంలో నిలబడి రెండు దేవాలయాల అందాలను చూస్తూ ప్రారంభించండి.",
      dontMiss: [
        "సముద్ర తీరంలో ఉన్న జంట విమాన గోపురాలు.",
        "సోమస్కంద పుట శిల్పం.",
        "విష్ణుమూర్తి శయన మూరి శిల్పం."
      ],
      lookClosely: [
        "గోడపై చెక్కిన సింహ శిల్పాలను పరిశీలించండి.",
        "సముద్ర గాలి వల్ల రాళ్లపై ఏర్పడిన ప్రాచీన రూపాలను చూడండి."
      ],
      experienceTheSpace: "సముద్ర గాలితో పాటు పల్లవుల నిర్మాణ వైభవాన్ని అనుభవించండి.",
      photographyTips: "సూర్యోదయ సమయంలో తీరంలో ఫోటోలు తీయడం అద్భుతంగా ఉంటుంది.",
      respectHeritage: "కేటాయించిన మార్గాల్లో మాత్రమే నడవండి.",
      beforeYouLeave: "సముద్ర తీర ప్రాంగణ సౌందర్యాన్ని ఆస్వాదించండి."
    },
    ml: {
      startHere: "കടൽത്തീര പാതയിൽ നിന്ന് രണ്ട് ക്ഷേത്രങ്ങളുടെ കാഴ്ച കണ്ടുകൊണ്ട് തുടങ്ങുക.",
      dontMiss: [
        "കടൽത്തീരത്തെ ഇരട്ട വിമാന ഗോപുരങ്ങൾ.",
        "സോമസ്കന്ദ ശില്പം.",
        "വിഷ്ണുവിന്റെ അനന്തശയന ശില്പം."
      ],
      lookClosely: [
        "ചുമരിലെ സിംഹ ശില്പങ്ങൾ ശ്രദ്ധിക്കുക.",
        "കടൽക്കാറ്റേറ്റ് പഴക്കം ചെന്ന കല്ലുകളുടെ പ്രത്യേകത കാണുക."
      ],
      experienceTheSpace: "കടൽക്കാറ്റേറ്റ് പല്ലവ വാസ്തുവിദ്യയുടെ ഭംഗി ആസ്വദിക്കുക.",
      photographyTips: "സൂര്യോദയ സമയത്ത് കടലിന്റെ പശ്ചാത്തലത്തിൽ ചിത്രം പകർത്തു ക.",
      respectHeritage: "പാതകളിലൂടെ മാത്രം നടക്കുക.",
      beforeYouLeave: "മടങ്ങുന്നതിന് മുൻപ് കടൽത്തീര ക്ഷേത്ര ഭംഗി ആസ്വദിക്കുക."
    },
    kn: {
      startHere: "ಸಮುದ್ರ ತೀರದ ಮಾರ್ಗದಲ್ಲಿ ನಿಂತು ಜಂಟಿ ದೇವಾಲಯಗಳನ್ನು ವೀಕ್ಷಿಸುತ್ತಾ ಪ್ರಾರಂಭಿಸಿ.",
      dontMiss: [
        "ಸಮುದ್ರ ತೀರದಲ್ಲಿರುವ ಎರಡು ವಿಮಾನ ಗೋಪುರಗಳು.",
        "ಸೋಮಸ್ಕಂದ ಉಬ್ಬು ಶಿಲ್ಪ.",
        "ವಿಷ್ಣುವಿನ ಶಯನ ಭಂಗಿಯ ಶಿಲ್ಪ."
      ],
      lookClosely: [
        "ಗೋಡೆಯ ಮೇಲಿರುವ ಸಿಂಹ ಶಿಲ್ಪಗಳನ್ನು ಗಮನಿಸಿ.",
        "ಸಮುದ್ರದ ಗಾಳಿಯಿಂದ ಕಲ್ಲಿನ ಮೇಲಾದ ಪುರಾತನ ವಿನ್ಯಾಸವನ್ನು ವೀಕ್ಷಿಸಿ."
      ],
      experienceTheSpace: "ಸಮುದ್ರದ ಗಾಳಿಯೊಂದಿಗೆ ಪಲ್ಲವರ ಕಲಾ ವೈಭವವನ್ನು ಅನುಭವಿಸಿ.",
      photographyTips: "ಸೂರ್ಯೋದಯದ ಸಮಯದಲ್ಲಿ ಸಮುದ್ರದ ಹಿನ್ನೆಲೆಯಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
      respectHeritage: "ನಿಗದಿತ ಮಾರ್ಗಗಳಲ್ಲಿ ಮಾತ್ರ ನಡೆಯಿರಿ.",
      beforeYouLeave: "ತೀರದ ದೇವಾಲಯದ ದೃಶ್ಯವನ್ನು ಮನದುಂಬಿಕೊಳ್ಳಿ."
    }
  },

  // 4. Airavatesvara Temple
  airavatesvara: {
    en: {
      startHere: "Begin at the main eastern entrance facing the Rajagambhiran Mandapam.",
      dontMiss: [
        "The chariot-shaped porch drawn by stone elephants and horses.",
        "The musical stone steps at the outer entrance.",
        "The 63 Nayanmars miniature relief panels."
      ],
      lookClosely: [
        "Look for the fine miniature stone carvings measuring only a few inches.",
        "Examine the rotating stone wheel hubs on the carved chariot."
      ],
      experienceTheSpace: "Feel as if walking inside a stone miniature art gallery.",
      photographyTips: "Capture the detailed wheel carvings from side angle lighting.",
      respectHeritage: "Do not touch delicate miniature carvings or wheel spokes.",
      beforeYouLeave: "Look back at the chariot porch to admire the royal Chola design."
    },
    ta: {
      startHere: "ராஜகம்பீரன் மண்டபத்தை நோக்கிய கிழக்கு வாயிலில் நின்று உங்கள் அனுபவத்தை தொடங்குங்கள்.",
      dontMiss: [
        "யானைகளும் குதிரைகளும் இழுக்கும் தேர் வடிவ மண்டபம்.",
        "ஒலி எழுப்பும் இசைப்படிகள்.",
        "அறுபத்து மூவர் வரலாற்றைக்கூறும் நுண் கல் சிற்பங்கள்."
      ],
      lookClosely: [
        "சில அங்குலங்களே உள்ள மிகச்சிறிய நுணுக்கமான கல் சிற்பங்களை பாருங்கள்.",
        "தேர் சக்கரங்களின் அச்சு அமைப்பை கூர்ந்து கவனியுங்கள்."
      ],
      experienceTheSpace: "ஒரு கல் சிற்பக் கூடத்திற்குள் நடந்து செல்வது போன்ற கலை உணர்வை பெறுங்கள்.",
      photographyTips: "தேர் சக்கரங்களை பக்கவாட்டு வெளிச்சத்தில் படம் பிடிப்பது அழகாக இருக்கும்.",
      respectHeritage: "நுண் சிற்பங்களையும் தேர் சக்கரங்களையும் தொட வேண்டாம்.",
      beforeYouLeave: "தேர் மண்டபத்தின் கம்பீரத்தை மீண்டும் ஒருமுறை ரசித்து செல்லுங்கள்."
    },
    hi: {
      startHere: "राजगंभीरन मंडप के सामने मुख्य पूर्वी प्रवेश द्वार से शुरुआत करें।",
      dontMiss: [
        "हाथी और घोड़ों द्वारा खींचा जाने वाला रथ रूपी मंडप।",
        "प्रवेश द्वार पर संगीतमय पत्थर की सीढ़ियां।",
        "63 नयन्मारों की सूक्ष्म पाषाण नक्काशी।"
      ],
      lookClosely: [
        "कुछ इंच की बारीक मूर्तियों को ध्यान से देखें।",
        "रथ के पहियों की बारीक नक्काशी का अवलोकन करें।"
      ],
      experienceTheSpace: "पत्थर की कला दीर्घा में घूमने जैसी अनुभूति करें।",
      photographyTips: "पहियों की नक्काशी का फोटो तिरछी रोशनी में लें।",
      respectHeritage: "बारीक नक्काशियों को न छूएं।",
      beforeYouLeave: "रथ मंडप की भव्यता को निहारकर प्रस्थान करें।"
    },
    te: {
      startHere: "రాజగంభీరన్ మండపం వైపు ఉన్న తూర్పు ప్రవేశ ద్వారం వద్ద ప్రారంభించండి.",
      dontMiss: [
        "ఏనుగులు మరియు గుర్రాలు లాగే రథం ఆకారపు మండపం.",
        "సంగీత రాతి మెట్లు.",
        "63 నాయన్మార్ల సూక్ష్మ శిల్పాలు."
      ],
      lookClosely: [
        "కొన్ని అంగుళాల సూక్ష్మ శిల్పాలను పరిశీలించండి.",
        "రథ చక్రాల అమరికను చూడండి."
      ],
      experienceTheSpace: "రాతి శిల్ప కళాఖండాల మధ్య నడుస్తున్న అనుభూతిని పొందండి.",
      photographyTips: "రథ చక్రాలను పక్క వెలుగులో ఫోటో తీయండి.",
      respectHeritage: "సూక్ష్మ శిల్పాలను తాకవద్దు.",
      beforeYouLeave: "రథ మండప రాజస సౌందర్యాన్ని వీక్షించి నిష్క్రమించండి."
    },
    ml: {
      startHere: "രാജഗംഭീരൻ മണ്ഡപത്തിന് മുന്നിൽ നിന്ന് തുടങ്ങുക.",
      dontMiss: [
        "ആനകളും കുതിരകളും വലിക്കുന്ന രഥ മണ്ഡപം.",
        "സംഗീത കൽപടവുകൾ.",
        "63 നയനാർമാരുടെ സൂക്ഷ്മ ശില്പങ്ങൾ."
      ],
      lookClosely: [
        "ചെറിയ സൂക്ഷ്മ ശില്പങ്ങൾ കണ്ടു മനസ്സിലാക്കുക.",
        "രഥ ചക്രങ്ങളുടെ നിർമ്മാണം ശ്രദ്ധിക്കുക."
      ],
      experienceTheSpace: "ഒരു കൽ ശില്പ ഗാലറിയിൽ നടക്കുന്നത് പോലെ അനുഭവപ്പെടും.",
      photographyTips: "രഥ ചക്രങ്ങൾ സൈഡ് ലൈറ്റിൽ ഫോട്ടോ എടുക്കുക.",
      respectHeritage: "സൂക്ഷ്മ ശില്പങ്ങളിൽ തൊടരുത്.",
      beforeYouLeave: "രഥ മണ്ഡപത്തിന്റെ ഭംഗി വീണ്ടും ആസ്വദിക്കുക."
    },
    kn: {
      startHere: "ರಾಜಗಂಭೀರನ್ ಮಂಟಪದ ಎದುರಿನ ಮುಖ್ಯ ಪ್ರವೇಶದ್ವಾರದಿಂದ ಪ್ರಾರಂಭಿಸಿ.",
      dontMiss: [
        "ಆನೆ ಮತ್ತು ಕುದುರೆಗಳು ಎಳೆಯುವ ರಥದ ಆಕಾರದ ಮಂಟಪ.",
        "ಸಂಗೀತ ಕಲ್ಲು ಮೆಟ್ಟಿಲುಗಳು.",
        "೬೩ ನಾಯನ್ಮಾರರ ಸೂಕ್ಷ್ಮ ಶಿಲ್ಪಗಳು."
      ],
      lookClosely: [
        "ಕೆಲವೇ ಇಂಚುಗಳ ಅತ್ಯಂತ ಸೂಕ್ಷ್ಮ ಕೆತ್ತನೆಗಳನ್ನು ಗಮನಿಸಿ.",
        "ರಥದ ಚಕ್ರಗಳ ಕೆತ್ತನೆಯನ್ನು ವೀಕ್ಷಿಸಿ."
      ],
      experienceTheSpace: "ಕಲ್ಲಿನ ಕಲಾ ಗ್ಯಾಲರಿಯಲ್ಲಿ ನಡೆಯುತ್ತಿರುವಂತೆ ಅನುಭವಿಸಿ.",
      photographyTips: "ರಥದ ಚಕ್ರಗಳನ್ನು ಪಕ್ಕದ ಬೆಳಕಿನಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
      respectHeritage: "ಸೂಕ್ಷ್ಮ ಕೆತ್ತನೆಗಳನ್ನು ಮುಟ್ಟಬೇಡಿ.",
      beforeYouLeave: "ರಥ ಮಂಟಪದ ರಾಜಭವ್ಯತೆಯನ್ನು ವೀಕ್ಷಿಸಿ ನಿರ್ಗಮಿಸಿ."
    }
  },

  // 5. Gangaikonda Cholapuram Temple
  'gangaikonda-cholapuram': {
    en: {
      startHere: "Begin on the wide green lawn facing the curved 182-foot Vimana.",
      dontMiss: [
        "The gracefully contoured main Vimana tower.",
        "The Chandeshvara Anugraha Murti relief carving.",
        "The giant lion stepwell (Simhakeni)."
      ],
      lookClosely: [
        "Observe the soft feminine curves of the Vimana plinth.",
        "Notice the crowning detail of Shiva crowning his devotee."
      ],
      experienceTheSpace: "Enjoy the tranquil open atmosphere commemorating a Ganges victory.",
      photographyTips: "Capture the full Vimana reflection from across the lawn.",
      respectHeritage: "Remove footwear before climbing onto the temple sanctum plinth.",
      beforeYouLeave: "Visit the lion stepwell before leaving the grounds."
    },
    ta: {
      startHere: "182 அடி வளைந்த விமானத்தை நோக்கிய புல்வெளியில் நின்று உங்கள் அனுபவத்தை தொடங்குங்கள்.",
      dontMiss: [
        "வளைவான பெண்மை நயத்துடன் கூடிய விமான கோபுரம்.",
        "சண்டேஸ்வர அனுக்கிரக மூர்த்தி சிற்பம்.",
        "பெரிய சிம்மக் கிணறு."
      ],
      lookClosely: [
        "விமான அடித்தளத்தின் மென்மையான வளைவுகளை கவனியுங்கள்.",
        "சிவபெருமான் பக்தருக்கு மணிமுடி சூட்டும் சிற்ப அழகை பாருங்கள்."
      ],
      experienceTheSpace: "கங்கை வெற்றியின் நினைவாக அமைக்கப்பட்ட அமைதியான சூழலை அனுபவியுங்கள்.",
      photographyTips: "புல்வெளியில் இருந்து விமானத்தின் முழு தோற்றத்தையும் படம் பிடியுங்கள்.",
      respectHeritage: "கோவில் தளத்தின் மீது ஏறும் முன் காலணிகளை அகற்றவும்.",
      beforeYouLeave: "வெளியேறும் முன் சிம்மக் கிணற்றை பார்வையிடுங்கள்."
    },
    hi: {
      startHere: "182 फीट ऊंचे घुमावदार विमान के सामने हरे प्रांगण से शुरुआत करें।",
      dontMiss: [
        "सुरुचिपूर्ण घुमावदार मुख्य विमान।",
        "चंडेश्वर अनुग्रह मूर्ति नक्काशी।",
        "विशाल सिंह कुआं (सिंहकेनी)।"
      ],
      lookClosely: [
        "विमान के आधार की कोमल बनावट को देखें।",
        "भगवान शिव द्वारा भक्त को मुकुट पहनाने का दृश्य देखें।"
      ],
      experienceTheSpace: "गंगा विजय की स्मृति में बने शांत परिसर का आनंद लें।",
      photographyTips: "घास के मैदान से पूरे विमान का फोटो लें।",
      respectHeritage: "मंदिर के चबूतरे पर जाने से पहले जूते उतारें।",
      beforeYouLeave: "प्रस्थान से पहले सिंह कुएं का अवलोकन करें।"
    },
    te: {
      startHere: "182 అడుగుల వక్ర విమాన గోపురం ముందు ఉన్న పచ్చని మైదానంలో ప్రారంభించండి.",
      dontMiss: [
        "సొగసైన వక్ర విమాన గోపురం.",
        "చండేశ్వర అనుగ్రహ మూర్తి శిల్పం.",
        "పెద్ద సింహ బావి (సింహకేణి)."
      ],
      lookClosely: [
        "విమాన పునాది వంపులను పరిశీలించండి.",
        "శివుడు భక్తుడికి కిరీటం తొడిగే శిల్పాన్ని చూడండి."
      ],
      experienceTheSpace: "గంగా విజయ జ్ఞాపకార్థం నిర్మించిన ప్రశాంత వాతావరణాన్ని అనుభవించండి.",
      photographyTips: "మైదానం నుండి విమాన సంపూర్ణ రూపాన్ని ఫోటో తీయండి.",
      respectHeritage: "ఆలయ వేదికపైకి వెళ్లే ముందు చెప్పులు విప్పండి.",
      beforeYouLeave: "నిష్క్రమించే ముందు సింహ బావిని సందర్శించండి."
    },
    ml: {
      startHere: "182 അടി ഉയരമുള്ള വിമാനത്തിന് മുന്നിലെ പുൽത്തകിടിയിൽ നിന്ന് തുടങ്ങുക.",
      dontMiss: [
        "മനോഹരമായ വിമാന ഗോപുരം.",
        "ചണ്ഡേശ്വര അനുഗ്രഹ മൂർത്തി ശില്പം.",
        "വലിയ സിംഹക്കിണർ."
      ],
      lookClosely: [
        "വിമാനത്തിന്റെ അടിത്തറയിലെ വളവുകൾ ശ്രദ്ധിക്കുക.",
        "ശിവൻ ഭക്തന് കിരീടം അണിയിക്കുന്ന ശില്പം കാണുക."
      ],
      experienceTheSpace: "ഗംഭീരമായ വിജയ സ്മാരകത്തിന്റെ ശാന്തത അനുഭവിക്കുക.",
      photographyTips: "പുൽത്തകിടിയിൽ നിന്ന് വിമാനത്തിന്റെ മുഴുവൻ ചിത്രവും പകർത്തു ക.",
      respectHeritage: "ക്ഷേത്ര തറയിലേക്ക് കയറും മുൻപ് ചെരുപ്പ് മാറ്റി വെയ്ക്കുക.",
      beforeYouLeave: "മടങ്ങും മുൻപ് സിംഹക്കിണർ സന്ദർശിക്കുക."
    },
    kn: {
      startHere: "೧೮೨ ಅಡಿ ವಕ್ರ ವಿಮಾನದ ಎದುರಿನ ಹಸಿರು ಹುಲ್ಲುಹಾಸಿನ ಮೇಲೆ ಪ್ರಾರಂಭಿಸಿ.",
      dontMiss: [
        "ಸುಂದರವಾದ ವಕ್ರ ವಿಮಾನ ಗೋಪುರ.",
        "ಚಂಡೇಶ್ವರ ಅನುಗ್ರಹ ಮೂರ್ತಿ ಶಿಲ್ಪ.",
        "ಬೃಹತ್ ಸಿಂಹ ಭಾವಿ (ಸಿಂಹಕೇಣಿ)."
      ],
      lookClosely: [
        "ವಿಮಾನ ತಳಪಾಯದ ಮೃದುವಾದ ವಕ್ರತೆಯನ್ನು ಗಮನಿಸಿ.",
        "ಶಿವನು ಭಕ್ತನಿಗೆ ಮುಕುಟಧಾರಣೆ ಮಾಡುವ ಶಿಲ್ಪವನ್ನು ವೀಕ್ಷಿಸಿ."
      ],
      experienceTheSpace: "ಗಂಗಾ ವಿಜಯದ ನೆನಪಿನ ಪ್ರಶಾಂತ ವಾತಾವರಣವನ್ನು ಆನಂದಿಸಿ.",
      photographyTips: "ಹುಲ್ಲುಹಾಸಿನಿಂದ ವಿಮಾನದ ಪೂರ್ಣ ನೋಟವನ್ನು ಫೋಟೋ ತೆಗೆಯಿರಿ.",
      respectHeritage: "ದೇವಾಲಯದ ಮೇಲೇರುವ ಮೊದಲು ಪಾದರಕ್ಷೆಗಳನ್ನು ಕಳಚಿ.",
      beforeYouLeave: "ಹೊರಡುವ ಮೊದಲು ಸಿಂಹ ಭಾವಿಯನ್ನು ವೀಕ್ಷಿಸಿ."
    }
  },

  // 6. Thirumalai Nayakkar Palace
  'thirumalai-nayakkar': {
    en: {
      startHere: "Begin in the central open courtyard looking at the surrounding row of massive white pillars.",
      dontMiss: [
        "The grand Svarga Vilasam Celestial Pavilion.",
        "The 82-foot white lime-stucco pillars.",
        "The restored mythological ceiling paintings."
      ],
      lookClosely: [
        "Observe the intricate dragon-like Yali arches joining the pillar tops.",
        "Examine the royal Nayak crests painted on the upper domes."
      ],
      experienceTheSpace: "Feel the majestic scale of 17th-century Indo-Saracenic royal court architecture.",
      photographyTips: "Photograph down the length of the pillar colonnade for dramatic perspective.",
      respectHeritage: "Do not touch or write on historic white stucco pillars.",
      beforeYouLeave: "Stand beneath the central dome to experience the ceiling height."
    },
    ta: {
      startHere: "முற்றத்தின் நடுவில் நின்று சுற்றிலும் உள்ள பிரம்மாண்ட வெள்ளை தூண் வரிசைகளை பார்த்து உங்கள் அனுபவத்தை தொடங்குங்கள்.",
      dontMiss: [
        "சொர்க்க விலாசம் அரியாசன அரங்கம்.",
        "82 அடி உயர கம்பீர வெள்ளை சுதை தூண்கள்.",
        "மேல்தள வண்ண சுவரோவியங்கள்."
      ],
      lookClosely: [
        "தூண் உச்சிகளை இணைக்கும் யாளி வளைவு வேலைப்பாடுகளை பாருங்கள்.",
        "மேல் டோம் பகுதியில் வரையப்பட்டுள்ள நாயக்கர் கால அரச சின்னங்களை கவனியுங்கள்."
      ],
      experienceTheSpace: "17ஆம் நூற்றாண்டு அரண்மனை கம்பீரத்தை உணருங்கள்.",
      photographyTips: "தூண் வரிசைகளின் நீளத்தை கோணத்தில் படம் பிடிப்பது அற்புதமாக இருக்கும்.",
      respectHeritage: "வெள்ளை சுதை தூண்களின் மீது எழுதவோ தொடவோ வேண்டாம்.",
      beforeYouLeave: "மத்திய டோம் பகுதிக்கு கீழே நின்று மேல்தள உயரத்தை ரசியுங்கள்."
    },
    hi: {
      startHere: "केंद्रीय खुले प्रांगण में खड़े होकर विशाल सफेद खंभों की पंक्ति को देखकर शुरुआत करें।",
      dontMiss: [
        "भव्य स्वर्ग विलासम मंडप।",
        "82 फीट ऊंचे सफेद खंभे।",
        "छत पर बनी पौराणिक चित्रकारी।"
      ],
      lookClosely: [
        "खंभों के ऊपर बनी याली मेहराबों को ध्यान से देखें।",
        "ऊपरी गुंबद पर चित्रित शाही प्रतीकों का अवलोकन करें।"
      ],
      experienceTheSpace: "17वीं शताब्दी के शाही दरबार की भव्यता का अनुभव करें।",
      photographyTips: "खंभों की लंबी पंक्ति का फोटो कोण बनाकर लें।",
      respectHeritage: "ऐतिहासिक खंभों को न छुएं और न ही उन पर लिखें।",
      beforeYouLeave: "केंद्रीय गुंबद के नीचे खड़े होकर छत की ऊंचाई निहारें।"
    },
    te: {
      startHere: "కేంద్ర ప్రాంగణంలో నిలబడి తెల్లని భారీ స్తంభాల వరుసను చూస్తూ ప్రారంభించండి.",
      dontMiss: [
        "స్వర్గ విలాసం మండపం.",
        "82 అడుగుల తెల్లని స్తంభాలు.",
        "పైకప్పు పురాణ వర్ణచిత్రాలు."
      ],
      lookClosely: [
        "స్తంభాల పైభాగంలో ఉన్న యాళి తోరణాలను పరిశీలించండి.",
        "గుంబజ్ పై ఉన్న రాజ చిహ్నాలను చూడండి."
      ],
      experienceTheSpace: "17వ శతాబ్దపు రాజస వాతావరణాన్ని అనుభవించండి.",
      photographyTips: "స్తంభాల వరుసను కోణంలో ఫోటో తీయడం అద్భుతంగా ఉంటుంది.",
      respectHeritage: "చారిత్రక స్తంభాలపై రాయడం లేదా తాకడం చేయవద్దు.",
      beforeYouLeave: "కేంద్ర గుంబజ్ కింద నిలబడి పైకప్పు ఎత్తును చూడండి."
    },
    ml: {
      startHere: "മുറ്റത്തിന്റെ മധ്യത്തിൽ നിന്ന് വെള്ളത്തൂണുകൾ കണ്ടുകൊണ്ട് തുടങ്ങുക.",
      dontMiss: [
        "സ്വർഗ്ഗ വിലാസം മണ്ഡപം.",
        "82 അടി ഉയരമുള്ള വെള്ളത്തൂണുകൾ.",
        "മേൽക്കൂരയിലെ ചിത്രരചനകൾ."
      ],
      lookClosely: [
        "തൂണുകൾക്ക് മുകളിലെ യാളി വളവുകൾ ശ്രദ്ധിക്കുക.",
        "രാജകീയ ചിഹ്നങ്ങൾ കാണുക."
      ],
      experienceTheSpace: "17-ാം നൂറ്റാണ്ടിലെ കൊട്ടാര ഗാംഭീര്യം അനുഭവിക്കുക.",
      photographyTips: "തൂണുകളുടെ നിര നീളത്തിൽ ഫോട്ടോ എടുക്കുക.",
      respectHeritage: "തൂണുകളിൽ എഴുതുകയോ തൊടുകയോ ചെയ്യരുത്.",
      beforeYouLeave: "മധ്യ ഡോമിന് താഴെ നിന്ന് ഉയരം ആസ്വദിക്കുക."
    },
    kn: {
      startHere: "ಕೇಂದ್ರ ತೆರೆದ ಪ್ರಾಂಗಣದಲ್ಲಿ ನಿಂತು ಬೃಹತ್ ಬಿಳಿ ಕಂಬಗಳ ಸಾಲನ್ನು ವೀಕ್ಷಿಸುತ್ತಾ ಪ್ರಾರಂಭಿಸಿ.",
      dontMiss: [
        "ಭವ್ಯ ಸ್ವರ್ಗ ವಿಲಾಸಂ ಮಂಟಪ.",
        "೮೨ ಅಡಿ ಎತ್ತರದ ಬಿಳಿ ಕಂಬಗಳು.",
        "ಮೇಲ್ಛಾವಣಿಯ ಪೌರಾಣಿಕ ವರ್ಣಚಿತ್ರಗಳು."
      ],
      lookClosely: [
        "ಕಂಬಗಳ ಮೇಲಿರುವ ಯಾಳಿ ಕಮಾನುಗಳನ್ನು ಗಮನಿಸಿ.",
        "ರಾಜಮನೆತನದ ಚಿಹ್ನೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ."
      ],
      experienceTheSpace: "೧೭ ನೇ ಶತಮಾನದ ರಾಜಪ್ರಭುತ್ವದ ವೈಭವವನ್ನು ಅನುಭವಿಸಿ.",
      photographyTips: "ಕಂಬಗಳ ಸಾಲನ್ನು ಕೋನದಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
      respectHeritage: "ಐತಿಹಾಸಿಕ ಕಂಬಗಳನ್ನು ಮುಟ್ಟಬೇಡಿ ಮತ್ತು ಬರೆಯಬೇಡಿ.",
      beforeYouLeave: "ಕೇಂದ್ರ ಗಮ್ಮಟದ ಕೆಳಗೆ ನಿಂತು ಮೇಲ್ಛಾವಣಿಯ ಎತ್ತರವನ್ನು ವೀಕ್ಷಿಸಿ."
    }
  }
};

/** Normalize monument ID or slug to one of the 6 canonical monument keys */
export function normalizeMonumentId(rawIdOrName?: string): string {
  if (!rawIdOrName) return 'brihadeeswarar';
  const clean = rawIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (clean.includes('brihadees') || clean.includes('peruvudaiyar') || clean.includes('thanjavur')) return 'brihadeeswarar';
  if (clean.includes('meenakshi') || clean.includes('maduraiamman')) return 'meenakshi-amman';
  if (clean.includes('mahabali') || clean.includes('mamalla') || clean.includes('shore')) return 'mahabalipuram';
  if (clean.includes('airavate') || clean.includes('darasuram')) return 'airavatesvara';
  if (clean.includes('gangai') || clean.includes('cholapuram')) return 'gangaikonda-cholapuram';
  if (clean.includes('thirumalai') || clean.includes('nayak')) return 'thirumalai-nayakkar';

  return 'brihadeeswarar';
}

/** Retrieve structured "How to Experience" visitor guide data for a monument */
export function getHowToExperienceGuide(
  rawIdOrName: string,
  monumentDisplayName: string,
  lang: VoiceGuideLanguage = 'en'
): HowToExperienceGuideData {
  const key = normalizeMonumentId(rawIdOrName);
  const guideSet = MONUMENT_EXPERIENCE_GUIDES[key] || MONUMENT_EXPERIENCE_GUIDES['brihadeeswarar'];
  const data = guideSet[lang] || guideSet['en'];

  // Headings localized per language
  const headers: Record<VoiceGuideLanguage, { start: string; miss: string; look: string; space: string; photo: string; respect: string; leave: string }> = {
    en: {
      start: "Start Here:",
      miss: "Don't Miss:",
      look: "Look Closely:",
      space: "Experience the Space:",
      photo: "Photography Tips:",
      respect: "Respect the Heritage:",
      leave: "Before You Leave:"
    },
    ta: {
      start: "இங்கிருந்து தொடங்குங்கள்:",
      miss: "தவறவிடக்கூடாத முக்கிய அம்சங்கள்:",
      look: "கூர்ந்து கவனியுங்கள்:",
      space: "கட்டிடக்கலை இடத்தை அனுபவியுங்கள்:",
      photo: "புகைப்பட குறிப்புகள்:",
      respect: "பாரம்பரியத்தை மதியுங்கள்:",
      leave: "வெளியேறும் முன்:"
    },
    hi: {
      start: "यहाँ से शुरुआत करें:",
      miss: "मुख्य आकर्षण अवश्य देखें:",
      look: "बारीकी से देखें:",
      space: "स्थान का अनुभव करें:",
      photo: "फोटोग्राफी सुझाव:",
      respect: "धरोहर का सम्मान करें:",
      leave: "प्रस्थान से पहले:"
    },
    te: {
      start: "ఇక్కడ నుండి ప్రారంభించండి:",
      miss: "తప్పక చూడవలసినవి:",
      look: "పరిశీలనగా చూడండి:",
      space: "ప్రదేశాన్ని అనుభవించండి:",
      photo: "ఫోటోగ్రఫీ సూచనలు:",
      respect: "వారసత్వాన్ని గౌరవించండి:",
      leave: "నిష్క్రమించే ముందు:"
    },
    ml: {
      start: "ഇവിടെ നിന്ന് തുടങ്ങുക:",
      miss: "കണ്ടില്ലെന്ന് നടിക്കരുത്:",
      look: "സൂക്ഷ്മമായി കാണുക:",
      space: "സ്ഥലം അനുഭവിച്ചറിയുക:",
      photo: "ഫോട്ടോ നുറുങ്ങുകൾ:",
      respect: "പൈതൃകത്തെ ബഹുമാനിക്കുക:",
      leave: "മടങ്ങുന്നതിന് മുൻപ്:"
    },
    kn: {
      start: "ಇಲ್ಲಿಂದ ಪ್ರಾರಂಭಿಸಿ:",
      miss: "ಮುಖ್ಯ ಆಕರ್ಷಣೆಗಳು:",
      look: "ಸೂಕ್ಷ್ಮವಾಗಿ ಗಮನಿಸಿ:",
      space: "ಸ್ಥಳವನ್ನು ಅನುಭವಿಸಿ:",
      photo: "ಛಾಯಾಗ್ರಹಣ ಸಲಹೆಗಳು:",
      respect: "ಪರಂಪರೆಯನ್ನು ಗೌರವಿಸಿ:",
      leave: "ಹೊರಡುವ ಮೊದಲು:"
    }
  };

  const h = headers[lang] || headers['en'];

  // Build natural continuous narration text for speech (pure prose, no section label prefixes)
  const fullNarrationText = [
    data.startHere,
    data.dontMiss.join(' '),
    data.lookClosely.join(' '),
    data.experienceTheSpace,
    data.photographyTips,
    data.respectHeritage,
    data.beforeYouLeave
  ].filter(Boolean).join(' ');

  return {
    monumentId: key,
    monumentName: monumentDisplayName || 'Heritage Monument',
    language: lang,
    startHere: data.startHere,
    dontMiss: data.dontMiss,
    lookClosely: data.lookClosely,
    experienceTheSpace: data.experienceTheSpace,
    photographyTips: data.photographyTips,
    respectHeritage: data.respectHeritage,
    beforeYouLeave: data.beforeYouLeave,
    fullNarrationText: sanitizeAndValidateLanguageText(fullNarrationText, lang)
  };
}

/** Legacy export alias */
export const getMonumentVoiceGuide = getHowToExperienceGuide;

/** Validate & sanitize language text before sending to TTS */
export function sanitizeAndValidateLanguageText(text: string, lang: VoiceGuideLanguage): string {
  if (!text) return '';
  let cleaned = text;

  if (lang === 'ta') {
    cleaned = cleaned.replace(/HERIXA/gi, 'ஹெரிக்சா');
    cleaned = cleaned.replace(/UNESCO/gi, 'யுனெஸ்கோ');
    cleaned = cleaned.replace(/AI/gi, 'செயற்கை நுண்ணறிவு');
  } else if (lang === 'hi') {
    cleaned = cleaned.replace(/HERIXA/gi, 'हेरिक्सा');
    cleaned = cleaned.replace(/UNESCO/gi, 'यूनेस्को');
  } else if (lang === 'te') {
    cleaned = cleaned.replace(/HERIXA/gi, 'హెరిక్సా');
    cleaned = cleaned.replace(/UNESCO/gi, 'యునెస్కో');
  } else if (lang === 'ml') {
    cleaned = cleaned.replace(/HERIXA/gi, 'ഹെറിക്സ');
    cleaned = cleaned.replace(/UNESCO/gi, 'യുനെസ്കോ');
  } else if (lang === 'kn') {
    cleaned = cleaned.replace(/HERIXA/gi, 'ಹೆರಿಕ್ಸಾ');
    cleaned = cleaned.replace(/UNESCO/gi, 'ಯುನೆಸ್ಕೋ');
  }

  return cleaned;
}
