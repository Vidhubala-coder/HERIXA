import { apiFetch, getApiUrl, isEmulator, getMetroIP } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profileImageUrl?: string | null;
  preferredLanguage?: string | null;
  favoriteMonuments: string[];
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface UserHistoryItem {
  _id: string;
  userId: string;
  monumentId?: {
    _id: string;
    id: string;
    name: string;
    images?: string[];
    slug?: string;
  };
  actionType: 'recognition' | 'search' | 'view' | 'ai_question';
  query?: string;
  createdAt: string;
}

export const getUserProfile = async (
  userId: string,
  authToken?: string | null
): Promise<UserProfile> => {
  const storageKey = `@heritage_ar_profile_${userId}`;
  try {
    const headers: any = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const result = await apiFetch(`/api/users/${userId}`, {
      headers,
    });
    const profile = result.data;
    if (profile) {
      await AsyncStorage.setItem(storageKey, JSON.stringify(profile));
    }
    return profile;
  } catch (error: any) {
    // If it is a network error (or cached offline state), fall back to AsyncStorage cache
    if (error.isNetworkError) {
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            console.log('[USER PROFILE] Loaded cached profile from storage (offline).');
            return parsed;
          } catch (jsonErr) {
            console.warn(`[HERIXA-STORAGE] Malformed cached profile for user ${userId}. Clearing key.`, jsonErr);
            await AsyncStorage.removeItem(storageKey).catch(() => {});
          }
        }
      } catch (storageErr) {
        console.error('Failed to load profile from AsyncStorage cache:', storageErr);
      }
    }
    throw error;
  }
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  preferredLanguage?: string | null
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch('/api/users/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, preferredLanguage }),
  });
  return result;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return result;
};

export const verifyOtp = async (
  email: string,
  otp: string
): Promise<{ success: boolean; data: UserProfile; token: string }> => {
  const result = await apiFetch('/api/users/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  return {
    success: result.success,
    data: result.data,
    token: result.token,
  };
};

export const resendOtp = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch('/api/users/otp/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return result;
};

export const updateProfile = async (
  userId: string,
  name: string | undefined,
  avatar: string | undefined,
  authToken: string,
  preferredLanguage?: string | null
): Promise<{ success: boolean; data: UserProfile }> => {
  const result = await apiFetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ name, avatar, preferredLanguage }),
  });
  if (result && result.success && result.data) {
    const storageKey = `@heritage_ar_profile_${userId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(result.data));
  }
  return result;
};

export const getUserHistory = async (
  userId: string,
  authToken: string
): Promise<{ success: boolean; data: UserHistoryItem[] }> => {
  const result = await apiFetch(`/api/users/${userId}/history`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  return result;
};

export const addHistoryEntry = async (
  userId: string,
  actionType: 'recognition' | 'search' | 'view' | 'ai_question',
  monumentId?: string,
  query?: string,
  authToken?: string | null
): Promise<{ success: boolean; data: any }> => {
  const headers: any = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const result = await apiFetch(`/api/users/${userId}/history`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ actionType, monumentId, query }),
  });
  return result;
};

export const deleteHistoryItem = async (
  historyId: string,
  authToken: string
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch(`/api/history/${historyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  return result;
};

export const clearAllHistory = async (
  authToken: string
): Promise<{ success: boolean; message: string; deletedCount?: number }> => {
  const result = await apiFetch('/api/history', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  return result;
};

export const uploadProfilePhoto = async (
  formData: FormData,
  authToken: string,
  userId?: string | null
): Promise<{ success: boolean; data: UserProfile; message: string }> => {
  const apiURL = getApiUrl();
  const baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
  const url = `${baseUrl}/api/users/profile/photo`;

  console.log(`[USER PHOTO] Sending profile photo upload to: ${url}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.timeout = 60000;

    xhr.onload = () => {
      console.log(`[USER PHOTO] Response status: ${xhr.status}`);
      let responseData: any;
      try {
        responseData = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        responseData = { message: xhr.responseText || 'Invalid JSON response from server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (userId) {
          const storageKey = `@heritage_ar_profile_${userId}`;
          AsyncStorage.setItem(storageKey, JSON.stringify(responseData.data)).catch((err) =>
            console.warn('[USER PHOTO] Failed to cache profile after photo upload:', err)
          );
        }
        resolve({
          success: true,
          data: responseData.data,
          message: responseData.message || 'Photo uploaded successfully',
        });
      } else {
        resolve({
          success: false,
          data: {} as any,
          message: responseData.message || `Upload failed with status: ${xhr.status}`,
        });
      }
    };

    xhr.onerror = () => {
      console.log('[USER PHOTO] XHR Connection failed');
      resolve({
        success: false,
        data: {} as any,
        message: 'Unable to connect to the server.',
      });
    };

    xhr.ontimeout = () => {
      console.log('[USER PHOTO] XHR Request timed out');
      resolve({
        success: false,
        data: {} as any,
        message: 'Upload timed out. Please check your connection and try again.',
      });
    };

    xhr.send(formData as any);
  });
};

export const deleteProfilePhoto = async (
  authToken: string,
  userId?: string | null
): Promise<{ success: boolean; data: UserProfile; message: string }> => {
  const result = await apiFetch('/api/users/profile/photo', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  if (result.success && result.data && userId) {
    const storageKey = `@heritage_ar_profile_${userId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(result.data)).catch((err) =>
      console.warn('[USER PHOTO] Failed to cache profile after photo delete:', err)
    );
  }
  return result;
};

export const getProfileImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  const apiURL = getApiUrl();
  let baseUrl = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;

  // Check if we are on a physical Android device
  const isPhysicalAndroid = Platform.OS === 'android' && !isEmulator();
  const isLocalHostBase = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('10.0.2.2');

  // Normalize path separators (convert Windows backslashes to forward slashes)
  let normalizedPath = imagePath.replace(/\\/g, '/');

  // Replace localhost or 127.0.0.1 domain with the configured API URL base domain
  if (normalizedPath.includes('localhost') || normalizedPath.includes('127.0.0.1')) {
    const match = normalizedPath.match(/^https?:\/\/[^\/]+(.*)$/);
    if (match && match[1]) {
      normalizedPath = match[1];
    }
  }

  // 1. Absolute valid remote URLs remain unchanged
  if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
    return normalizedPath;
  }

  // 2. Relative path -> prepend backend base URL
  const formattedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  
  // For physical Android, translate localhost base to host computer's LAN IP
  if (isPhysicalAndroid && isLocalHostBase) {
    const lanIp = (process.env.EXPO_PUBLIC_LAN_IP && process.env.EXPO_PUBLIC_LAN_IP.trim() !== '') 
      ? process.env.EXPO_PUBLIC_LAN_IP.trim() 
      : getMetroIP();
    
    if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
      const portMatch = baseUrl.match(/:(\d+)/);
      const port = portMatch ? portMatch[1] : '5000';
      baseUrl = `http://${lanIp}:${port}`;
    }
  }

  return `${baseUrl}${formattedPath}`;
};

export const forgotPassword = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch('/api/users/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return result;
};

export const verifyResetOtp = async (
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; resetToken?: string }> => {
  const result = await apiFetch('/api/users/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  return result;
};

export const resetPassword = async (
  resetToken: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch('/api/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
  return result;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  authToken: string
): Promise<{ success: boolean; message: string }> => {
  const result = await apiFetch('/api/users/change-password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  return result;
};
