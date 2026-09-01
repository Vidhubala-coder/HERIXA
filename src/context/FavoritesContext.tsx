import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as favoriteService from '../services/favoriteService';
import * as userService from '../services/userService';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { checkConnectivity, getConnectivityState } from '../services/api';
import { MONUMENTS } from '../data/monuments';
import { getMonuments } from '../services/monumentService';
import * as ImagePicker from 'expo-image-picker';


interface FavoritesContextType {
  favorites: string[];
  addFavorite: (id: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  isLoading: boolean;
  activeUserId: string | null;
  authToken: string | null;
  userRole: 'user' | 'admin' | null;
  switchUser: (id: string, token: string, role?: 'user' | 'admin') => Promise<void>;
  refreshFavorites: () => Promise<void>;

  // Auth Methods
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, preferredLanguage?: string | null) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; data: any; token: string }>;
  resendOTPCode: (email: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string, method?: 'otp' | 'link') => Promise<{ success: boolean; message: string }>;
  verifyResetOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (resetToken: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  sendSettingsOtp: () => Promise<{ success: boolean; message: string }>;
  verifySettingsOtp: (otp: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;

  // History Methods
  history: any[];
  addHistory: (actionType: 'recognition' | 'search' | 'view' | 'ai_question', monumentId?: string, query?: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  deleteHistory: (historyId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  deletingIds: string[];
  isClearing: boolean;

  // Language Methods
  selectedLanguage: string | null;
  changeLanguage: (lang: string | null) => Promise<void>;

  // Recovery State
  pendingProfilePhotoRecovery: boolean;

  // Profile Management State
  userProfile: any | null;
  setUserProfile: React.Dispatch<React.SetStateAction<any | null>>;
  refreshUserProfile: () => Promise<any>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const getFavoritesStorageKey = (userId: string | null) => {
  return `@heritage_ar_favorites_${userId || 'guest'}`;
};

const getHistoryStorageKey = (userId: string | null) => {
  return `@heritage_ar_history_${userId || 'guest'}`;
};

// Central safe storage parsing helper
const getSafeStorageItem = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const val = await AsyncStorage.getItem(key);
    if (!val) return fallback;
    return JSON.parse(val) as T;
  } catch (err) {
    console.warn(`[HERIXA-STORAGE] Malformed or corrupted value for key "${key}". Clearing key.`, err);
    await AsyncStorage.removeItem(key).catch(() => {});
    return fallback;
  }
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [pendingProfilePhotoRecovery, setPendingProfilePhotoRecovery] = useState<boolean>(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguageState] = useState<string | null>('en');
  const [monumentsList, setMonumentsList] = useState<any[]>([]);

  const refreshUserProfile = React.useCallback(async () => {
    if (!activeUserId || !authToken) return null;
    try {
      let p = null;
      if (userRole === 'admin') {
        const res = await userService.getAdminProfileData(authToken).catch(() => null);
        if (res && res.success && res.data) p = res.data;
      }
      if (!p) {
        p = await userService.getUserProfile(activeUserId, authToken).catch(() => null);
      }
      if (p) {
        setUserProfile(p);
        const storageKey = `@heritage_ar_profile_${activeUserId}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(p)).catch(() => {});
      }
      return p;
    } catch (err) {
      console.warn('[FavoritesContext] refreshUserProfile error:', err);
      return null;
    }
  }, [activeUserId, authToken, userRole]);

  useEffect(() => {
    if (activeUserId && authToken) {
      refreshUserProfile();
    }
  }, [activeUserId, authToken, refreshUserProfile]);

  // Load monuments list for ObjectId resolution
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('@heritage_ar_monuments_catalog');
        if (cached) {
          setMonumentsList(JSON.parse(cached));
        }
      } catch (e) {}

      const isOnline = getConnectivityState() === 'available';
      if (isOnline) {
        try {
          const res = await getMonuments({ limit: 100 });
          if (res && res.data) {
            setMonumentsList(res.data);
            await AsyncStorage.setItem('@heritage_ar_monuments_catalog', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('[HERIXA-HISTORY] Failed to refresh monuments catalog:', err);
        }
      }
    })();
  }, [activeUserId]);

  const resolveIdFromSlug = (slug: string): string | null => {
    if (!slug) return null;
    // 1. Search in dynamic loaded list
    const found = monumentsList.find(m => m.slug === slug || m.id === slug || m._id === slug);
    if (found) {
      return found._id || found.id;
    }
    
    // 2. Search in local MONUMENTS catalog using slug-to-name match and cross-referencing monumentsList
    const staticItem = MONUMENTS.find(m => m.id === slug || m.name?.toLowerCase() === slug.toLowerCase());
    if (staticItem) {
      const dynMatch = monumentsList.find(m => m.name?.toLowerCase() === staticItem.name?.toLowerCase() || m.slug === staticItem.id);
      if (dynMatch) {
        return dynMatch._id || dynMatch.id;
      }
    }

    return null;
  };

  // Synchronization active locks
  const syncFavoritesPromiseRef = useRef<Promise<void> | null>(null);
  const syncHistoryPromiseRef = useRef<Promise<void> | null>(null);

  const logout = async (targetIdParam?: string | null) => {
    console.log('[HERIXA-AUTH] LOGOUT / SESSION_CLEAR');
    try {
      const idToClear = targetIdParam || activeUserId;
      await AsyncStorage.removeItem('active_user_id');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_role');
      
      if (idToClear) {
        await AsyncStorage.removeItem(`@heritage_ar_profile_${idToClear}`).catch(() => {});
        await AsyncStorage.removeItem(`@heritage_ar_favorites_${idToClear}`).catch(() => {});
        await AsyncStorage.removeItem(`@heritage_ar_history_${idToClear}`).catch(() => {});
      }

      // Reset state immediately to Guest Mode
      setActiveUserId(null);
      setAuthToken(null);
      setUserRole(null);
      setFavorites([]);
      setHistory([]);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Sync favorites when online
  const syncPendingFavorites = async () => {
    if (!activeUserId || !authToken) return;

    if (syncFavoritesPromiseRef.current) {
      return syncFavoritesPromiseRef.current;
    }

    const syncPromise = (async () => {
      try {
        const isOnline = getConnectivityState() === 'available';
        if (!isOnline) return;

        const addKey = `@heritage_ar_pending_add_fav_${activeUserId}`;
        const removeKey = `@heritage_ar_pending_remove_fav_${activeUserId}`;

        const pendingAdds = await getSafeStorageItem<string[]>(addKey, []);
        const pendingRemoves = await getSafeStorageItem<string[]>(removeKey, []);

        if (pendingAdds.length === 0 && pendingRemoves.length === 0) return;

        console.log(`[HERIXA-SYNC] Syncing pending favorites for user ${activeUserId}: +${pendingAdds.length}, -${pendingRemoves.length}`);

        // Resolve conflict: if an item is in both, only process the one that reflects latest intent.
        // For simplicity, we just filter addition out if removal is after it, but here we process add and then remove.
        for (const id of pendingAdds) {
          try {
            await favoriteService.addFavorite(activeUserId, id, authToken);
          } catch (err: any) {
            if (err.status === 401 || err.status === 403) throw err;
            console.warn(`[HERIXA-SYNC] Failed to sync pending favorite add for ${id}:`, err);
          }
        }

        for (const id of pendingRemoves) {
          try {
            await favoriteService.removeFavorite(activeUserId, id, authToken);
          } catch (err: any) {
            if (err.status === 401 || err.status === 403) throw err;
            console.warn(`[HERIXA-SYNC] Failed to sync pending favorite remove for ${id}:`, err);
          }
        }

        await AsyncStorage.removeItem(addKey);
        await AsyncStorage.removeItem(removeKey);
        console.log('[HERIXA-SYNC] Pending favorites synchronization complete.');
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          console.warn('[HERIXA-SYNC] Unauthorized during favorites sync, logging out.');
          await logout();
        } else {
          console.error('[HERIXA-SYNC] Favorites sync failed:', err);
        }
      }
    })();

    syncFavoritesPromiseRef.current = syncPromise;
    try {
      await syncPromise;
    } finally {
      syncFavoritesPromiseRef.current = null;
    }
  };

  // Sync history when online
  const syncPendingHistory = async () => {
    if (!activeUserId || !authToken) return;

    if (syncHistoryPromiseRef.current) {
      return syncHistoryPromiseRef.current;
    }

    const syncPromise = (async () => {
      try {
        const isOnline = getConnectivityState() === 'available';
        if (!isOnline) return;

        const storageKey = getHistoryStorageKey(activeUserId);
        const localHistory = await getSafeStorageItem<any[]>(storageKey, []);

        let hasModifiedLocal = false;
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;

        const normalizedHistory = localHistory.map(item => {
          if (!item.monumentId) return item;

          // Extract current ID or slug value from the stored structure
          const rawId = typeof item.monumentId === 'string' 
            ? item.monumentId 
            : (item.monumentId._id || item.monumentId.id || item.monumentId);

          if (typeof rawId !== 'string') return item;

          // If it is already a valid MongoDB ObjectId, keep it
          if (objectIdRegex.test(rawId)) {
            return item;
          }

          // Otherwise, it is a slug/legacy reference. Try to resolve it.
          const resolvedId = resolveIdFromSlug(rawId);

          if (resolvedId) {
            console.log(`[HERIXA-HISTORY] LEGACY_MONUMENT_REFERENCE_DETECTED slug: ${rawId}`);
            console.log(`[HERIXA-HISTORY] MONUMENT_REFERENCE_RESOLVED slug: ${rawId} -> ObjectId: ${resolvedId}`);
            console.log(`[HERIXA-HISTORY] HISTORY_ENTRY_NORMALIZED`);
            
            hasModifiedLocal = true;
            return {
              ...item,
              monumentId: {
                _id: resolvedId,
                id: resolvedId,
                name: item.monumentId.name || rawId
              }
            };
          } else {
            // Unresolved monument slug. Mark as invalid/deferred if it's pendingSync, to prevent endless 400 loop
            if (item.pendingSync) {
              console.log(`[HERIXA-HISTORY] INVALID_MONUMENT_REFERENCE: Could not resolve slug "${rawId}" to ObjectId. Deferring sync.`);
              hasModifiedLocal = true;
              return {
                ...item,
                pendingSync: false, // Turn off sync attempts to prevent blocking
                syncDeferred: true
              };
            }
            return item;
          }
        });

        if (hasModifiedLocal) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(normalizedHistory));
        }

        const pendingEntries = normalizedHistory.filter(item => item.pendingSync === true);
        if (pendingEntries.length === 0) return;

        console.log(`[HERIXA-SYNC] Syncing ${pendingEntries.length} pending history entries...`);

        // Sequentially upload from oldest to newest
        for (const item of [...pendingEntries].reverse()) {
          try {
            const resolvedId = typeof item.monumentId === 'string' 
              ? item.monumentId 
              : (item.monumentId?._id || item.monumentId?.id);

            // Double check validation before sending
            if (!resolvedId || !objectIdRegex.test(resolvedId)) {
              console.log(`[HERIXA-HISTORY] INVALID_MONUMENT_REFERENCE: Skipping sync for non-ObjectId "${resolvedId}"`);
              continue;
            }

            await userService.addHistoryEntry(activeUserId, item.actionType, resolvedId, item.query, authToken);
            console.log('[HERIXA-HISTORY] HISTORY_SYNC_SUCCESS');
          } catch (err: any) {
            if (err.status === 401 || err.status === 403) throw err;
            console.warn(`[HERIXA-SYNC] Failed to sync pending history entry:`, err);
          }
        }

        const updatedHistory = normalizedHistory.map(item => {
          if (item.pendingSync) {
            const { pendingSync, ...rest } = item;
            return rest;
          }
          return item;
        });

        setHistory(updatedHistory);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        console.log('[HERIXA-SYNC] Pending history synchronization complete.');
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          console.warn('[HERIXA-SYNC] Unauthorized during history sync, logging out.');
          await logout();
        } else {
          console.error('[HERIXA-SYNC] History sync failed:', err);
        }
      }
    })();

    syncHistoryPromiseRef.current = syncPromise;
    try {
      await syncPromise;
    } finally {
      syncHistoryPromiseRef.current = null;
    }
  };

  // Initialize active user session on app mount
  useEffect(() => {
    const initUser = async () => {
      let storedId: string | null = null;
      let storedToken: string | null = null;
      let savedLocalLang: string | null = null;
      let storedRole: string | null = null;

      try {
        console.log('[HERIXA-STARTUP] Running initial backend connectivity health check...');
        const isOnline = await checkConnectivity();
        
        storedId = await AsyncStorage.getItem('active_user_id');
        storedToken = await AsyncStorage.getItem('auth_token');
        savedLocalLang = await AsyncStorage.getItem('@heritage_ar_selected_language');
        storedRole = await AsyncStorage.getItem('user_role');

        // Check token / active_user_id consistency
        if (storedToken && storedToken.includes('.')) {
          const parts = storedToken.split('.');
          if (parts.length === 2 && parts[0] && parts[0].length === 24) {
            const tokenUserId = parts[0];
            if (storedId && storedId !== tokenUserId) {
              console.warn(`[HERIXA-AUTH] Session inconsistency detected: stored active_user_id (${storedId}) !== token identity (${tokenUserId}). Aligning to token identity.`);
              storedId = tokenUserId;
              await AsyncStorage.setItem('active_user_id', tokenUserId);
            }
          }
        }

        if (isOnline && storedId && storedToken) {
          try {
            console.log('[HERIXA-AUTH] Verifying active session token with backend...');
            const profile = await userService.getUserProfile(storedId, storedToken);
            if (profile && profile._id) {
              console.log('[HERIXA-AUTH] SESSION_RESTORED');
              setActiveUserId(storedId);
              setAuthToken(storedToken);
              // Always use authoritative role from backend profile
              const resolvedRole: 'user' | 'admin' = profile.role === 'admin' ? 'admin' : 'user';
              setUserRole(resolvedRole);
              await AsyncStorage.setItem('user_role', resolvedRole);
              if (profile.preferredLanguage) {
                setSelectedLanguageState(profile.preferredLanguage);
                await AsyncStorage.setItem('@heritage_ar_selected_language', profile.preferredLanguage);
              } else if (savedLocalLang) {
                setSelectedLanguageState(savedLocalLang);
              }
            } else {
              console.warn('[HERIXA-AUTH] Verification failed. Clearing invalid session.');
              await logout(storedId);
              if (savedLocalLang) {
                setSelectedLanguageState(savedLocalLang);
              }
            }
          } catch (profileError: any) {
            const isClientError = profileError.status === 401 || profileError.status === 403 || profileError.status === 404;
            if (isClientError) {
              console.warn(`[HERIXA-AUTH] Session verification failed (HTTP ${profileError.status}). Safely clearing invalid session.`);
              await logout(storedId);
              if (savedLocalLang) {
                setSelectedLanguageState(savedLocalLang);
              }
            } else {
              console.warn('[HERIXA-AUTH] Backend session verification unreachable (network error), keeping offline session.');
              setActiveUserId(storedId);
              setAuthToken(storedToken);
              // Use cached role when offline
              setUserRole(storedRole === 'admin' ? 'admin' : storedRole ? 'user' : null);
              if (savedLocalLang) {
                setSelectedLanguageState(savedLocalLang);
              }
            }
          }
        } else {
          // If offline or no stored session, keep offline session or default guest
          if (storedId && storedToken) {
            console.log('[HERIXA-AUTH] Offline mode. Restoring offline session.');
            setActiveUserId(storedId);
            setAuthToken(storedToken);
            setUserRole(storedRole === 'admin' ? 'admin' : storedRole ? 'user' : null);
          } else {
            console.log('[HERIXA-AUTH] Defaulting to Guest Mode (Offline).');
            setActiveUserId(null);
            setAuthToken(null);
            setUserRole(null);
          }
          if (savedLocalLang) {
            setSelectedLanguageState(savedLocalLang);
          }
        }
      } catch (err) {
        console.error('Failed to restore active user session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initUser();
  }, []);




  // Reload favorites whenever activeUserId or authToken changes
  useEffect(() => {
    const loadFavorites = async () => {
      const userIdForRequest = activeUserId;
      setIsLoading(true);
      setFavorites([]); // Clear previous user's favorites state immediately

      const storageKey = getFavoritesStorageKey(userIdForRequest);

      // Guest Mode (read local only)
      if (!userIdForRequest || !authToken) {
        const storedFavorites = await getSafeStorageItem<string[]>(storageKey, []);
        if (userIdForRequest !== activeUserId) return;
        setFavorites(storedFavorites);
        setIsLoading(false);
        return;
      }

      // Check centralized connectivity state (awaits if unknown)
      let isOnline = getConnectivityState() === 'available';
      if (getConnectivityState() === 'unknown') {
        isOnline = await checkConnectivity();
      }

      if (!isOnline) {
        console.log('[HERIXA-DATA] Offline mode: loading favorites from local cache.');
        const storedFavorites = await getSafeStorageItem<string[]>(storageKey, []);
        if (userIdForRequest !== activeUserId) return;
        setFavorites(storedFavorites);
        setIsLoading(false);
        return;
      }

      // Authenticated User Mode - Online
      try {
        await syncPendingFavorites();
        
        if (userIdForRequest !== activeUserId) return;
        console.log(`[HERIXA-DATA] FAVORITES_FETCHED UserID: ${userIdForRequest}`);
        const apiFavorites = await favoriteService.getFavorites(userIdForRequest, authToken);
        const favoriteIds = apiFavorites.map((mon) => mon.id || mon._id);

        if (userIdForRequest !== activeUserId) return;
        setFavorites(favoriteIds);
        await AsyncStorage.setItem(storageKey, JSON.stringify(favoriteIds));
      } catch (error: any) {
        if (userIdForRequest !== activeUserId) return;
        if (error.status === 401 || error.status === 403) {
          console.warn('[HERIXA-DATA] Token expired during favorites load, logging out.');
          await logout();
        } else {
          console.warn('Backend API favorites unavailable, falling back to local user cache');
          const storedFavorites = await getSafeStorageItem<string[]>(storageKey, []);
          if (userIdForRequest !== activeUserId) return;
          setFavorites(storedFavorites);
        }
      } finally {
        if (userIdForRequest === activeUserId) {
          setIsLoading(false);
        }
      }
    };

    loadFavorites();
  }, [activeUserId, authToken]);

  // Reload history whenever activeUserId or authToken changes
  useEffect(() => {
    const loadHistory = async () => {
      const userIdForRequest = activeUserId;
      setHistory([]); // Clear previous user's history state immediately

      const storageKey = getHistoryStorageKey(userIdForRequest);

      // Guest Mode (read local only)
      if (!userIdForRequest || !authToken) {
        const storedHistory = await getSafeStorageItem<any[]>(storageKey, []);
        if (userIdForRequest !== activeUserId) return;
        setHistory(storedHistory);
        return;
      }

      // Check centralized connectivity state (awaits if unknown)
      let isOnline = getConnectivityState() === 'available';
      if (getConnectivityState() === 'unknown') {
        isOnline = await checkConnectivity();
      }

      if (!isOnline) {
        console.log('[HERIXA-DATA] Offline mode: loading history from local cache.');
        const storedHistory = await getSafeStorageItem<any[]>(storageKey, []);
        if (userIdForRequest !== activeUserId) return;
        setHistory(storedHistory);
        return;
      }

      // Authenticated User Mode - Online
      try {
        await syncPendingHistory();

        if (userIdForRequest !== activeUserId) return;
        console.log(`[HERIXA-DATA] HISTORY_FETCHED UserID: ${userIdForRequest}`);
        const result = await userService.getUserHistory(userIdForRequest, authToken);
        if (result.success && result.data) {
          if (userIdForRequest !== activeUserId) return;
          setHistory(result.data);
          await AsyncStorage.setItem(storageKey, JSON.stringify(result.data));
        }
      } catch (error: any) {
        if (userIdForRequest !== activeUserId) return;
        if (error.status === 401 || error.status === 403) {
          console.warn('[HERIXA-DATA] Token expired during history load, logging out.');
          await logout();
        } else {
          console.warn('Backend API history unavailable, falling back to local user cache');
          const storedHistory = await getSafeStorageItem<any[]>(storageKey, []);
          if (userIdForRequest !== activeUserId) return;
          setHistory(storedHistory);
        }
      }
    };

    loadHistory();
  }, [activeUserId, authToken]);

  const switchUser = async (newUserId: string, token: string, role?: 'user' | 'admin') => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('active_user_id', newUserId);
      await AsyncStorage.setItem('auth_token', token);
      if (role) {
        await AsyncStorage.setItem('user_role', role);
        setUserRole(role);
      }
      setActiveUserId(newUserId);
      setAuthToken(token);

      // Pre-fetch and cache persistent user profile (with scanCount) from backend
      userService.getUserProfile(newUserId, token).catch((err) => {
        console.warn('[HERIXA-AUTH] Background profile pre-fetch failed:', err);
      });
    } catch (error) {
      console.error('Failed to switch user:', error);
      setIsLoading(false);
    }
  };

  const refreshFavorites = async () => {
    if (!activeUserId || !authToken) return;
    try {
      await syncPendingFavorites();
      console.log(`[HERIXA-DATA] FAVORITES_FETCHED UserID: ${activeUserId}`);
      const apiFavorites = await favoriteService.getFavorites(activeUserId, authToken);
      const favoriteIds = apiFavorites.map((mon) => mon.id || mon._id);
      setFavorites(favoriteIds);
      await AsyncStorage.setItem(getFavoritesStorageKey(activeUserId), JSON.stringify(favoriteIds));
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        await logout();
      }
      console.warn('[SAVED HERITAGE] Failed to refresh favorites:', error);
      throw error;
    }
  };

  const refreshHistory = async () => {
    if (!activeUserId || !authToken) return;
    try {
      await syncPendingHistory();
      console.log(`[HERIXA-DATA] HISTORY_FETCHED UserID: ${activeUserId}`);
      const result = await userService.getUserHistory(activeUserId, authToken);
      if (result.success && result.data) {
        setHistory(result.data);
        await AsyncStorage.setItem(getHistoryStorageKey(activeUserId), JSON.stringify(result.data));
      }
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        await logout();
      }
      console.warn('[SAVED HERITAGE] Failed to refresh history:', error);
      throw error;
    }
  };

  // Auth operations
  const register = async (name: string, email: string, password: string, preferredLanguage?: string | null) => {
    console.log('[HERIXA-AUTH] REGISTER_STARTED');
    const result = await userService.registerUser(name, email, password, preferredLanguage);
    return result;
  };

  const login = async (email: string, password: string) => {
    const result = await userService.loginUser(email, password);
    if (result.success && (result as any).token) {
      const loginResult = result as any;
      const role: 'user' | 'admin' = loginResult.data?.role === 'admin' ? 'admin' : 'user';
      await switchUser(loginResult.data._id, loginResult.token, role);
      if (loginResult.data.preferredLanguage) {
        setSelectedLanguageState(loginResult.data.preferredLanguage);
        await AsyncStorage.setItem('@heritage_ar_selected_language', loginResult.data.preferredLanguage);
      }
    }
    return result;
  };

  const verifyOTP = async (email: string, otp: string) => {
    const result = await userService.verifyOtp(email, otp);
    if (result.success && result.token) {
      const role: 'user' | 'admin' = result.data?.role === 'admin' ? 'admin' : 'user';
      await switchUser(result.data._id, result.token, role);
      if (result.data.preferredLanguage) {
        setSelectedLanguageState(result.data.preferredLanguage);
        await AsyncStorage.setItem('@heritage_ar_selected_language', result.data.preferredLanguage);
      }
    }
    return result;
  };

  const resendOTPCode = async (email: string) => {
    const result = await userService.resendOtp(email);
    return result;
  };

  const forgotPassword = async (email: string, method?: 'otp' | 'link') => {
    return await userService.forgotPassword(email, method);
  };

  const verifyResetOtp = async (email: string, otp: string) => {
    return await userService.verifyResetOtp(email, otp);
  };

  const resetPassword = async (resetToken: string, newPassword: string, confirmPassword: string) => {
    return await userService.resetPassword(resetToken, newPassword, confirmPassword);
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    if (!authToken) {
      throw new Error('User is not authenticated.');
    }
    return await userService.changePassword(currentPassword, newPassword, confirmPassword, authToken);
  };

  const sendSettingsOtp = async () => {
    if (!authToken) {
      throw new Error('User is not authenticated.');
    }
    return await userService.sendSettingsOtp(authToken);
  };

  const verifySettingsOtp = async (otp: string) => {
    if (!authToken) {
      throw new Error('User is not authenticated.');
    }
    return await userService.verifySettingsOtp(otp, authToken);
  };

  const changeLanguage = async (langCode: string | null) => {
    try {
      setSelectedLanguageState(langCode);
      if (langCode) {
        await AsyncStorage.setItem('@heritage_ar_selected_language', langCode);
      } else {
        await AsyncStorage.removeItem('@heritage_ar_selected_language');
      }

      if (activeUserId && authToken) {
        await userService.updateProfile(activeUserId, undefined, undefined, authToken, langCode);
      }
    } catch (err) {
      console.error('Failed to change language:', err);
      throw err;
    }
  };

  const addFavorite = async (id: string) => {
    const storageKey = getFavoritesStorageKey(activeUserId);
    const previousFavorites = [...favorites];
    
    if (favorites.includes(id)) return;
    const updatedFavorites = [...favorites, id];
    setFavorites(updatedFavorites);

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedFavorites));

      const isOnline = getConnectivityState() === 'available';
      if (isOnline && activeUserId && authToken) {
        try {
          await favoriteService.addFavorite(activeUserId, id, authToken);
        } catch (apiError: any) {
          if (apiError.status === 401 || apiError.status === 403) {
            throw apiError;
          }
          // If transient api failure, save to pending
          throw new Error('transient');
        }
      } else {
        throw new Error('offline');
      }
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        console.warn('Unauthorized. Logging out.');
        setFavorites(previousFavorites);
        await AsyncStorage.setItem(storageKey, JSON.stringify(previousFavorites));
        await logout();
        return;
      }

      // Add to pending additions, remove from pending removals
      if (activeUserId) {
        const addKey = `@heritage_ar_pending_add_fav_${activeUserId}`;
        const removeKey = `@heritage_ar_pending_remove_fav_${activeUserId}`;
        
        const pendingAdds = await getSafeStorageItem<string[]>(addKey, []);
        const pendingRemoves = await getSafeStorageItem<string[]>(removeKey, []);

        if (!pendingAdds.includes(id)) {
          await AsyncStorage.setItem(addKey, JSON.stringify([...pendingAdds, id]));
        }
        await AsyncStorage.setItem(removeKey, JSON.stringify(pendingRemoves.filter(favId => favId !== id)));
        
        console.log(`[HERIXA-FAVORITES] Saved favorite ${id} offline (saved to local cache + pending additions).`);
      }
    }
  };

  const removeFavorite = async (id: string) => {
    const storageKey = getFavoritesStorageKey(activeUserId);
    const previousFavorites = [...favorites];
    
    if (!favorites.includes(id)) return;
    const updatedFavorites = favorites.filter((favId) => favId !== id);
    setFavorites(updatedFavorites);

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedFavorites));

      const isOnline = getConnectivityState() === 'available';
      if (isOnline && activeUserId && authToken) {
        try {
          await favoriteService.removeFavorite(activeUserId, id, authToken);
        } catch (apiError: any) {
          if (apiError.status === 401 || apiError.status === 403) {
            throw apiError;
          }
          throw new Error('transient');
        }
      } else {
        throw new Error('offline');
      }
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        console.warn('Unauthorized. Logging out.');
        setFavorites(previousFavorites);
        await AsyncStorage.setItem(storageKey, JSON.stringify(previousFavorites));
        await logout();
        return;
      }

      // Add to pending removals, remove from pending additions
      if (activeUserId) {
        const addKey = `@heritage_ar_pending_add_fav_${activeUserId}`;
        const removeKey = `@heritage_ar_pending_remove_fav_${activeUserId}`;
        
        const pendingAdds = await getSafeStorageItem<string[]>(addKey, []);
        const pendingRemoves = await getSafeStorageItem<string[]>(removeKey, []);

        if (!pendingRemoves.includes(id)) {
          await AsyncStorage.setItem(removeKey, JSON.stringify([...pendingRemoves, id]));
        }
        await AsyncStorage.setItem(addKey, JSON.stringify(pendingAdds.filter(favId => favId !== id)));

        console.log(`[HERIXA-FAVORITES] Removed favorite ${id} offline (saved to local cache + pending removals).`);
      }
    }
  };

  const isFavorite = (id: string) => {
    return favorites.includes(id);
  };

  const addHistory = async (
    actionType: 'recognition' | 'search' | 'view' | 'ai_question',
    monumentId?: string,
    query?: string
  ) => {
    const storageKey = getHistoryStorageKey(activeUserId);
    
    const isOnline = getConnectivityState() === 'available';
    const hasSyncFlag = !isOnline && activeUserId && authToken;

    // Resolve monumentId slug to ObjectId dynamically
    let resolvedId = monumentId;
    if (monumentId) {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(monumentId)) {
        const mappedId = resolveIdFromSlug(monumentId);
        if (mappedId) {
          resolvedId = mappedId;
        } else {
          console.log(`[HERIXA-HISTORY] INVALID_MONUMENT_REFERENCE: Delaying ObjectId resolution for slug "${monumentId}"`);
        }
      }
    }

    // Resolve offline name and image details
    const matchedStatic = MONUMENTS.find(m => m.id === monumentId || m.name?.toLowerCase() === monumentId?.toLowerCase() || m.id === resolvedId);
    const monName = matchedStatic?.name || monumentId;
    const monImage = matchedStatic?.image || '';

    // Create new history entry object
    const newEntry = {
      _id: Math.random().toString(),
      userId: activeUserId || 'guest',
      actionType,
      monumentId: resolvedId ? { 
        _id: resolvedId, 
        id: resolvedId, 
        name: monName,
        image: monImage
      } : undefined,
      query,
      createdAt: new Date().toISOString(),
      pendingSync: hasSyncFlag ? true : undefined,
    };

    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    } catch (err) {
      console.error('Failed to save history entry locally:', err);
    }

    if (activeUserId && authToken && isOnline) {
      try {
        if (resolvedId) {
          const objectIdRegex = /^[0-9a-fA-F]{24}$/;
          if (objectIdRegex.test(resolvedId)) {
            await userService.addHistoryEntry(activeUserId, actionType, resolvedId, query, authToken);
            await refreshHistory();
            return;
          }
        }
        
        console.log(`[HERIXA-HISTORY] INVALID_MONUMENT_REFERENCE: Postponing backend sync for unresolved slug "${monumentId}"`);
        newEntry.pendingSync = true;
        const fallbackHistory = [newEntry, ...history];
        await AsyncStorage.setItem(storageKey, JSON.stringify(fallbackHistory));
      } catch (error: any) {
        if (error.status === 401 || error.status === 403) {
          await logout();
          return;
        }
        console.warn('Failed to sync history entry with backend (saved locally as pending):', error);
        
        // Mark as pending Sync since sync failed
        newEntry.pendingSync = true;
        const fallbackHistory = [newEntry, ...history];
        await AsyncStorage.setItem(storageKey, JSON.stringify(fallbackHistory));
      }
    } else if (hasSyncFlag) {
      console.log('[HERIXA-HISTORY] Saved history entry offline (saved to local cache + pending sync).');
    }
  };

  const deleteHistory = async (historyId: string) => {
    if (deletingIds.includes(historyId)) return; // Prevent duplicate requests
    setDeletingIds(prev => [...prev, historyId]);

    const storageKey = getHistoryStorageKey(activeUserId);

    try {
      const isOnline = getConnectivityState() === 'available';
      if (isOnline && activeUserId && authToken) {
        // Authenticated User: sync with backend
        const res = await userService.deleteHistoryItem(historyId, authToken);
        if (!res.success) {
          throw new Error(res.message || 'API delete failed');
        }
      }

      // Update local state immediately
      const updatedHistory = history.filter((item) => (item._id || item.id) !== historyId);
      setHistory(updatedHistory);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      console.log(`[HERIXA-HISTORY] Successfully deleted history item: ${historyId}`);
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        await logout();
        return;
      }
      console.warn(`Failed to delete history item ${historyId}:`, error);
      let message = 'Unable to delete this history item. Please try again.';
      if (error.status === 404 || (error.message && error.message.includes('404'))) {
        message = 'History item not found.';
      }
      Alert.alert('Error', message);
      throw error;
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== historyId)); // Always reset deleting state
    }
  };

  const clearHistory = async () => {
    if (isClearing) return; // Prevent duplicate requests
    setIsClearing(true);

    const storageKey = getHistoryStorageKey(activeUserId);

    try {
      const isOnline = getConnectivityState() === 'available';
      if (isOnline && activeUserId && authToken) {
        // Authenticated User: clear on backend
        const res = await userService.clearAllHistory(authToken);
        if (!res.success) {
          throw new Error(res.message || 'API clear all failed');
        }
      }

      // Clear local state immediately
      setHistory([]);
      await AsyncStorage.setItem(storageKey, JSON.stringify([]));
      console.log(`[HERIXA-HISTORY] Successfully cleared all history`);
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        await logout();
        return;
      }
      console.warn('Failed to clear history:', error);
      let message = 'Unable to clear history. Please try again.';
      Alert.alert('Error', message);
      throw error;
    } finally {
      setIsClearing(false); // Always reset clearing state
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      isLoading,
      activeUserId,
      authToken,
      userRole,
      switchUser,
      refreshFavorites,
      logout,
      register,
      login,
      verifyOTP,
      resendOTPCode,
      forgotPassword,
      verifyResetOtp,
      resetPassword,
      changePassword,
      sendSettingsOtp,
      verifySettingsOtp,
      history,
      addHistory,
      refreshHistory,
      deleteHistory,
      clearHistory,
      deletingIds,
      isClearing,
      selectedLanguage,
      changeLanguage,
      pendingProfilePhotoRecovery,
      userProfile,
      setUserProfile,
      refreshUserProfile,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
  },
  errorIcon: {
    marginBottom: SPACING.md,
  },
  errorTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  errorSubText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
    alignSelf: 'stretch',
  },
  codeText: {
    fontFamily: 'monospace',
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  codeBlock: {
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 4,
    display: 'flex',
    textAlign: 'center',
  },
});
