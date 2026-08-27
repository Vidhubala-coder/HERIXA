export interface LanguageConfig {
  code: 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  displayName: string;
  nativeName: string;
  speechLocale: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    displayName: 'English',
    nativeName: 'English',
    speechLocale: 'en-US',
  },
  {
    code: 'ta',
    displayName: 'Tamil',
    nativeName: 'தமிழ்',
    speechLocale: 'ta-IN',
  },
  {
    code: 'hi',
    displayName: 'Hindi',
    nativeName: 'हिन्दी',
    speechLocale: 'hi-IN',
  },
  {
    code: 'te',
    displayName: 'Telugu',
    nativeName: 'తెలుగు',
    speechLocale: 'te-IN',
  },
  {
    code: 'ml',
    displayName: 'Malayalam',
    nativeName: 'മലയാളം',
    speechLocale: 'ml-IN',
  },
  {
    code: 'kn',
    displayName: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    speechLocale: 'kn-IN',
  },
];

export const getLanguageByCode = (code: string): LanguageConfig => {
  return LANGUAGES.find((lang) => lang.code === code) || LANGUAGES[0];
};
