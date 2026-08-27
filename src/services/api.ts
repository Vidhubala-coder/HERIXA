import { Platform } from 'react-native';

const Constants = require('expo-constants')?.default || require('expo-constants');

export interface ApiError extends Error {
  status?: number;
  isTimeout?: boolean;
  isCancelled?: boolean;
  isNetworkError?: boolean;
  responseBody?: any;
}

export type ConnectivityState = 'unknown' | 'checking' | 'available' | 'unavailable';

let resolvedApiUrl: string | null = null;
let connectivityState: ConnectivityState = 'unknown';
let activeHealthCheck: Promise<boolean> | null = null;
let lastHealthCheckTime = 0;
const HEALTH_CHECK_COOLDOWN = 15000; // 15 seconds cooldown
let lastConnectivityFailure = 'None';
let lastHttpErrorDetails = 'None';
let connectivityVersion = 0;

let lastLanIp: string | undefined = undefined;
let lastApiUrl: string | undefined = undefined;
let lastAndroidDevMode: string | undefined = undefined;

// General GET request deduplication map
const activeRequests = new Map<string, Promise<any>>();

export const getConnectivityState = (): ConnectivityState => connectivityState;

const setConnectivityState = (newState: ConnectivityState) => {
  if (connectivityState !== newState) {
    if (newState === 'available') {
      connectivityVersion++;
      console.log('[HERIXA] Backend available — online mode enabled');
      console.log(`[HERIXA-NETWORK] API URL: ${resolvedApiUrl || getApiUrl()}`);
      console.log('[HERIXA-NETWORK] Connectivity: ONLINE');
    } else if (newState === 'unavailable') {
      console.log('[HERIXA] Backend unavailable — offline mode enabled');
      console.log(`[HERIXA-NETWORK] API URL: ${getApiUrl()}`);
      console.log('[HERIXA-NETWORK] Connectivity: OFFLINE');
    }
    connectivityState = newState;
  }
};

export const resetConnectivityCache = () => {
  connectivityState = 'unknown';
  lastHealthCheckTime = 0;
  activeRequests.clear();
};

// Helper to detect emulator dynamically
export const isEmulator = (): boolean => {
  const brand = (Platform.constants as any)?.Brand?.toLowerCase() || '';
  const model = (Platform.constants as any)?.Model?.toLowerCase() || '';
  const fingerprint = (Platform.constants as any)?.Fingerprint?.toLowerCase() || '';
  const hardware = (Platform.constants as any)?.Hardware?.toLowerCase() || '';
  
  return (
    brand.includes('generic') ||
    brand.includes('google') && model.includes('emulator') ||
    model.includes('emulator') ||
    model.includes('android sdk built for') ||
    fingerprint.startsWith('generic') ||
    fingerprint.startsWith('unknown') ||
    hardware.includes('goldfish') ||
    hardware.includes('ranchu') ||
    hardware.includes('vbox86')
  );
};

export const getMetroIP = (): string | null => {
  let hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.hostUri;
  
  if (!hostUri) {
    const manifest2 = (Constants as any).manifest2;
    hostUri = manifest2?.extra?.expoGoLaunchMetadata?.debuggerHost || manifest2?.extra?.expoClient?.hostUri;
  }
  
  if (hostUri) {
    const ipMatch = hostUri.match(/^([\d\.]+)/);
    if (ipMatch) {
      const ip = ipMatch[1];
      if (ip !== '127.0.0.1' && ip !== 'localhost') {
        return ip;
      }
    }
  }
  
  // Fallback: check NativeModules.SourceCode?.scriptURL
  try {
    const { NativeModules } = require('react-native');
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([\d\.]+)/);
      if (match) {
        const ip = match[1];
        if (ip !== '127.0.0.1' && ip !== 'localhost') {
          return ip;
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
};

export const isStaleOrLoopback = (ipOrUrl: string | undefined | null): boolean => {
  if (!ipOrUrl) return true;
  const lower = ipOrUrl.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('10.254.129.241')
  );
};

export const getApiUrl = (): string => {
  if (resolvedApiUrl) {
    return resolvedApiUrl;
  }

  const currentLanIp = process.env.EXPO_PUBLIC_LAN_IP;
  const currentApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const currentDevMode = process.env.EXPO_PUBLIC_ANDROID_DEV_MODE;

  // Invalidate in-memory cache if any configuration variable changes at runtime
  if (
    currentLanIp !== lastLanIp ||
    currentApiUrl !== lastApiUrl ||
    currentDevMode !== lastAndroidDevMode
  ) {
    resolvedApiUrl = null;
    lastLanIp = currentLanIp;
    lastApiUrl = currentApiUrl;
    lastAndroidDevMode = currentDevMode;
  }

  const configuredUrl = currentApiUrl || 'http://localhost:5000';
  const portMatch = configuredUrl.match(/:(\d+)\/?$/) || configuredUrl.match(/:(\d+)/);
  const port = portMatch ? portMatch[1] : '5000';

  const devMode = currentDevMode || 'auto';
  const resolvedMode = devMode === 'auto' ? (isEmulator() ? 'emulator' : 'physical') : devMode;

  let finalUrl = '';

  if (Platform.OS !== 'android') {
    finalUrl = configuredUrl;
  } else {
    if (resolvedMode === 'physical') {
      // 1. EXPO_PUBLIC_LAN_IP (excluding stale/loopback)
      if (currentLanIp && currentLanIp.trim() !== '' && !isStaleOrLoopback(currentLanIp)) {
        finalUrl = `http://${currentLanIp.trim()}:${port}`;
      }
      // 2. EXPO_PUBLIC_API_URL (excluding stale/loopback)
      else if (configuredUrl && !isStaleOrLoopback(configuredUrl)) {
        finalUrl = configuredUrl;
      }
      // 3. Metro IP (excluding stale/loopback)
      else {
        const metroIp = getMetroIP();
        if (metroIp && !isStaleOrLoopback(metroIp)) {
          finalUrl = `http://${metroIp}:${port}`;
        } else {
          finalUrl = `http://10.0.2.2:${port}`;
        }
      }
    } else {
      // Emulator mode
      if (configuredUrl && !isStaleOrLoopback(configuredUrl)) {
        finalUrl = configuredUrl;
      } else {
        finalUrl = `http://10.0.2.2:${port}`;
      }
    }
  }

  // DO NOT write finalUrl to resolvedApiUrl here! It is only set on verified reachability
  
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.log(`[HERIXA-API] Platform: ${Platform.OS}`);
    console.log(`[HERIXA-API] Android mode: ${resolvedMode} (configured: ${devMode})`);
    console.log(`[HERIXA-API] Resolved Base URL: ${finalUrl}`);
  }

  return finalUrl;
};

export const checkConnectivity = async (force?: boolean): Promise<boolean> => {
  const now = Date.now();
  
  // Cooldown logic
  if (!force && connectivityState !== 'unknown' && connectivityState !== 'checking' && now - lastHealthCheckTime < HEALTH_CHECK_COOLDOWN) {
    return connectivityState === 'available';
  }

  // Deduplication logic
  if (activeHealthCheck) {
    return activeHealthCheck;
  }

  setConnectivityState('checking');
  const startVersion = connectivityVersion;

  activeHealthCheck = (async () => {
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
    const portMatch = configuredUrl.match(/:(\d+)\/?$/) || configuredUrl.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : '5000';

    const devMode = process.env.EXPO_PUBLIC_ANDROID_DEV_MODE || 'auto';
    const resolvedMode = devMode === 'auto' ? (isEmulator() ? 'emulator' : 'physical') : devMode;

    const candidates: string[] = [];

    if (Platform.OS === 'android' && resolvedMode === 'physical') {
      // 1. EXPO_PUBLIC_LAN_IP
      if (process.env.EXPO_PUBLIC_LAN_IP && process.env.EXPO_PUBLIC_LAN_IP.trim() !== '' && !isStaleOrLoopback(process.env.EXPO_PUBLIC_LAN_IP)) {
        candidates.push(`http://${process.env.EXPO_PUBLIC_LAN_IP.trim()}:${port}`);
      }
      // 2. valid EXPO_PUBLIC_API_URL
      if (configuredUrl && !isStaleOrLoopback(configuredUrl)) {
        candidates.push(configuredUrl);
      }
      // 3. Metro IP
      const metroIp = getMetroIP();
      if (metroIp && !isStaleOrLoopback(metroIp)) {
        candidates.push(`http://${metroIp}:${port}`);
      }
    } else {
      // Emulator / other platforms
      candidates.push(`http://localhost:${port}`);
      candidates.push(`http://127.0.0.1:${port}`);

      if (process.env.EXPO_PUBLIC_LAN_IP && process.env.EXPO_PUBLIC_LAN_IP.trim() !== '' && !isStaleOrLoopback(process.env.EXPO_PUBLIC_LAN_IP)) {
        candidates.push(`http://${process.env.EXPO_PUBLIC_LAN_IP.trim()}:${port}`);
      }

      const metroIp = getMetroIP();
      if (metroIp && !isStaleOrLoopback(metroIp)) {
        candidates.push(`http://${metroIp}:${port}`);
      }

      candidates.push(`http://10.0.2.2:${port}`);
    }

    const uniqueCandidates = Array.from(new Set(candidates));

    let foundUrl: string | null = null;
    let lastStatus = 'None';
    let hadGenuineNetworkFailure = false;

    for (const url of uniqueCandidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout per candidate ping

        const response = await fetch(`${url}/api/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && (data.success || data.status === 'ok' || data.message?.includes('running'))) {
            foundUrl = url;
            lastStatus = '200';
            break;
          }
        } else {
          lastStatus = String(response.status);
        }
      } catch (err: any) {
        lastStatus = err.message || String(err);
        const errMsg = lastStatus.toLowerCase();
        const isAbort = err.name === 'AbortError' || errMsg.includes('canceled') || errMsg.includes('cancelled') || errMsg.includes('timeout') || errMsg.includes('abort');
        if (!isAbort) {
          hadGenuineNetworkFailure = true;
        }
      }
    }

    if (startVersion !== connectivityVersion) {
      return connectivityState === 'available';
    }

    if (foundUrl) {
      resolvedApiUrl = foundUrl;
      setConnectivityState('available');
      lastHealthCheckTime = Date.now();
      
      console.log(`[HERIXA-API] Base URL: ${foundUrl}`);
      console.log(`[HERIXA-API] Health URL: ${foundUrl}/api/health`);
      console.log(`[HERIXA-API] Connectivity status: available`);
      console.log(`[HERIXA-API] Last connectivity failure: ${lastConnectivityFailure}`);
      console.log(`[HERIXA-API] HTTP status: 200`);
      
      return true;
    } else {
      if (hadGenuineNetworkFailure) {
        resolvedApiUrl = null;
        setConnectivityState('unavailable');
      } else {
        // Keep existing resolved URL (never set to null on transient timeout/cancellation) and reset state to unknown so next call can retry
        setConnectivityState('unknown');
      }
      lastHealthCheckTime = Date.now();
      lastConnectivityFailure = new Date().toLocaleString();
      lastHttpErrorDetails = lastStatus;

      const configured = getApiUrl();
      console.log(`[HERIXA-API] Base URL: ${resolvedApiUrl || configured}`);
      console.log(`[HERIXA-API] Connectivity status: ${connectivityState}`);
      console.log(`[HERIXA-API] Last connectivity failure: ${lastConnectivityFailure}`);
      console.log(`[HERIXA-API] HTTP status: ${lastHttpErrorDetails}`);
      
      return false;
    }
  })();

  try {
    const res = await activeHealthCheck;
    return res;
  } finally {
    activeHealthCheck = null;
  }
};

export const apiFetch = async (
  endpoint: string,
  options: RequestInit & { timeout?: number; bypassOfflineCheck?: boolean } = {}
): Promise<any> => {
  const method = options.method?.toUpperCase() || 'GET';
  const apiURL = resolvedApiUrl || getApiUrl();
  
  if (!apiURL) {
    throw new Error('Configuration Error: Resolved API URL is missing.');
  }

  const isWriteRequest = method !== 'GET';
  const shouldBypass = options.bypassOfflineCheck || isWriteRequest;

  // GET Request Deduplication logic
  const url = `${apiURL}${endpoint}`;
  const requestKey = `${method}:${url}:${JSON.stringify(options.headers || {})}:${options.body ? String(options.body) : ''}`;

  if (!isWriteRequest && activeRequests.has(requestKey)) {
    return activeRequests.get(requestKey);
  }

  const promise = (async () => {
    const startVersion = connectivityVersion;

    // Run check connectivity if state is unknown (unless we bypass check)
    if (connectivityState === 'unknown') {
      await checkConnectivity();
    }

    const controller = new AbortController();
    
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => {
          controller.abort();
        });
      }
    }

    const timeoutMs = options.timeout ?? 15000; // 15 seconds default timeout
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

    try {
      const headers: any = {};
      const isFormData = options.body && typeof (options.body as any).append === 'function';
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        data = { message: responseText || `API Error: ${response.status}` };
      }

      if (isDev) {
        const sanitizedBase = apiURL.replace(/:\/\/.*@/, '://');
        console.log(
          `[HERIXA-API]\n\nBase URL: ${sanitizedBase}\nEndpoint: ${endpoint}\nMethod: ${method}\nResult: ${response.status} ${response.statusText || 'OK'}`
        );
      }

      // Any successful response (even 4xx/5xx status) proves backend server is alive and reachable!
      if (startVersion === connectivityVersion) {
        setConnectivityState('available');
        lastHealthCheckTime = Date.now();
        if (!resolvedApiUrl) {
          resolvedApiUrl = apiURL;
        }
      }

      if (!response.ok) {
        const errorObj: ApiError = new Error(data.message || `API Error: ${response.status}`);
        errorObj.status = response.status;
        errorObj.responseBody = data;
        throw errorObj;
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      const isAbort = error.name === 'AbortError' ||
                      error.message?.includes('canceled') ||
                      error.message?.includes('cancelled') ||
                      error.message?.includes('abort');

      let finalError: ApiError;
      let logResult: string;

      if (isAbort && timedOut) {
        finalError = new Error('API Request Timeout. Connection took too long.');
        finalError.isTimeout = true;
        finalError.status = 408;
        logResult = 'TIMEOUT';
      } else if (isAbort && options.signal?.aborted) {
        finalError = new Error('Operation was cancelled.');
        finalError.isCancelled = true;
        logResult = 'CANCELLED';
      } else {
        finalError = error;
        logResult = error.message || 'unknown';
      }

      // Check if this was a response status (e.g. 500, 404), which means backend is still reachable!
      if (error.status) {
        if (startVersion === connectivityVersion) {
          setConnectivityState('available');
          lastHealthCheckTime = Date.now();
          if (!resolvedApiUrl) {
            resolvedApiUrl = apiURL;
          }
        }
      } else {
        // Exclude caller-initiated signal abortions and timeouts from dropping to unavailable!
        const isNetwork =
          !isAbort &&
          (
            error.message?.toLowerCase().includes('fetch failed') ||
            error.message?.toLowerCase().includes('network') ||
            error.message?.toLowerCase().includes('connect') ||
            error.message?.toLowerCase().includes('dns')
          );

        if (isNetwork) {
          if (startVersion === connectivityVersion) {
            setConnectivityState('unavailable');
            lastHealthCheckTime = Date.now();
            resolvedApiUrl = null; // Clear cached URL on network failure to force re-resolution next time
            lastConnectivityFailure = new Date().toLocaleString();
            lastHttpErrorDetails = error.message || String(error);

            const configured = getApiUrl();
            console.log(`[HERIXA-API] Base URL: ${configured}`);
            console.log(`[HERIXA-API] Health URL: ${configured}/api/health`);
            console.log(`[HERIXA-API] Connectivity status: unavailable`);
            console.log(`[HERIXA-API] Last connectivity failure: ${lastConnectivityFailure}`);
            console.log(`[HERIXA-API] HTTP status: ${lastHttpErrorDetails}`);
          }
          
          const detailedMessage = `Unable to connect to the backend API service (${error.message || 'Network Error'}). Switching to offline mode.`;
          const netError: ApiError = new Error(detailedMessage);
          netError.isNetworkError = true;
          throw netError;
        }
      }

      if (isDev) {
        const sanitizedBase = apiURL.replace(/:\/\/.*@/, '://');
        console.log(
          `[HERIXA-API]\n\nBase URL: ${sanitizedBase}\nEndpoint: ${endpoint}\nMethod: ${method}\nResult: ERROR: ${logResult}`
        );
      }
      throw finalError;
    } finally {
      if (!isWriteRequest) {
        activeRequests.delete(requestKey);
      }
    }
  })();

  if (!isWriteRequest) {
    activeRequests.set(requestKey, promise);
  }

  return promise;
};

