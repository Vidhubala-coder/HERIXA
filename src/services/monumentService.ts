import { apiFetch, getApiUrl, isEmulator, getMetroIP, getConnectivityState } from './api';
import { Monument as LocalMonument, MONUMENTS } from '../data/monuments';
import { Platform } from 'react-native';

export interface ApiStructuredTimelineEvent {
  year: string;
  title: string;
  description: string;
  significance?: string;
}

export interface ApiStructuredHistoricalEvent {
  period: string;
  title: string;
  description: string;
}

export interface ApiHistorySection {
  id?: string;
  title: string;
  content: string;
  images?: string[];
  imageUrls?: string[];
  order: number;
}

export interface ApiMonumentImage {
  id?: string;
  _id?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  imageType: 'historical' | 'archival' | 'modern' | 'architecture' | 'sculpture' | 'inscription' | 'restoration';
  source?: string;
  sourceUrl?: string;
  photographer?: string;
  year?: string;
  license?: string;
  credit?: string;
  verificationStatus?: 'unverified' | 'source-listed' | 'admin-verified';
}

export interface ApiRecognitionImage {
  id?: string;
  _id?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  viewType:
    | 'front'
    | 'rear'
    | 'left'
    | 'right'
    | 'side'
    | 'entrance'
    | 'gopuram'
    | 'vimana'
    | 'mandapa'
    | 'pillar'
    | 'sculpture'
    | 'inscription'
    | 'interior'
    | 'exterior'
    | 'wide-view'
    | 'detail'
    | 'other';
  featureType?: string;
  title?: string;
  description?: string;
  source?: string;
  sourceUrl?: string;
  photographer?: string;
  year?: string;
  license?: string;
  credit?: string;
  verificationStatus?: 'unverified' | 'source-listed' | 'admin-verified';
}

export interface ApiReferenceSource {
  provider: string;
  collectionUrl: string;
}

export interface ApiReferenceImage {
  filename: string;
  localPath: string;
  viewType: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
}

export interface ScanEvidence {
  id: string;
  uri: string;
  base64?: string;
  capturedAt: number;
  viewType?: string;
}

// Extend the local monument to support backend _id and slug for mapping
export interface ApiMonument extends Omit<LocalMonument, 'image' | 'category'> {
  category: 'Temples' | 'Sculptures' | 'Forts' | 'Artifacts' | 'Historical Sites';
  featured?: boolean;
  historySections?: ApiHistorySection[];
  historicalImages?: ApiMonumentImage[];
  modernImages?: ApiMonumentImage[];
  architectureImages?: ApiMonumentImage[];
  restorationImages?: ApiMonumentImage[];
  sculptureImages?: ApiMonumentImage[];
  inscriptionImages?: ApiMonumentImage[];
  recognitionImages?: ApiRecognitionImage[];
  _id: string;
  slug: string;
  image: string; // resolved absolute image URL
  imageUrl?: string;
  galleryImages: string[];
  historicalBackground: string;
  culturalSignificance: string;
  preservationStatus: string;
  interestingFacts: string[];
  arEnabled?: boolean;
  recognitionImageUrl?: string;
  referenceSources?: ApiReferenceSource[];
  referenceImages?: ApiReferenceImage[];

  imageSource?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  imageAttribution?: string;

  
  // Basic Information
  district?: string;
  coordinates?: { latitude: number; longitude: number };
  monumentType?: string;
  historicalPeriod?: string;
  constructionYear?: string;
  constructionPeriod?: string;
  ruler?: string;
  builder?: string;
  architect?: string;

  // History
  shortHistory?: string;
  fullHistory?: string;
  originStory?: string;
  constructionHistory?: string;
  importantRulers?: string[];
  dynastyHistory?: string;
  historicalTimeline?: ApiStructuredTimelineEvent[];
  historicalEvents?: ApiStructuredHistoricalEvent[];

  // Architecture
  buildingMaterials?: string;
  structuralFeatures?: string;
  architecturalStyle?: string;
  vimanaDetails?: string;
  gopuramDetails?: string;
  mandapaDetails?: string;
  sculptureDetails?: string;
  pillarDetails?: string;
  ceilingDetails?: string;
  inscriptionDetails?: string;
  engineeringFeatures?: string;

  // Cultural Importance
  culturalImportance?: string;
  religiousImportance?: string;
  socialImportance?: string;
  artisticImportance?: string;
  culturalPractices?: string;
  traditionalPractices?: string;
  festivals?: string[];
  rituals?: string[];

  // Legends and Stories
  legends?: string[];
  mythology?: string;
  localStories?: string[];
  interestingStories?: string[];
  mythologicalStories?: string[];
  localTraditions?: string[];

  // Preservation
  preservationHistory?: string;
  restorationHistory?: string;
  damageHistory?: string;
  conservationEfforts?: string;
  currentCondition?: string;
  conservationAuthority?: string;

  // Heritage Status
  heritageStatus?: string;
  unescoStatus?: string;
  unescoYear?: string;
  heritageRecognition?: string;
  protectedStatus?: string;

  // Visitor Information
  dressCode?: string;
  visitorGuidelines?: string;
  howToReach?: string;
  visitingInformation?: string;
  openingHours?: string;
  bestTimeToVisit?: string;
  entryFee?: string;
  nearbyPlaces?: string[];
  openingInformation?: string;
  dressGuidelines?: string;
  photographyRules?: string;
  accessibility?: string;

  // Educational Information
  didYouKnow?: string[];
  importantFacts?: string[];
  quizTopics?: string[];
  architecturalHighlights?: string[];
  historicalHighlights?: string[];

  // Recognition Profile
  recognitionProfile?: {
    distinctiveFeatures?: string[];
    architecturalIdentifiers?: string[];
    visualLandmarks?: string[];
    commonViewpoints?: string[];
    entranceDescription?: string;
    gopuramDescription?: string;
    vimanaDescription?: string;
    mandapaDescription?: string;
    sculptureIdentifiers?: string[];
    inscriptionIdentifiers?: string[];
    recognitionNotes?: string;
  };

  // Keep existing fields
  rulers?: string[];
  materialsUsed?: string[];
  inscriptions?: string[];
  videos?: string[];
  audioGuide?: string;
  alternativeNames?: string[];
  localNames?: string[];
  historicalNames?: string[];
  origin?: string;
  constructionDate?: string;
  originalPurpose?: string;
  whyItWasBuilt?: string;
  historicalDevelopment?: string;
  historicalChanges?: string;
  historicalPersonalities?: string[];
  architectureDescription?: string;
  layout?: string;
  entrance?: string;
  gopuram?: string;
  vimana?: string;
  mandapa?: string;
  pillars?: string;
  sculptures?: string;
  materials?: string;
  uniqueArchitecturalFeatures?: string;

  // 3D / Visualization
  modelUrl?: string;
  modelFormat?: string;
  heritagePreviewImages?: { _id?: string; id?: string; uri: string; viewType: string; title: string; description?: string; order: number; enabled: boolean }[];
  interactivePreviewEnabled?: boolean;
  coverImageUrl?: string;
}

export const getImageUrl = (imagePath: any, isModel = false): any => {
  const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600';
  if (!imagePath) return isModel ? '' : FALLBACK_IMAGE_URL;

  // Case 1: Return React Native local require reference (number) directly
  if (typeof imagePath === 'number') {
    return imagePath;
  }

  // Extract path if it is an object
  let actualPath = '';
  if (typeof imagePath === 'object') {
    actualPath = imagePath.modelUrl || imagePath.imageUrl || '';
  } else if (typeof imagePath === 'string') {
    actualPath = imagePath;
  }

  // Detect if this is a 3D model file/path
  const is3DModel = isModel || 
                    actualPath.toLowerCase().endsWith('.glb') || 
                    actualPath.toLowerCase().endsWith('.gltf') || 
                    actualPath.toLowerCase().includes('/models/');

  if (!actualPath || actualPath.trim() === '') {
    return is3DModel ? '' : FALLBACK_IMAGE_URL;
  }
  
  const apiURL = getApiUrl();
  let baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;

  // Check if we are on a physical Android device
  const isPhysicalAndroid = Platform.OS === 'android' && !isEmulator();
  const isLocalHostBase = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('10.0.2.2');

  // Normalize path separators (convert Windows backslashes to forward slashes)
  let normalizedPath = actualPath.replace(/\\/g, '/');

  // Case 4, 5, 6: Heal any absolute URLs that contain '/uploads/' by stripping the stale host/port prefix
  const uploadsIdx = normalizedPath.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    normalizedPath = normalizedPath.substring(uploadsIdx);
  }

  let finalUrl = '';

  // 1. Absolute valid remote URLs remain unchanged (unless they were already handled by the uploads check above)
  if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
    finalUrl = normalizedPath;
  } else {
    // Case 2 & 3: Normalize relative paths to start with '/uploads/'
    if (!normalizedPath.startsWith('/uploads/') && !normalizedPath.startsWith('uploads/')) {
      if (!normalizedPath.includes('/')) {
        normalizedPath = `/uploads/monuments/${normalizedPath}`;
      } else {
        const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        normalizedPath = `/uploads${cleanPath}`;
      }
    }

    // Prepend the configured backend base URL
    const formattedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    
    // For physical Android, if the backend base is localhost, translate it to the LAN IP for native Image loader
    if (isPhysicalAndroid && isLocalHostBase && !is3DModel) {
      const lanIp = (process.env.EXPO_PUBLIC_LAN_IP && process.env.EXPO_PUBLIC_LAN_IP.trim() !== '') 
        ? process.env.EXPO_PUBLIC_LAN_IP.trim() 
        : getMetroIP();
      
      if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
        const portMatch = baseUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '5000';
        baseUrl = `http://${lanIp}:${port}`;
      }
    }
    
    finalUrl = `${baseUrl}${formattedPath}`;
  }

  return finalUrl;
};

export const mapApiMonumentToLocal = (apiMon: any): ApiMonument => {
  const rawImage = apiMon.imageUrl || apiMon.image || (apiMon.galleryImages && apiMon.galleryImages.length > 0 ? apiMon.galleryImages[0] : '');
  const resolvedImage = getImageUrl(rawImage);


  const resolveImages = (imgs: any[] | undefined) => {
    if (!imgs) return [];
    return imgs.map((img: any) => ({
      ...img,
      imageUrl: getImageUrl(img.imageUrl),
      thumbnailUrl: img.thumbnailUrl ? getImageUrl(img.thumbnailUrl) : undefined,
    }));
  };

  return {
    ...apiMon,
    id: apiMon._id, // Pass MongoDB _id as the monumentId
    image: resolvedImage,
    imageUrl: apiMon.imageUrl || apiMon.image,
    galleryImages: (apiMon.galleryImages || []).map((img: any) => getImageUrl(img)),
    background: apiMon.historicalBackground,
    significance: apiMon.culturalSignificance,
    preservation: apiMon.preservationStatus,
    facts: apiMon.interestingFacts,
    historicalImages: resolveImages(apiMon.historicalImages),
    modernImages: resolveImages(apiMon.modernImages),
    architectureImages: resolveImages(apiMon.architectureImages),
    restorationImages: resolveImages(apiMon.restorationImages),
    sculptureImages: resolveImages(apiMon.sculptureImages),
    inscriptionImages: resolveImages(apiMon.inscriptionImages),
    recognitionImages: resolveImages(apiMon.recognitionImages),
  };
};

export const getMonuments = async (
  params?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    featured?: boolean;
  },
  options?: RequestInit
): Promise<{ data: ApiMonument[]; pagination?: any }> => {
  const queryParts: string[] = [];
  if (params) {
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.featured !== undefined) queryParts.push(`featured=${params.featured}`);
  }

  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const result = await apiFetch(`/api/monuments${query}`, options);
  
  return {
    data: result.data.map(mapApiMonumentToLocal),
    pagination: result.pagination,
  };
};

export interface AiRecognitionHealthResponse {
  success: boolean;
  backend: string;
  ai_recognition: {
    status: 'READY' | 'INITIALIZING' | 'UNAVAILABLE' | 'FAILED';
    aiServiceReachable: boolean;
    modelLoaded: boolean;
    modelReady: boolean;
  };
}

export const getAiRecognitionHealth = async (options?: RequestInit): Promise<AiRecognitionHealthResponse> => {
  try {
    return await apiFetch('/api/monuments/recognize/health', options);
  } catch (err: any) {
    return {
      success: false,
      backend: 'healthy',
      ai_recognition: {
        status: 'UNAVAILABLE',
        aiServiceReachable: false,
        modelLoaded: false,
        modelReady: false
      }
    };
  }
};

export const getFeaturedMonuments = async (options?: RequestInit): Promise<ApiMonument[]> => {
  const result = await apiFetch('/api/monuments/featured', options);
  return result.data.map(mapApiMonumentToLocal);
};

export const getMonumentById = async (id: string, options?: RequestInit): Promise<ApiMonument> => {
  const result = await apiFetch(`/api/monuments/${id}`, options);
  return mapApiMonumentToLocal(result.data);
};

export interface ImageRecognitionResponse {
  success: boolean;
  recognized: boolean;
  status: 'identified' | 'ambiguous' | 'unknown' | 'unclear' | 'uncertain';
  confidence?: number;
  reason?: string;
  monumentName?: string | null;
  possibleMatches?: string[];
  data?: ApiMonument;
  message?: string;
  monumentId?: string | null;
  detectedObjectType?: string | null;
  detectedFeature?: string | null;
  matchedFeatures?: string[];
  uncertainFeatures?: string[];
  recommendedNextView?: string | null;
  supportingViews?: number;
  totalViews?: number;
  errorDetails?: string;
}

export const recognizeMonumentFromImage = async (
  base64Image: string,
  options?: RequestInit & { timeout?: number; latitude?: number; longitude?: number; viewType?: string; preferredLanguage?: string | null }
): Promise<ImageRecognitionResponse> => {
  if (getConnectivityState() === 'unavailable') {
    return {
      success: false,
      recognized: false,
      status: 'unclear',
      reason: 'Connection to HERIXA server is unavailable. Please check that your phone and computer are connected to the same network.',
      errorDetails: 'NETWORK_UNAVAILABLE'
    };
  }
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  const startTime = Date.now();
  const apiURL = getApiUrl();
  const endpoint = '/api/monuments/recognize';
  const sanitizedApiUrl = apiURL.replace(/:\/\/.*@/, '://');

  console.log('[HERIXA-RECOGNITION] Starting recognition');
  console.log(`[HERIXA-RECOGNITION] Endpoint: ${sanitizedApiUrl}${endpoint}`);
  console.log('[HERIXA-RECOGNITION] Image prepared');
  console.log('[HERIXA-RECOGNITION] Upload started');

  if (isDev) {
    console.log(`[RECOGNITION NETWORK] API URL: ${apiURL}`);
    console.log(`[RECOGNITION NETWORK] Recognition endpoint: ${endpoint}`);
    console.log(`[HERIXA AI] Request started`);
    console.log(`[HERIXA AI] Backend URL: ${apiURL}${endpoint}`);
    console.log(`[HERIXA AI] Mode: single-view`);
    console.log(`[HERIXA AI] Image count: 1`);
  }

  const base64Size = base64Image.length;
  const approxBytes = Math.round((base64Size * 3) / 4);
  console.log(`[HERIXA-RECOGNITION] UPLOAD_STARTED ImageSizeBase64: ${base64Size} chars, ApproxSize: ${approxBytes} bytes`);
  console.log('[HERIXA-RECOGNITION] BACKEND_REQUEST_STARTED');

  try {
    const { timeout, latitude, longitude, viewType, preferredLanguage, ...restOptions } = options || {};
    const result = await apiFetch(endpoint, {
      ...restOptions,
      timeout: timeout ?? 120000, // 120 seconds timeout
      method: 'POST',
      body: JSON.stringify({
        image: base64Image,
        scanEvidence: [{
          id: 'single-capture',
          uri: 'local-uri',
          base64: base64Image,
          capturedAt: Date.now(),
          viewType
        }],
        latitude,
        longitude,
        preferredLanguage
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[HERIXA-RECOGNITION] BACKEND_RESPONSE_RECEIVED Duration: ${duration}ms, Status: 200`);
    console.log('[HERIXA-RECOGNITION] Response received');
    console.log('[HERIXA-RECOGNITION] HTTP status: 200');
    console.log(`[HERIXA-RECOGNITION] Prediction: ${result.monumentName || 'unknown'}`);
    console.log(`[HERIXA-RECOGNITION] Confidence: ${result.confidence || 0}`);

    if (isDev) {
      console.log(`[HERIXA AI] Request completed`);
      console.log(`[HERIXA AI] HTTP status: 200`);
      console.log(`[HERIXA AI] Recognition status: ${result.status || 'unknown'}`);
      console.log(`[HERIXA AI] Confidence: ${result.confidence || 0}`);
      console.log(`[HERIXA AI] Duration: ${duration}ms`);
    }

    return {
      success: result.success,
      recognized: result.recognized || false,
      status: result.status || 'unknown',
      monumentId: result.monumentId || null,
      monumentName: result.monumentName || null,
      detectedObjectType: result.detectedObjectType || null,
      detectedFeature: result.detectedFeature || null,
      confidence: result.confidence || 0,
      supportingViews: result.supportingViews || (result.recognized ? 1 : 0),
      totalViews: result.totalViews || 1,
      reason: result.reason || result.message || 'Recognition complete',
      matchedFeatures: result.matchedFeatures || [],
      uncertainFeatures: result.uncertainFeatures || [],
      recommendedNextView: result.recommendedNextView || null,
      data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
      message: result.message,
      errorDetails: result.recognized ? 'SUCCESS' : (result.errorDetails || 'UNCERTAIN_RECOGNITION'),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.log(`[HERIXA-RECOGNITION] ${err.isCancelled ? 'REQUEST_ABORTED' : 'REQUEST_FAILED'} Duration: ${duration}ms, Status: ${err.status || 'N/A'}, ErrorName: ${err.name}, Message: ${err.message}`);

    let userMessage = 'Recognition failed.';
    let status: 'identified' | 'ambiguous' | 'unknown' | 'unclear' | 'uncertain' = 'unknown';
    let errorDetails = err.responseBody?.errorDetails || 'RECOGNITION_FAILED';

    if (err.isCancelled) {
      userMessage = 'Recognition request was interrupted. Please try again.';
      errorDetails = 'REQUEST_CANCELLED';
    } else if (err.isTimeout) {
      userMessage = 'API Request Timeout. Connection took too long.';
      status = 'unclear';
      errorDetails = 'REQUEST_TIMEOUT';
    } else if (err.isNetworkError) {
      userMessage = 'Connection to HERIXA server is unavailable. Please check that your phone and computer are connected to the same network.';
      status = 'unclear';
      errorDetails = 'NETWORK_UNAVAILABLE';
    } else if (err.status === 429) {
      userMessage = 'Too many requests. Please try again later.';
      status = 'uncertain';
      errorDetails = 'RATE_LIMITED';
    } else if (err.status === 503 || (err.responseBody?.errorDetails === 'MODEL_UNAVAILABLE') || (err.responseBody?.message?.includes('MODEL_UNAVAILABLE'))) {
      userMessage = 'HERIXA recognition service is temporarily unavailable. Please try again.';
      status = 'unknown';
      errorDetails = 'MODEL_UNAVAILABLE';
    } else {
      userMessage = err.message || 'Recognition failed. Please try again.';
      status = 'unknown';
    }

    console.log('[HERIXA-RECOGNITION] Response received');
    console.log(`[HERIXA-RECOGNITION] HTTP status: ${err.status || 'N/A'}`);
    console.log(`[HERIXA-RECOGNITION] Failure reason: ${userMessage} (${errorDetails})`);

    if (isDev) {
      console.log(`[HERIXA AI] Recognition failed`);
      console.log(`[HERIXA AI] HTTP status: ${err.status || 'N/A'}`);
      console.log(`[HERIXA AI] Error type: ${err.isTimeout ? 'Timeout' : err.isCancelled ? 'Cancelled' : err.isNetworkError ? 'NetworkError' : 'ServerError'}`);
      console.log(`[HERIXA AI] Backend message: ${err.message || 'N/A'}`);
      console.log(`[HERIXA AI] Backend error details: ${err.responseBody ? JSON.stringify(err.responseBody) : 'N/A'}`);
      console.log(`[HERIXA AI] Duration: ${duration}ms`);
      if (err.status === 500 || err.status === 502 || err.status === 503) {
        console.log(`[HERIXA AI] HTTP ${err.status}`);
        console.log(`[HERIXA AI] Backend response: ${err.message || 'N/A'}`);
      }
    }

    return {
      success: false,
      recognized: false,
      status,
      reason: userMessage,
      errorDetails,
    };
  }
};

export const recognizeMonumentFromMultiView = async (
  scanEvidence: ScanEvidence[],
  options?: RequestInit & { timeout?: number; latitude?: number; longitude?: number; preferredLanguage?: string | null }
): Promise<ImageRecognitionResponse> => {
  if (getConnectivityState() === 'unavailable') {
    return {
      success: false,
      recognized: false,
      status: 'unclear',
      reason: 'Connection to HERIXA server is unavailable. Please check that your phone and computer are connected to the same network.',
      errorDetails: 'NETWORK_UNAVAILABLE'
    };
  }
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  const startTime = Date.now();
  const apiURL = getApiUrl();
  const endpoint = '/api/monuments/recognize-multiview';
  const sanitizedApiUrl = apiURL.replace(/:\/\/.*@/, '://');

  console.log('[HERIXA-RECOGNITION] Starting recognition');
  console.log(`[HERIXA-RECOGNITION] Endpoint: ${sanitizedApiUrl}${endpoint}`);
  console.log('[HERIXA-RECOGNITION] Image prepared');
  console.log('[HERIXA-RECOGNITION] Upload started');

  if (isDev) {
    console.log(`[RECOGNITION NETWORK] API URL: ${apiURL}`);
    console.log(`[RECOGNITION NETWORK] Recognition endpoint: ${endpoint}`);
    console.log(`[HERIXA AI] Request started`);
    console.log(`[HERIXA AI] Backend URL: ${apiURL}${endpoint}`);
    console.log(`[HERIXA AI] Mode: multi-view`);
    console.log(`[HERIXA AI] Image count: ${scanEvidence.length}`);
  }

  const imagesBase64 = scanEvidence.map(e => e.base64).filter((b): b is string => typeof b === 'string');
  const totalBase64Size = imagesBase64.reduce((acc, curr) => acc + curr.length, 0);
  const approxBytes = Math.round((totalBase64Size * 3) / 4);
  console.log(`[HERIXA-RECOGNITION] UPLOAD_STARTED ImageCount: ${scanEvidence.length}, TotalImageSizeBase64: ${totalBase64Size} chars, ApproxSize: ${approxBytes} bytes`);
  console.log('[HERIXA-RECOGNITION] BACKEND_REQUEST_STARTED');

  try {
    const { timeout, latitude, longitude, preferredLanguage, ...restOptions } = options || {};
    const result = await apiFetch(endpoint, {
      ...restOptions,
      timeout: timeout ?? 120000, // 120 seconds timeout
      method: 'POST',
      body: JSON.stringify({
        images: imagesBase64,
        scanEvidence,
        latitude,
        longitude,
        preferredLanguage
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[HERIXA-RECOGNITION] BACKEND_RESPONSE_RECEIVED Duration: ${duration}ms, Status: 200`);
    console.log('[HERIXA-RECOGNITION] Response received');
    console.log('[HERIXA-RECOGNITION] HTTP status: 200');
    console.log(`[HERIXA-RECOGNITION] Prediction: ${result.monumentName || 'unknown'}`);
    console.log(`[HERIXA-RECOGNITION] Confidence: ${result.confidence || 0}`);

    if (isDev) {
      console.log(`[HERIXA AI] Request completed`);
      console.log(`[HERIXA AI] HTTP status: 200`);
      console.log(`[HERIXA AI] Recognition status: ${result.status || 'unknown'}`);
      console.log(`[HERIXA AI] Confidence: ${result.confidence || 0}`);
      console.log(`[HERIXA AI] Duration: ${duration}ms`);
    }

    return {
      success: result.success,
      recognized: result.recognized || false,
      status: result.status || 'unknown',
      monumentId: result.monumentId || null,
      monumentName: result.monumentName || null,
      detectedObjectType: result.detectedObjectType || null,
      detectedFeature: result.detectedFeature || null,
      confidence: result.confidence || 0,
      supportingViews: result.supportingViews || (result.recognized ? scanEvidence.length : 0),
      totalViews: result.totalViews || scanEvidence.length,
      reason: result.reason || result.message || 'Recognition complete',
      matchedFeatures: result.matchedFeatures || [],
      uncertainFeatures: result.uncertainFeatures || [],
      recommendedNextView: result.recommendedNextView || null,
      data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
      message: result.message,
      errorDetails: result.recognized ? 'SUCCESS' : (result.errorDetails || 'UNCERTAIN_RECOGNITION'),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.log(`[HERIXA-RECOGNITION] ${err.isCancelled ? 'REQUEST_ABORTED' : 'REQUEST_FAILED'} Duration: ${duration}ms, Status: ${err.status || 'N/A'}, ErrorName: ${err.name}, Message: ${err.message}`);

    let userMessage = 'Recognition failed.';
    let status: 'identified' | 'ambiguous' | 'unknown' | 'unclear' | 'uncertain' = 'unknown';
    let errorDetails = err.responseBody?.errorDetails || 'RECOGNITION_FAILED';

    if (err.isCancelled) {
      userMessage = 'Recognition request was interrupted. Please try again.';
      errorDetails = 'REQUEST_CANCELLED';
    } else if (err.isTimeout) {
      userMessage = 'API Request Timeout. Connection took too long.';
      status = 'unclear';
      errorDetails = 'REQUEST_TIMEOUT';
    } else if (err.isNetworkError) {
      userMessage = 'Connection to HERIXA server is unavailable. Please check that your phone and computer are connected to the same network.';
      status = 'unclear';
      errorDetails = 'NETWORK_UNAVAILABLE';
    } else if (err.status === 429) {
      userMessage = 'Too many requests. Please try again later.';
      status = 'uncertain';
      errorDetails = 'RATE_LIMITED';
    } else if (err.status === 503 || (err.responseBody?.errorDetails === 'MODEL_UNAVAILABLE') || (err.responseBody?.message?.includes('MODEL_UNAVAILABLE'))) {
      userMessage = 'HERIXA recognition service is temporarily unavailable. Please try again.';
      status = 'unknown';
      errorDetails = 'MODEL_UNAVAILABLE';
    } else {
      userMessage = err.message || 'Recognition failed. Please try again.';
      status = 'unknown';
    }

    console.log('[HERIXA-RECOGNITION] Response received');
    console.log(`[HERIXA-RECOGNITION] HTTP status: ${err.status || 'N/A'}`);
    console.log(`[HERIXA-RECOGNITION] Failure reason: ${userMessage} (${errorDetails})`);

    if (isDev) {
      console.log(`[HERIXA AI] Recognition failed`);
      console.log(`[HERIXA AI] HTTP status: ${err.status || 'N/A'}`);
      console.log(`[HERIXA AI] Error type: ${err.isTimeout ? 'Timeout' : err.isCancelled ? 'Cancelled' : err.isNetworkError ? 'NetworkError' : 'ServerError'}`);
      console.log(`[HERIXA AI] Backend message: ${err.message || 'N/A'}`);
      console.log(`[HERIXA AI] Backend error details: ${err.responseBody ? JSON.stringify(err.responseBody) : 'N/A'}`);
      console.log(`[HERIXA AI] Duration: ${duration}ms`);
      if (err.status === 500 || err.status === 502 || err.status === 503) {
        console.log(`[HERIXA AI] HTTP ${err.status}`);
        console.log(`[HERIXA AI] Backend response: ${err.message || 'N/A'}`);
      }
    }

    return {
      success: false,
      recognized: false,
      status,
      reason: userMessage,
      errorDetails,
    };
  }
};

export const uploadMonumentImage = async (
  id: string,
  formData: FormData,
  activeUserId: string,
  authToken?: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/monuments/${id}/upload`;

    console.log("[UPLOAD] Starting XMLHttpRequest upload to", url);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    
    xhr.setRequestHeader('x-user-id', activeUserId);
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    } else if (activeUserId) {
      xhr.setRequestHeader('Authorization', `Bearer ${activeUserId}`);
    }
    // Let the native networking layer generate the Content-Type boundary automatically

    xhr.timeout = 30000; // 30 seconds

    xhr.onload = () => {
      console.log("[UPLOAD] Response status:", xhr.status);
      let responseData: any;
      try {
        responseData = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        responseData = { message: 'Invalid response from server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          data: responseData.data ? mapApiMonumentToLocal(responseData.data) : undefined,
          message: responseData.message || 'Upload successful',
        });
      } else {
        const error = new Error(responseData.message || `Upload failed with status: ${xhr.status}`);
        (error as any).status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      console.log("[UPLOAD] Response status:", 0);
      const error = new Error('Unable to connect to the server.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      console.log("[UPLOAD] Response status: timeout");
      const error = new Error('Upload timed out. Please check your connection and try again.');
      (error as any).status = 0;
      (error as any).isTimeout = true;
      reject(error);
    };

    xhr.onabort = () => {
      console.log("[UPLOAD] Response status: aborted");
      const error = new Error('Upload aborted.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.send(formData as any);
  });
};

export const deleteMonumentImage = async (
  id: string,
  activeUserId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/monuments/${id}/image`;

    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', url);
    
    xhr.setRequestHeader('x-user-id', activeUserId);

    xhr.timeout = 30000; // 30 seconds

    xhr.onload = () => {
      let responseData: any;
      try {
        responseData = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        responseData = { message: 'Invalid response from server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          data: responseData.data ? mapApiMonumentToLocal(responseData.data) : undefined,
          message: responseData.message || 'Image deleted successfully',
        });
      } else {
        const error = new Error(responseData.message || `Deletion failed with status: ${xhr.status}`);
        (error as any).status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Unable to connect to the server.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      const error = new Error('Request timed out. Please try again.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.send();
  });
};



export const updateMonumentDetails = async (
  id: string,
  details: Partial<ApiMonument>,
  authTokenOrUserId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch(`/api/monuments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authTokenOrUserId.length > 30 || authTokenOrUserId.startsWith('eyJ')
        ? { 'Authorization': `Bearer ${authTokenOrUserId}` }
        : { 'x-user-id': authTokenOrUserId }),
    },
    body: JSON.stringify(details),
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'Monument details updated successfully',
  };
};

export const createHistorySection = async (
  id: string,
  section: Partial<ApiHistorySection>,
  userId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch(`/api/monuments/${id}/history-sections`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: JSON.stringify(section),
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'History section created successfully',
  };
};

export const updateHistorySection = async (
  id: string,
  sectionId: string,
  section: Partial<ApiHistorySection>,
  userId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch(`/api/monuments/${id}/history-sections/${sectionId}`, {
    method: 'PUT',
    headers: {
      'x-user-id': userId,
    },
    body: JSON.stringify(section),
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'History section updated successfully',
  };
};

export const deleteHistorySection = async (
  id: string,
  sectionId: string,
  userId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch(`/api/monuments/${id}/history-sections/${sectionId}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': userId,
    },
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'History section deleted successfully',
  };
};

export const uploadHistorySectionImage = async (
  id: string,
  sectionId: string,
  formData: FormData,
  activeUserId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/monuments/${id}/history-sections/${sectionId}/images`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('x-user-id', activeUserId);

    xhr.timeout = 60000; // 60 seconds

    xhr.onload = () => {
      let responseData: any;
      try {
        responseData = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        responseData = { message: 'Invalid response from server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          data: responseData.data ? mapApiMonumentToLocal(responseData.data) : undefined,
          message: responseData.message || 'Image uploaded successfully',
        });
      } else {
        const error = new Error(responseData.message || `Upload failed with status: ${xhr.status}`);
        (error as any).status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Unable to connect to the server.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      const error = new Error('Request timed out. Please try again.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.send(formData as any);
  });
};

export const deleteHistorySectionImage = async (
  id: string,
  sectionId: string,
  imageId: string,
  userId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch(`/api/monuments/${id}/history-sections/${sectionId}/images/${imageId}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': userId,
    },
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'Image deleted successfully',
  };
};

export const generateAIMonumentDetails = async (
  id: string,
  userId: string,
  options?: { signal?: AbortSignal }
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const result = await apiFetch(`/api/monuments/${id}/generate-details`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
      },
      timeout: 190000, // 190 seconds (longer than backend HTTP timeout of 185s)
      signal: options?.signal,
    });
    return {
      success: true,
      data: result.data,
      message: result.message || 'Details generated successfully',
    };
  } catch (err: any) {
    console.warn('[AI Service] generateAIMonumentDetails failed:', err);
    let userMessage = 'Failed to generate details.';
    if (err.isCancelled) {
      userMessage = 'Generation cancelled.';
    } else if (err.isTimeout) {
      userMessage = 'AI generation is taking longer than expected. Please wait or try again.';
    } else if (err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504) {
      userMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
    } else if (err.isNetworkError || err.message?.toLowerCase().includes('connect') || err.message?.toLowerCase().includes('network')) {
      userMessage = 'Unable to connect to the AI service. Please check your internet connection and try again.';
    } else {
      userMessage = err.message || 'Failed to generate monument details. Please try again.';
    }
    throw new Error(userMessage);
  }
};

export const uploadGalleryImage = async (
  id: string,
  formDataOrJson: FormData | any,
  activeUserId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  if (!(formDataOrJson instanceof FormData)) {
    const result = await apiFetch(`/api/monuments/${id}/gallery-images`, {
      method: 'POST',
      body: JSON.stringify(formDataOrJson),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUserId,
      },
    });
    return {
      success: true,
      data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
      message: result.message || 'Gallery image saved successfully',
    };
  }

  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/monuments/${id}/gallery-images`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('x-user-id', activeUserId);
    xhr.timeout = 60000;

    xhr.onload = () => {
      let responseData: any;
      try {
        responseData = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        responseData = { message: 'Invalid response from server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          data: responseData.data ? mapApiMonumentToLocal(responseData.data) : undefined,
          message: responseData.message || 'Gallery image uploaded successfully',
        });
      } else {
        const error = new Error(responseData.message || `Upload failed with status: ${xhr.status}`);
        (error as any).status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Unable to connect to the server.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      const error = new Error('Request timed out. Please try again.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.send(formDataOrJson as any);
  });
};

export const updateGalleryImageMetadata = async (
  id: string,
  imageId: string,
  formData: FormData,
  activeUserId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/monuments/${id}/gallery-images/${imageId}`;

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-user-id', activeUserId);
    xhr.timeout = 60000;

    xhr.onload = () => {
      let responseData: any;
      try {
        responseData = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        responseData = { message: 'Invalid response from server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
          data: responseData.data ? mapApiMonumentToLocal(responseData.data) : undefined,
          message: responseData.message || 'Gallery image updated successfully',
        });
      } else {
        const error = new Error(responseData.message || `Update failed with status: ${xhr.status}`);
        (error as any).status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Unable to connect to the server.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.ontimeout = () => {
      const error = new Error('Request timed out. Please try again.');
      (error as any).status = 0;
      reject(error);
    };

    xhr.send(formData as any);
  });
};

export const deleteGalleryImage = async (
  id: string,
  imageId: string,
  userId: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch(`/api/monuments/${id}/gallery-images/${imageId}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': userId,
    },
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'Gallery image deleted successfully',
  };
};

export const discoverAIMonumentImages = async (
  id: string,
  userId: string,
  options?: { signal?: AbortSignal }
): Promise<{ success: boolean; data?: ApiMonumentImage[]; message?: string }> => {
  try {
    const result = await apiFetch(`/api/monuments/${id}/discover-images`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
      },
      timeout: 190000, // 190 seconds
      signal: options?.signal,
    });
    return {
      success: true,
      data: result.data,
      message: result.message || 'Reference images discovered successfully',
    };
  } catch (err: any) {
    console.warn('[AI Service] discoverAIMonumentImages failed:', err);
    let userMessage = 'Failed to discover images.';
    if (err.isCancelled) {
      userMessage = 'Generation cancelled.';
    } else if (err.isTimeout) {
      userMessage = 'AI generation is taking longer than expected. Please wait or try again.';
    } else if (err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504) {
      userMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
    } else if (err.isNetworkError || err.message?.toLowerCase().includes('connect') || err.message?.toLowerCase().includes('network')) {
      userMessage = 'Unable to connect to the AI service. Please check your internet connection and try again.';
    } else {
      userMessage = err.message || 'Failed to discover reference images. Please try again.';
    }
    throw new Error(userMessage);
  }
};

export const getWikimediaFallback = (monument: any): string => {
  if (!monument) return '';
  const slug = monument.slug || monument.id || '';
  const localMon = MONUMENTS.find(m => m.id === slug || m.name?.toLowerCase() === monument.name?.toLowerCase() || slug.includes(m.id));
  return localMon?.image || '';
};

export const createMonument = async (
  monumentData: any,
  authToken: string
): Promise<{ success: boolean; data?: ApiMonument; message?: string }> => {
  const result = await apiFetch('/api/monuments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(monumentData),
  });
  return {
    success: true,
    data: result.data ? mapApiMonumentToLocal(result.data) : undefined,
    message: result.message || 'Heritage site created successfully',
  };
};

export const addHeritageView = async (
  monumentId: string,
  formData: FormData,
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/admin/monuments/${monumentId}/visualization`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.timeout = 30000;

    xhr.onload = () => {
      let resData: any;
      try { resData = JSON.parse(xhr.responseText || '{}'); } catch (e) { resData = { message: 'Invalid response' }; }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, data: resData.data, message: resData.message });
      } else {
        resolve({ success: false, message: resData.message || 'Upload failed' });
      }
    };
    xhr.onerror = () => resolve({ success: false, message: 'Network error occurred' });
    xhr.ontimeout = () => resolve({ success: false, message: 'Upload timed out' });
    xhr.send(formData);
  });
};

export const editHeritageView = async (
  monumentId: string,
  imageId: string,
  formData: FormData,
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  return new Promise((resolve, reject) => {
    const apiURL = getApiUrl();
    const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
    const url = `${baseUrl}/api/admin/monuments/${monumentId}/visualization/${imageId}`;

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.timeout = 30000;

    xhr.onload = () => {
      let resData: any;
      try { resData = JSON.parse(xhr.responseText || '{}'); } catch (e) { resData = { message: 'Invalid response' }; }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, data: resData.data, message: resData.message });
      } else {
        resolve({ success: false, message: resData.message || 'Update failed' });
      }
    };
    xhr.onerror = () => resolve({ success: false, message: 'Network error occurred' });
    xhr.ontimeout = () => resolve({ success: false, message: 'Upload timed out' });
    xhr.send(formData);
  });
};

export const deleteHeritageView = async (
  monumentId: string,
  imageId: string,
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  const result = await apiFetch(`/api/admin/monuments/${monumentId}/visualization/${imageId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  return { success: true, data: result.data, message: result.message };
};

export const updateVisualizationConfig = async (
  monumentId: string,
  config: { interactivePreviewEnabled?: boolean; coverImageUrl?: string; modelUrl?: string; arEnabled?: boolean },
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  const result = await apiFetch(`/api/admin/monuments/${monumentId}/visualization-config`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  return { success: true, data: result.data, message: result.message };
};

export const reorderHeritageViews = async (
  monumentId: string,
  orderedIds: string[],
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  const result = await apiFetch(`/api/admin/monuments/${monumentId}/visualization/reorder`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderedIds })
  });
  return { success: true, data: result.data, message: result.message };
};

export const deleteMonument = async (
  monumentId: string,
  authToken: string
): Promise<{ success: boolean; message?: string }> => {
  const result = await apiFetch(`/api/admin/monuments/${monumentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  return { success: true, message: result.message || 'Heritage site deleted successfully' };
};

// ── Multi-Image Heritage Visuals API ───────────────────────────────────────────

export const uploadMonumentVisuals = async (
  monumentId: string,
  imageUris: string[],
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  const { getApiUrl } = require('./api');
  const apiURL = getApiUrl();
  const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
  const url = `${baseUrl}/api/admin/monuments/${monumentId}/visuals`;

  const formData = new FormData();
  imageUris.forEach((uri, idx) => {
    const fileName = uri.split('/').pop() || `visual_${idx}.jpg`;
    formData.append('images', {
      uri,
      name: fileName,
      type: 'image/jpeg'
    } as any);
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to upload monument visuals.');
  }
  return json;
};

export const deleteMonumentVisual = async (
  monumentId: string,
  visualId: string,
  authToken: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  return await apiFetch(`/api/admin/monuments/${monumentId}/visuals/${visualId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
};

export const getMonumentVisuals = async (
  monumentId: string,
  authToken?: string
): Promise<{ success: boolean; data: any[]; monument?: any }> => {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return await apiFetch(`/api/monuments/${monumentId}/visuals`, {
    method: 'GET',
    headers
  });
};

