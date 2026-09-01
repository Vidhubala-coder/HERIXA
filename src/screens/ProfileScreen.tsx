import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getInfoAsync } from 'expo-file-system/legacy';
import { useFavorites } from '../context/FavoritesContext';
import { useIsFocused } from '@react-navigation/native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { 
  getUserProfile, 
  updateProfile, 
  UserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  getProfileImageUrl,
} from '../services/userService';
import { getImageUrl, getMonuments } from '../services/monumentService';
import { MONUMENTS } from '../data/monuments';
import { LANGUAGES, getLanguageByCode } from '../config/languages';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    favorites,
    activeUserId,
    authToken,
    userRole,
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
    refreshHistory,
    selectedLanguage,
    changeLanguage,
  } = useFavorites();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp' | 'forgot_password' | 'recovery_otp' | 'reset_password' | 'reset_success'>('login');
  
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [changeNewPasswordInput, setChangeNewPasswordInput] = useState('');
  const [changeConfirmPasswordInput, setChangeConfirmPasswordInput] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);

  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Settings forgot password flow states
  const [settingsFlowMode, setSettingsFlowMode] = useState<'normal' | 'forgot_otp_entry' | 'forgot_new_password'>('normal');
  const [isSettingsOtpSent, setIsSettingsOtpSent] = useState(false);
  const [settingsOtpInput, setSettingsOtpInput] = useState('');
  const [settingsNewPasswordInput, setSettingsNewPasswordInput] = useState('');
  const [settingsConfirmPasswordInput, setSettingsConfirmPasswordInput] = useState('');
  const [settingsOtpTimer, setSettingsOtpTimer] = useState(0);
  const [settingsResetToken, setSettingsResetToken] = useState<string | null>(null);
  const [showSettingsNewPassword, setShowSettingsNewPassword] = useState(false);
  const [showSettingsConfirmPassword, setShowSettingsConfirmPassword] = useState(false);
  
  const [registerPreferredLanguage, setRegisterPreferredLanguage] = useState<string | null>(null);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [otpSentEmail, setOtpSentEmail] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Profile photo state variables
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [avatarRevision, setAvatarRevision] = useState<number>(0);
  const [monumentsCatalog, setMonumentsCatalog] = useState<any[]>([]);

  const isFocused = useIsFocused();

  // Load catalog for heritage journey monument details resolution
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getMonuments({ limit: 100 });
        if (res && res.data && isMounted) {
          setMonumentsCatalog(res.data);
        }
      } catch (e) {
        console.warn('[ProfileScreen] Catalog load error:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [isFocused]);

  const findMonument = React.useCallback((idOrSlug: string) => {
    if (!idOrSlug) return null;
    const found = monumentsCatalog.find((m: any) => m._id === idOrSlug || m.id === idOrSlug || m.slug === idOrSlug);
    if (found) return found;
    const staticFound = MONUMENTS.find((m: any) => m.id === idOrSlug || m.name?.toLowerCase() === idOrSlug.toLowerCase());
    if (staticFound) return staticFound;
    return null;
  }, [monumentsCatalog]);

  const getMonumentCoverImage = React.useCallback((monument: any): string => {
    if (!monument) return getImageUrl('');
    if (monument.coverImageUrl) {
      return getImageUrl(monument.coverImageUrl);
    }
    if (monument.heritagePreviewImages && Array.isArray(monument.heritagePreviewImages)) {
      const featuredVisible = monument.heritagePreviewImages.find(
        (img: any) => (img.featured === true || img.featured === 'true') && img.enabled !== false && img.visible !== false
      );
      if (featuredVisible && featuredVisible.uri) {
        return getImageUrl(featuredVisible.uri);
      }
      const firstVisible = monument.heritagePreviewImages.find(
        (img: any) => img.enabled !== false && img.visible !== false
      );
      if (firstVisible && firstVisible.uri) {
        return getImageUrl(firstVisible.uri);
      }
    }
    const existingImage = monument.imageUrl || monument.image || monument.coverImage;
    if (existingImage) {
      return getImageUrl(existingImage);
    }
    return getImageUrl('');
  }, []);

  const formatRelativeTime = React.useCallback((dateInput: string | Date | undefined): string => {
    if (!dateInput) return 'Recently';
    const now = new Date();
    const date = new Date(dateInput);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 0) return 'Recently';
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (diffSec < 172800) return 'Yesterday';
    const days = Math.floor(diffSec / 86400);
    return `${days} days ago`;
  }, []);

  const uniqueSitesExplored = React.useMemo(() => {
    const set = new Set<string>();
    history.forEach((h: any) => {
      if (h.monumentId) {
        const id = typeof h.monumentId === 'string' ? h.monumentId : (h.monumentId._id || h.monumentId.id);
        if (id) set.add(id);
      }
    });
    return set.size;
  }, [history]);

  const totalScansCount = React.useMemo(() => {
    return history.filter((h: any) => h.actionType === 'recognition').length;
  }, [history]);

  const authoritativeScanCount = React.useMemo(() => {
    if (profile?.scanCount !== undefined && profile?.scanCount !== null) {
      return profile.scanCount;
    }
    return totalScansCount;
  }, [profile?.scanCount, totalScansCount]);

  const totalFavoritesCount = favorites.length;

  const totalVisualsCount = React.useMemo(() => {
    return history.filter((h: any) => h.actionType === 'view' || h.actionType === 'recognition').length;
  }, [history]);

  const recentExploredItems = React.useMemo(() => {
    const items: { monument: any; monumentId: string; date: string; actionType: string }[] = [];
    const seenIds = new Set<string>();

    for (const h of history) {
      let monId = '';
      let monObj: any = null;

      if (h.monumentId && typeof h.monumentId === 'object') {
        monId = h.monumentId._id || h.monumentId.id;
        monObj = h.monumentId;
      } else if (typeof h.monumentId === 'string') {
        monId = h.monumentId;
      }

      if (!monId && h.query) {
        const match = findMonument(h.query);
        if (match) {
          monId = match._id || match.id;
          monObj = match;
        }
      }

      if (monId && !seenIds.has(monId)) {
        seenIds.add(monId);
        const fullMon = (monObj && monObj.coverImageUrl) ? monObj : (findMonument(monId) || monObj);
        if (fullMon) {
          items.push({
            monument: fullMon,
            monumentId: monId,
            date: h.createdAt,
            actionType: h.actionType,
          });
        }
      }
      if (items.length >= 4) break;
    }
    return items;
  }, [history, monumentsCatalog, findMonument]);

  const favoriteMonuments = React.useMemo(() => {
    return favorites
      .map((favId) => {
        const mon = findMonument(favId);
        return mon ? { ...mon, monumentId: mon._id || mon.id } : null;
      })
      .filter(Boolean);
  }, [favorites, monumentsCatalog, findMonument]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (settingsOtpTimer > 0) {
      interval = setInterval(() => {
        setSettingsOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settingsOtpTimer]);



  useEffect(() => {
    setProfile(null); // Reset profile details memory immediately on user change
    if (!activeUserId) {
      setIsProfileLoading(false);
      return;
    }
    
    const fetchProfile = async () => {
      setIsProfileLoading(true);
      const storageKey = `@heritage_ar_profile_${activeUserId}`;
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            setEditName(parsed.name);
            setEditAvatar(parsed.avatar || 'GE');
            setImageError(false);
            setIsProfileLoading(false);
          } catch (_) {}
        }
      } catch (cacheErr) {
        console.warn('Failed to read profile cache on screen load:', cacheErr);
      }

      try {
        const data = await getUserProfile(activeUserId, authToken);
        setProfile(data);
        if (data && data._id) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
        }
        setEditName(data.name);
        setEditAvatar(data.avatar || 'GE');
        setImageError(false);
      } catch (err) {
        console.warn('ProfileScreen: Failed to fetch profile from backend API.', err);
        setProfile(prev => {
          if (prev) return prev;
          const isFallbackAdmin = activeUserId === '6a7a70eb677209d21b1bb99a' || emailInput === 'vidhub657@gmail.com';
          return {
            _id: activeUserId,
            name: isFallbackAdmin ? 'Admin Conservator' : 'Guest Explorer',
            email: isFallbackAdmin ? 'vidhub657@gmail.com' : 'guest@heritagear.com',
            favoriteMonuments: favorites,
            role: isFallbackAdmin ? 'admin' : 'user',
            createdAt: '',
            updatedAt: ''
          };
        });
      } finally {
        setIsProfileLoading(false);
      }
    };

    if (isFocused) {
      fetchProfile();
    }
  }, [activeUserId, authToken, isFocused]);



  const handleAuthSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    
    try {
      if (authMode === 'register') {
        if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
          setSubmitError('Name, email, and password are required.');
          setIsSubmitting(false);
          return;
        }
        if (passwordInput.length < 8) {
          setSubmitError('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }
        await register(nameInput.trim(), emailInput.trim().toLowerCase(), passwordInput, registerPreferredLanguage);
        setOtpSentEmail(emailInput.trim().toLowerCase());
        setAuthMode('otp');
      } else if (authMode === 'login') {
        if (!emailInput.trim() || !passwordInput) {
          setSubmitError('Email and password are required.');
          setIsSubmitting(false);
          return;
        }
        const res = await login(emailInput.trim().toLowerCase(), passwordInput);
        if (res.success) {
          setIsAuthModalVisible(false);
          setNameInput('');
          setEmailInput('');
          setPasswordInput('');
          setOtpInput('');
          Alert.alert('Logged In', `Welcome back!`);
        }
      } else if (authMode === 'forgot_password') {
        if (!emailInput.trim()) {
          setSubmitError('Email address is required.');
          setIsSubmitting(false);
          return;
        }
        if (!/^\S+@\S+\.\S+$/.test(emailInput.trim())) {
          setSubmitError('Enter a valid email address.');
          setIsSubmitting(false);
          return;
        }
        const res = await forgotPassword(emailInput.trim().toLowerCase());
        if (res.success) {
          setOtpSentEmail(emailInput.trim().toLowerCase());
          setOtpInput('');
          setAuthMode('recovery_otp');
          setOtpTimer(60);
          Alert.alert('Code Sent', res.message || 'If an account exists, a recovery code has been sent.');
        }
      } else if (authMode === 'recovery_otp') {
        if (!otpInput.trim() || otpInput.trim().length !== 6) {
          setSubmitError('Please enter the 6-digit verification code.');
          setIsSubmitting(false);
          return;
        }
        const res = await verifyResetOtp(otpSentEmail, otpInput.trim());
        if (res.success && res.resetToken) {
          setResetToken(res.resetToken);
          setOtpInput('');
          setPasswordInput('');
          setConfirmPasswordInput('');
          setAuthMode('reset_password');
        }
      } else if (authMode === 'reset_password') {
        if (!passwordInput || !confirmPasswordInput) {
          setSubmitError('Both password fields are required.');
          setIsSubmitting(false);
          return;
        }
        if (passwordInput.length < 8) {
          setSubmitError('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }
        if (passwordInput !== confirmPasswordInput) {
          setSubmitError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }
        if (!resetToken) {
          setSubmitError('Invalid reset session. Please restart recovery.');
          setIsSubmitting(false);
          return;
        }
        const res = await resetPassword(resetToken, passwordInput, confirmPasswordInput);
        if (res.success) {
          setNameInput('');
          setEmailInput('');
          setPasswordInput('');
          setConfirmPasswordInput('');
          setResetToken(null);
          setAuthMode('reset_success');
        }
      } else {
        if (!otpInput.trim() || otpInput.trim().length !== 6) {
          setSubmitError('Enter a valid 6-digit verification code.');
          setIsSubmitting(false);
          return;
        }
        const res = await verifyOTP(otpSentEmail, otpInput.trim());
        if (res.success) {
          setIsAuthModalVisible(false);
          setNameInput('');
          setEmailInput('');
          setPasswordInput('');
          setOtpInput('');
          setAuthMode('login');
          // Role-based redirect: admins go to Admin Portal
          if (res.data?.role === 'admin') {
            navigation.reset({ index: 0, routes: [{ name: 'AdminPortal' }] });
          } else {
            Alert.alert('Logged In', `Welcome back, ${res.data.name}!`);
          }
        }
      }
    } catch (err: any) {
      console.warn('Authentication action failed:', err);
      setSubmitError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (method: 'otp' | 'link') => {
    setSubmitError(null);
    if (!emailInput.trim()) {
      setSubmitError('Email address is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(emailInput.trim())) {
      setSubmitError('Enter a valid email address.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(emailInput.trim().toLowerCase(), method);
      if (res.success) {
        setOtpSentEmail(emailInput.trim().toLowerCase());
        setOtpInput('');
        if (method === 'otp') {
          setAuthMode('recovery_otp');
          setOtpTimer(60);
          Alert.alert('Code Sent', 'If the email is registered, a verification code has been sent.');
        } else {
          Alert.alert(
            'Link Sent', 
            'If the email is registered, a password reset link has been sent. Tap the link in your email to open the HERIXA app directly.'
          );
          setAuthMode('login');
        }
      }
    } catch (err: any) {
      console.warn('Forgot password request failed:', err);
      setSubmitError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setSubmitError(null);
    try {
      if (authMode === 'recovery_otp') {
        if (otpTimer > 0) {
          Alert.alert('Rate Limit', `Please wait ${otpTimer} seconds before resending.`);
          return;
        }
        await forgotPassword(otpSentEmail, 'otp');
        setOtpTimer(60);
        Alert.alert('OTP Sent', 'A new verification code has been sent to your email.');
      } else {
        await resendOTPCode(otpSentEmail);
        Alert.alert('OTP Sent', 'A new verification code has been dispatched to your email.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Resend request failed. Please wait a minute.');
    }
  };

  const handleChangePasswordSubmit = async () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    
    if (!currentPasswordInput || !changeNewPasswordInput || !changeConfirmPasswordInput) {
      setChangePasswordError('All fields are required.');
      return;
    }
    
    if (changeNewPasswordInput.length < 8) {
      setChangePasswordError('New password must be at least 8 characters long.');
      return;
    }
    
    if (changeNewPasswordInput !== changeConfirmPasswordInput) {
      setChangePasswordError('New passwords do not match.');
      return;
    }
    
    if (currentPasswordInput === changeNewPasswordInput) {
      setChangePasswordError('New password cannot be the same as your current password.');
      return;
    }
    
    setIsSavingProfile(true);
    try {
      const res = await changePassword(currentPasswordInput, changeNewPasswordInput, changeConfirmPasswordInput);
      if (res.success) {
        setChangePasswordSuccess('Password updated successfully.');
        setCurrentPasswordInput('');
        setChangeNewPasswordInput('');
        setChangeConfirmPasswordInput('');
        Alert.alert('Success', 'Your password has been changed successfully.');
        setIsChangePasswordVisible(false);
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleForgotPasswordSettingsClick = () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setSettingsFlowMode('forgot_otp_entry');
    setIsSettingsOtpSent(false);
    setSettingsOtpInput('');
    setSettingsOtpTimer(0);
    setSettingsResetToken(null);
  };

  const handleSendSettingsOtp = async () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setIsSavingProfile(true);
    try {
      const res = await sendSettingsOtp();
      if (res.success) {
        setIsSettingsOtpSent(true);
        setSettingsOtpTimer(60);
        Alert.alert('OTP Sent', res.message || 'A verification code has been sent to your email.');
      } else {
        setChangePasswordError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResendSettingsOtp = async () => {
    if (settingsOtpTimer > 0) {
      Alert.alert('Rate Limit', `Please wait ${settingsOtpTimer} seconds before resending.`);
      return;
    }
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setIsSavingProfile(true);
    try {
      const res = await sendSettingsOtp();
      if (res.success) {
        setSettingsOtpTimer(60);
        Alert.alert('OTP Sent', 'A new verification code has been sent to your email.');
      } else {
        setChangePasswordError(res.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleVerifySettingsOtp = async () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    if (!settingsOtpInput.trim() || settingsOtpInput.trim().length !== 6) {
      setChangePasswordError('Please enter the 6-digit verification code.');
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await verifySettingsOtp(settingsOtpInput.trim());
      if (res.success && res.resetToken) {
        setSettingsResetToken(res.resetToken);
        setSettingsNewPasswordInput('');
        setSettingsConfirmPasswordInput('');
        setSettingsFlowMode('forgot_new_password');
      } else {
        setChangePasswordError(res.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleForgotNewPasswordSubmit = async () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    if (!settingsNewPasswordInput || !settingsConfirmPasswordInput) {
      setChangePasswordError('Both password fields are required.');
      return;
    }
    if (settingsNewPasswordInput.length < 8) {
      setChangePasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (settingsNewPasswordInput !== settingsConfirmPasswordInput) {
      setChangePasswordError('Passwords do not match.');
      return;
    }
    if (!settingsResetToken) {
      setChangePasswordError('Invalid reset session. Please request a new OTP.');
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await resetPassword(settingsResetToken, settingsNewPasswordInput, settingsConfirmPasswordInput);
      if (res.success) {
        setChangePasswordSuccess('Password changed successfully.');
        Alert.alert('Success', 'Your password has been changed successfully.');
        // Reset and close
        setIsChangePasswordVisible(false);
        setCurrentPasswordInput('');
        setChangeNewPasswordInput('');
        setChangeConfirmPasswordInput('');
        setSettingsFlowMode('normal');
        setSettingsOtpInput('');
        setSettingsNewPasswordInput('');
        setSettingsConfirmPasswordInput('');
        setSettingsOtpTimer(0);
        setSettingsResetToken(null);
        setShowSettingsNewPassword(false);
        setShowSettingsConfirmPassword(false);
      } else {
        setChangePasswordError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelSettingsRecovery = () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    setSettingsFlowMode('normal');
    setSettingsOtpInput('');
    setSettingsNewPasswordInput('');
    setSettingsConfirmPasswordInput('');
    setSettingsOtpTimer(0);
    setSettingsResetToken(null);
    setShowSettingsNewPassword(false);
    setShowSettingsConfirmPassword(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name field cannot be left blank.');
      return;
    }
    setIsSavingProfile(true);
    try {
      if (activeUserId && authToken) {
        const res = await updateProfile(activeUserId, editName.trim(), editAvatar.trim(), authToken);
        if (res.success) {
          setProfile(res.data);
          setIsEditModalVisible(false);
          Alert.alert('Profile Saved', 'Your profile detail updates were successfully saved.');
        }
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update profile information.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarPress = () => {
    if (!activeUserId) return;
    setIsPhotoModalVisible(true);
  };

  const handlePickPhoto = async () => {
    console.log('[HERIXA-PHOTO] Picker opened');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to select a photo.');
        return;
      }

      setIsUploadingPhoto(true);

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[HERIXA-PHOTO] Selection cancelled');
        setIsUploadingPhoto(false);
        return; // User cancelled
      }

      console.log('[HERIXA-PHOTO] Image selected');

      // 1. Prepare & compress the photo via ImageManipulator
      const pickedAsset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        pickedAsset.uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Normalize URI (decode URI-encoded parts like spaces or %2540 for Android/Expo)
      let uploadUri = manipulated.uri;
      if (Platform.OS === 'android') {
        uploadUri = decodeURIComponent(manipulated.uri);
      }
      if (uploadUri && !uploadUri.startsWith('file://') && !uploadUri.startsWith('content://')) {
        uploadUri = `file://${uploadUri}`;
      }

      // Check file existence and size using legacy/compatible getInfoAsync
      const fileInfo = await getInfoAsync(uploadUri);
      if (!fileInfo.exists) {
        throw new Error(`Compressed image file does not exist at: ${uploadUri}`);
      }

      // Check size limit: 5 MB
      if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
        Alert.alert('Oversized Image', 'Please select an image smaller than 5 MB.');
        setIsUploadingPhoto(false);
        return;
      }

      console.log('[HERIXA-PHOTO] Image validation passed');

      // 2. Build FormData payload
      const formData = new FormData();
      const uriParts = uploadUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      formData.append('photo', {
        uri: uploadUri,
        name: fileName || 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      if (authToken) {
        console.log('[HERIXA-PHOTO] Upload started');
        const res = await uploadProfilePhoto(formData, authToken, activeUserId);
        if (res.success && res.data) {
          console.log('[HERIXA-PHOTO] Upload success');
          setProfile(res.data);
          setAvatarRevision(prev => prev + 1);
          setImageError(false);
          Alert.alert('Success', 'Profile photo updated successfully.');
        } else {
          Alert.alert('Upload Failed', res.message || 'Unable to upload image.');
        }
      }
    } catch (err: any) {
      console.log('[HERIXA-PHOTO] Upload failed');
      console.warn('[HERIXA-PHOTO] Picker/upload failed:', err);
      Alert.alert('Error', err.message || 'An error occurred while setting profile photo.');
    } finally {
      setIsUploadingPhoto(false);
      setIsPhotoModalVisible(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Profile Photo?',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemovingPhoto(true);
            try {
              if (authToken) {
                const res = await deleteProfilePhoto(authToken, activeUserId);
                if (res.success && res.data) {
                  setProfile(res.data);
                  setImageError(false);
                  Alert.alert('Success', 'Profile photo removed successfully.');
                }
              }
            } catch (err: any) {
              console.warn('[HERIXA-PHOTO] Removal failed:', err);
              Alert.alert('Error', err.message || 'Could not remove profile photo.');
            } finally {
              setIsRemovingPhoto(false);
              setIsPhotoModalVisible(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your HERIXA account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setProfile(null); // Reset profile details memory
            setImageError(false); // Reset image load state
            Alert.alert('Logged Out', 'You have successfully returned to Guest Mode.');
          }
        }
      ]
    );
  };

  const getUserInitials = () => {
    if (!profile) return 'GE';
    return profile.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const scanCount = history.filter((item: any) => item.actionType === 'recognition').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleAvatarPress}
            disabled={!activeUserId}
            style={styles.avatarRing}
          >
            {profile?.profileImageUrl && !imageError ? (
              <Image 
                source={{ uri: `${getProfileImageUrl(profile.profileImageUrl)}?rev=${avatarRevision}` }} 
                style={styles.avatarImage} 
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getUserInitials()}</Text>
              </View>
            )}
            
            {activeUserId && (
              <View style={styles.cameraIconBadge}>
                <Feather name="camera" size={12} color={COLORS.background} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>
            {profile ? profile.name : 'Guest Explorer'}
          </Text>
          <Text style={styles.userRole}>
            {profile ? (profile.role === 'admin' ? 'Conservator Admin' : 'Heritage Explorer') : 'Guest Mode'}
          </Text>
          {profile?.email && (
            <Text style={styles.userEmail}>{profile.email}</Text>
          )}
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Favorites')}
          >
            <Text style={styles.statValue}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Explore')}
          >
            <Text style={styles.statValue}>{uniqueSitesExplored}</Text>
            <Text style={styles.statLabel}>Sites</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('UserHistory')}
          >
            <Text style={styles.statValue}>{authoritativeScanCount}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </TouchableOpacity>
        </View>

        {/* ── MY HERITAGE JOURNEY ────────────────────────────────────────────── */}
        <View style={styles.journeySectionContainer}>
          {/* Journey Header */}
          <View style={styles.journeyHeader}>
            <View style={styles.journeyHeaderTitleRow}>
              <View style={styles.journeyHeaderIconWrap}>
                <Feather name="compass" size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.journeyHeaderTitle}>MY HERITAGE JOURNEY</Text>
            </View>
            <Text style={styles.journeyHeaderSubtitle}>
              Your journey through India's living heritage
            </Text>
          </View>

          {/* New User Onboarding State (If 0 history and 0 favorites) */}
          {history.length === 0 && favorites.length === 0 ? (
            <View style={styles.onboardingCard}>
              <View style={styles.onboardingIconCircle}>
                <Feather name="compass" size={32} color={COLORS.gold} />
              </View>
              <Text style={styles.onboardingTitle}>START YOUR HERITAGE JOURNEY</Text>
              <Text style={styles.onboardingDesc}>
                Scan a monument or explore the Heritage Map to begin discovering India's cultural heritage.
              </Text>
              <TouchableOpacity
                style={styles.onboardingBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Main', { screen: 'Explore' })}
              >
                <Text style={styles.onboardingBtnText}>START EXPLORING</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Recently Explored */}
              <View style={styles.journeySubSection}>
                <View style={styles.journeySubHeader}>
                  <View>
                    <Text style={styles.journeySubTitle}>RECENTLY EXPLORED</Text>
                    <Text style={styles.journeySubDesc}>Places you've recently discovered</Text>
                  </View>
                  {history.length > 0 && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('UserHistory')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.journeySeeAll}>VIEW ALL →</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {recentExploredItems.length === 0 ? (
                  <Text style={styles.journeyEmptyText}>No recently explored sites yet.</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScrollContent}
                  >
                    {recentExploredItems.map((item, idx) => {
                      const mon = item.monument;
                      const imageUri = getMonumentCoverImage(mon);
                      const name = mon.name || 'Heritage Site';
                      const location = mon.state || mon.location || mon.district || 'Tamil Nadu';
                      const timeAgo = formatRelativeTime(item.date);

                      return (
                        <TouchableOpacity
                          key={item.monumentId + '_' + idx}
                          style={styles.exploredCard}
                          activeOpacity={0.8}
                          onPress={() =>
                            navigation.navigate('MonumentDetails', { monumentId: item.monumentId })
                          }
                        >
                          <Image source={{ uri: imageUri }} style={styles.exploredCardImage} />
                          <View style={styles.exploredCardOverlay} />
                          <View style={styles.exploredCardBody}>
                            <Text style={styles.exploredCardName} numberOfLines={1}>
                              {name}
                            </Text>
                            <View style={styles.exploredCardMeta}>
                              <Feather name="map-pin" size={10} color={COLORS.gold} />
                              <Text style={styles.exploredCardLocation} numberOfLines={1}>
                                {location}
                              </Text>
                            </View>
                            <Text style={styles.exploredCardTime}>Explored {timeAgo}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* My Favorites */}
              <View style={styles.journeySubSection}>
                <View style={styles.journeySubHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.journeySubTitle}>MY FAVORITES</Text>
                      {favorites.length > 0 && (
                        <View style={styles.favoriteCountBadge}>
                          <Text style={styles.favoriteCountBadgeText}>{favorites.length}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.journeySubDesc}>Your saved heritage sites</Text>
                  </View>
                  {favorites.length > 0 && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Favorites')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.journeySeeAll}>VIEW ALL →</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {favoriteMonuments.length === 0 ? (
                  <View style={styles.favoritesEmptyCard}>
                    <Feather name="bookmark" size={24} color={COLORS.gold} style={{ marginBottom: 6 }} />
                    <Text style={styles.favoritesEmptyTitle}>NO SAVED HERITAGE SITES</Text>
                    <Text style={styles.favoritesEmptyText}>
                      Save monuments you love and they will appear here.
                    </Text>
                    <TouchableOpacity
                      style={styles.exploreBtn}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('Explore')}
                    >
                      <Text style={styles.exploreBtnText}>EXPLORE HERITAGE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScrollContent}
                  >
                    {favoriteMonuments.map((mon: any, idx: number) => {
                      const imageUri = getMonumentCoverImage(mon);
                      const name = mon.name || 'Saved Site';
                      const location = mon.state || mon.location || mon.district || 'Tamil Nadu';
                      const monId = mon._id || mon.id;

                      return (
                        <TouchableOpacity
                          key={monId + '_' + idx}
                          style={styles.favoriteCard}
                          activeOpacity={0.8}
                          onPress={() =>
                            navigation.navigate('MonumentDetails', { monumentId: monId })
                          }
                        >
                          <Image source={{ uri: imageUri }} style={styles.favoriteCardImage} />
                          <View style={styles.favoriteCardBody}>
                            <Text style={styles.favoriteCardName} numberOfLines={1}>
                              {name}
                            </Text>
                            <View style={styles.exploredCardMeta}>
                              <Feather name="map-pin" size={10} color={COLORS.gold} />
                              <Text style={styles.favoriteCardLocation} numberOfLines={1}>
                                {location}
                              </Text>
                            </View>
                            <View style={styles.savedBadgeRow}>
                              <Feather name="heart" size={10} color={COLORS.gold} fill={COLORS.gold} />
                              <Text style={styles.savedBadgeText}>Saved</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>EXPLORER ACCOUNT</Text>
          
          {!activeUserId ? (
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => { setAuthMode('login'); setIsAuthModalVisible(true); }}>
              <View style={styles.menuItemLeft}>
                <Feather name="log-in" size={18} color={COLORS.gold} />
                <Text style={styles.menuItemText}>Log In / Register</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => setIsEditModalVisible(true)}>
                <View style={styles.menuItemLeft}>
                  <Feather name="edit" size={18} color={COLORS.gold} />
                  <Text style={styles.menuItemText}>Edit Profile</Text>
                </View>
                <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => {
                setChangePasswordSuccess(null);
                setChangePasswordError(null);
                setCurrentPasswordInput('');
                setChangeNewPasswordInput('');
                setChangeConfirmPasswordInput('');
                setIsChangePasswordVisible(true);
              }}>
                <View style={styles.menuItemLeft}>
                  <Feather name="key" size={18} color={COLORS.gold} />
                  <Text style={styles.menuItemText}>Password Settings</Text>
                </View>
                <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={handleLogout}>
                <View style={styles.menuItemLeft}>
                  <Feather name="log-out" size={18} color="#FF3B30" />
                  <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Log Out</Text>
                </View>
                <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {profile?.role === 'admin' && (
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('AdminPortal')}>
              <View style={styles.menuItemLeft}>
                <Feather name="shield" size={18} color={COLORS.gold} />
                <Text style={styles.menuItemText}>Admin Portal</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>SYSTEM SETTINGS</Text>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('Preferences')}>
            <View style={styles.menuItemLeft}>
              <Feather name="settings" size={18} color={COLORS.gold} />
              <Text style={styles.menuItemText}>Preferences</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => setIsLanguageModalVisible(true)}>
            <View style={styles.menuItemLeft}>
              <Feather name="globe" size={18} color={COLORS.gold} />
              <Text style={styles.menuItemText}>Preferred Language</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}>
                {selectedLanguage ? getLanguageByCode(selectedLanguage).displayName : 'Not selected'}
              </Text>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {profile?.role === 'admin' && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>ADMINISTRATIVE</Text>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminPortal')}
            >
              <View style={styles.menuItemLeft}>
                <Feather name="sliders" size={18} color={COLORS.gold} />
                <Text style={styles.menuItemText}>Admin Dashboard</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>PRIVACY & LEGAL</Text>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('PrivacyAndLegal')}>
            <View style={styles.menuItemLeft}>
              <Feather name="shield" size={18} color={COLORS.gold} />
              <Text style={styles.menuItemText}>Privacy & Legal Settings</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>INFORMATION</Text>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('About')}>
            <View style={styles.menuItemLeft}>
              <Feather name="info" size={18} color={COLORS.gold} />
              <Text style={styles.menuItemText}>About HERIXA</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.8} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={styles.menuItemLeft}>
              <Feather name="lock" size={18} color={COLORS.gold} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>HERIXA • v1.0.0</Text>
      </ScrollView>

      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Settings</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Feather name="x" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.modalLabel}>Avatar Initials</Text>
              <TextInput
                style={styles.input}
                value={editAvatar}
                onChangeText={setEditAvatar}
                maxLength={2}
                placeholder="Initials (e.g. AC)"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="characters"
              />

              {isSavingProfile ? (
                <View style={styles.loginLoadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.gold} />
                  <Text style={styles.loginLoadingText}>Updating profile details...</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.loginBtn} onPress={handleSaveProfile} activeOpacity={0.8}>
                  <Text style={styles.loginBtnText}>SAVE CHANGES</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isChangePasswordVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Password Settings</Text>
              <TouchableOpacity onPress={() => {
                setIsChangePasswordVisible(false);
                setChangePasswordError(null);
                setChangePasswordSuccess(null);
                setCurrentPasswordInput('');
                setChangeNewPasswordInput('');
                setChangeConfirmPasswordInput('');
                setSettingsFlowMode('normal');
                setSettingsOtpInput('');
                setSettingsNewPasswordInput('');
                setSettingsConfirmPasswordInput('');
                setSettingsOtpTimer(0);
                setSettingsResetToken(null);
                setShowSettingsNewPassword(false);
                setShowSettingsConfirmPassword(false);
              }}>
                <Feather name="x" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              {settingsFlowMode === 'normal' && (
                <>
                  <Text style={styles.modalLabel}>Current Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={currentPasswordInput}
                      onChangeText={setCurrentPasswordInput}
                      placeholder="Enter current password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                      <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.forgotCurrentPasswordLink}
                    onPress={handleForgotPasswordSettingsClick}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotCurrentPasswordText}>Forgot current password?</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalLabel}>New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={changeNewPasswordInput}
                      onChangeText={setChangeNewPasswordInput}
                      placeholder="Enter new password (min 8 chars)"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
                      <Feather name={showNewPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Confirm New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={changeConfirmPasswordInput}
                      onChangeText={setChangeConfirmPasswordInput}
                      placeholder="Confirm new password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {settingsFlowMode === 'forgot_otp_entry' && (
                <>
                  {!isSettingsOtpSent ? (
                    <View style={{ marginBottom: SPACING.md }}>
                      <Text style={[styles.sheetLoadingText, { textAlign: 'left', marginBottom: SPACING.md }]}>
                        We'll send a verification OTP to your registered email:{"\n"}
                        <Text style={{ color: COLORS.gold, fontWeight: '700' }}>{profile?.email || 'your registered email'}</Text>
                      </Text>
                      {isSavingProfile ? (
                        <View style={styles.loginLoadingContainer}>
                          <ActivityIndicator size="small" color={COLORS.gold} />
                          <Text style={styles.loginLoadingText}>Sending OTP...</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.loginBtn} onPress={handleSendSettingsOtp} activeOpacity={0.8}>
                          <Text style={styles.loginBtnText}>SEND OTP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={{ marginBottom: SPACING.md }}>
                      <Text style={[styles.sheetLoadingText, { textAlign: 'left', marginBottom: SPACING.md }]}>
                        Enter the 6-digit OTP sent to your registered email:{"\n"}
                        <Text style={{ color: COLORS.gold, fontWeight: '700' }}>{profile?.email}</Text>
                      </Text>
                      <View style={styles.passwordInputContainer}>
                        <TextInput
                          style={styles.passwordTextInput}
                          value={settingsOtpInput}
                          onChangeText={setSettingsOtpInput}
                          placeholder="Enter 6-digit OTP"
                          placeholderTextColor={COLORS.textSecondary}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoCapitalize="none"
                        />
                      </View>

                      {isSavingProfile ? (
                        <View style={styles.loginLoadingContainer}>
                          <ActivityIndicator size="small" color={COLORS.gold} />
                          <Text style={styles.loginLoadingText}>Verifying...</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.loginBtn} onPress={handleVerifySettingsOtp} activeOpacity={0.8}>
                          <Text style={styles.loginBtnText}>VERIFY OTP</Text>
                        </TouchableOpacity>
                      )}

                      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md, gap: SPACING.sm }}>
                        {settingsOtpTimer > 0 ? (
                          <Text style={styles.loginLoadingText}>Resend code in {settingsOtpTimer}s</Text>
                        ) : (
                          <TouchableOpacity onPress={handleResendSettingsOtp}>
                            <Text style={[styles.loginLoadingText, { color: COLORS.gold, fontWeight: '700', textDecorationLine: 'underline' }]}>
                              Resend OTP
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}

              {settingsFlowMode === 'forgot_new_password' && (
                <>
                  <Text style={styles.modalLabel}>New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={settingsNewPasswordInput}
                      onChangeText={setSettingsNewPasswordInput}
                      placeholder="Enter new password (min 8 chars)"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showSettingsNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowSettingsNewPassword(!showSettingsNewPassword)}>
                      <Feather name={showSettingsNewPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Confirm New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={settingsConfirmPasswordInput}
                      onChangeText={setSettingsConfirmPasswordInput}
                      placeholder="Confirm new password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showSettingsConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowSettingsConfirmPassword(!showSettingsConfirmPassword)}>
                      <Feather name={showSettingsConfirmPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {isSavingProfile ? (
                    <View style={styles.loginLoadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.gold} />
                      <Text style={styles.loginLoadingText}>Updating password...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.loginBtn} onPress={handleForgotNewPasswordSubmit} activeOpacity={0.8}>
                      <Text style={styles.loginBtnText}>RESET PASSWORD</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {changePasswordError && (
                <Text style={styles.loginErrorText}>{changePasswordError}</Text>
              )}

              {changePasswordSuccess && (
                <Text style={[styles.loginLoadingText, { color: '#4CD964' }]}>{changePasswordSuccess}</Text>
              )}

              {settingsFlowMode === 'normal' && !isSavingProfile && (
                <TouchableOpacity style={styles.loginBtn} onPress={handleChangePasswordSubmit} activeOpacity={0.8}>
                  <Text style={styles.loginBtnText}>CHANGE PASSWORD</Text>
                </TouchableOpacity>
              )}

              {settingsFlowMode === 'normal' && isSavingProfile && (
                <View style={styles.loginLoadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.gold} />
                  <Text style={styles.loginLoadingText}>Updating password...</Text>
                </View>
              )}

              {settingsFlowMode !== 'normal' && (
                <TouchableOpacity 
                  style={[styles.loginBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.sm }]} 
                  onPress={handleCancelSettingsRecovery}
                  disabled={isSavingProfile}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.loginBtnText, { color: COLORS.textSecondary }]}>CANCEL</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isAuthModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {authMode === 'login' ? 'Explorer Account Login' : 
                 authMode === 'register' ? 'Register Account' : 
                 authMode === 'forgot_password' ? 'Forgot Password' :
                 authMode === 'recovery_otp' ? 'Recovery Verification' :
                 authMode === 'reset_password' ? 'Reset Password' :
                 authMode === 'reset_success' ? 'Success' :
                 'Verify Email OTP'}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsAuthModalVisible(false);
                setSubmitError(null);
                setNameInput('');
                setEmailInput('');
                setPasswordInput('');
                setOtpInput('');
                setConfirmPasswordInput('');
                setResetToken(null);
                setAuthMode('login');
              }}>
                <Feather name="x" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalForm}>
              {authMode === 'register' && (
                <>
                  <Text style={styles.modalLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Enter name"
                    placeholderTextColor={COLORS.textSecondary}
                  />

                  <Text style={styles.modalLabel}>Preferred Language (Optional)</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: SPACING.sm }]}
                    value={langSearchQuery}
                    onChangeText={setLangSearchQuery}
                    placeholder="Search preferred language..."
                    placeholderTextColor={COLORS.textSecondary}
                  />

                  <View style={styles.registerLangGrid}>
                    {LANGUAGES.filter(lang => 
                      lang.displayName.toLowerCase().includes(langSearchQuery.toLowerCase()) ||
                      lang.nativeName.toLowerCase().includes(langSearchQuery.toLowerCase())
                    ).map(lang => {
                      const isSel = registerPreferredLanguage === lang.code;
                      return (
                        <TouchableOpacity
                           key={lang.code}
                           style={[
                             styles.registerLangChip,
                             isSel && styles.registerLangChipActive
                           ]}
                           onPress={() => {
                             if (isSel) {
                               setRegisterPreferredLanguage(null);
                             } else {
                               setRegisterPreferredLanguage(lang.code);
                             }
                           }}
                        >
                          <Text style={[styles.registerLangChipText, isSel && { color: COLORS.gold }]}>
                            {lang.nativeName}
                          </Text>
                          <Text style={styles.registerLangChipSubText}>
                            {lang.displayName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity 
                    style={styles.skipLangBtn} 
                    onPress={() => setRegisterPreferredLanguage(null)}
                  >
                    <Text style={styles.skipLangBtnText}>
                      {registerPreferredLanguage ? 'Clear Selection' : 'Skip / None'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {(authMode === 'login' || authMode === 'register') && (
                <>
                  <Text style={styles.modalLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="email@example.com"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.modalLabel}>Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={passwordInput}
                      onChangeText={setPasswordInput}
                      placeholder="Enter password (min 8 chars)"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                      <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  {authMode === 'login' ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs }}>
                      <TouchableOpacity onPress={() => {
                        setAuthMode('forgot_password');
                        setSubmitError(null);
                      }}>
                        <Text style={styles.authModeSwitchText}>Forgot Password?</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setAuthMode('register');
                        setSubmitError(null);
                      }}>
                        <Text style={styles.authModeSwitchText}>Register Account</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.authModeSwitchRow}>
                      <TouchableOpacity onPress={() => {
                        setAuthMode('login');
                        setSubmitError(null);
                      }}>
                        <Text style={styles.authModeSwitchText}>Already registered? Log In</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {authMode === 'forgot_password' && (
                <>
                  <Text style={styles.modalLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="email@example.com"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  
                  {isSubmitting ? (
                    <View style={styles.loginLoadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.gold} />
                      <Text style={styles.loginLoadingText}>Processing...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.modalDesc, { marginTop: SPACING.md, fontStyle: 'italic' }]}>
                        Select a recovery option. The reset link will launch the HERIXA app directly to change your password.
                      </Text>
                      
                      <TouchableOpacity 
                        style={[styles.loginBtn, { marginTop: SPACING.xs }]} 
                        onPress={() => handleForgotPasswordSubmit('link')} 
                        activeOpacity={0.8}
                      >
                        <Text style={styles.loginBtnText}>SEND RESET LINK</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.loginBtn, { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.gold, marginTop: SPACING.sm }]} 
                        onPress={() => handleForgotPasswordSubmit('otp')} 
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.loginBtnText, { color: COLORS.gold }]}>SEND OTP CODE</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={styles.authModeSwitchRow}>
                    <TouchableOpacity onPress={() => {
                      setAuthMode('login');
                      setSubmitError(null);
                    }}>
                      <Text style={styles.authModeSwitchText}>Back to Log In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {(authMode === 'otp' || authMode === 'recovery_otp') && (
                <>
                  <Text style={styles.modalLabel}>Enter 6-Digit OTP</Text>
                  <Text style={styles.modalDesc}>
                    We have dispatched a verification code to {otpSentEmail}. Check your inbox to complete verification.
                  </Text>
                  <TextInput
                    style={[styles.input, { fontSize: 20, fontWeight: 'bold' }]}
                    value={otpInput}
                    onChangeText={setOtpInput}
                    placeholder="123456"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                  
                  <TouchableOpacity style={styles.resendBtn} onPress={handleResendOTP}>
                    <Text style={styles.resendBtnText}>
                      {authMode === 'recovery_otp' && otpTimer > 0 
                        ? `Resend in ${otpTimer}s` 
                        : 'Resend Verification Code'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.authModeSwitchRow}>
                    <TouchableOpacity onPress={() => {
                      setAuthMode('login');
                      setSubmitError(null);
                      setOtpInput('');
                    }}>
                      <Text style={styles.authModeSwitchText}>Cancel and return to Log In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {authMode === 'reset_password' && (
                <>
                  <Text style={styles.modalLabel}>New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={passwordInput}
                      onChangeText={setPasswordInput}
                      placeholder="Enter new password (min 8 chars)"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                      <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Confirm New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordTextInput}
                      value={confirmPasswordInput}
                      onChangeText={setConfirmPasswordInput}
                      placeholder="Confirm new password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.authModeSwitchRow}>
                    <TouchableOpacity onPress={() => {
                      setAuthMode('login');
                      setSubmitError(null);
                      setResetToken(null);
                      setPasswordInput('');
                      setConfirmPasswordInput('');
                    }}>
                      <Text style={styles.authModeSwitchText}>Cancel and return to Log In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {authMode === 'reset_success' && (
                <>
                  <Text style={[styles.modalDesc, { textAlign: 'center', marginVertical: SPACING.lg, fontSize: 16, color: COLORS.textPrimary }]}>
                    Password changed successfully.
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.loginBtn} 
                    onPress={() => {
                      setAuthMode('login');
                      setSubmitError(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.loginBtnText}>Back to Login</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {submitError && (
                <Text style={styles.loginErrorText}>{submitError}</Text>
              )}

              {authMode !== 'reset_success' && authMode !== 'forgot_password' && (
                isSubmitting ? (
                  <View style={styles.loginLoadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.loginLoadingText}>Processing...</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.loginBtn} onPress={handleAuthSubmit} activeOpacity={0.8}>
                    <Text style={styles.loginBtnText}>
                      {(authMode as string) === 'otp' || (authMode as string) === 'recovery_otp' ? 'VERIFY CODE' : 
                       (authMode as string) === 'register' ? 'REGISTER' : 
                       (authMode as string) === 'forgot_password' ? 'SEND CODE' : 
                       (authMode as string) === 'reset_password' ? 'RESET PASSWORD' :
                       'LOG IN'}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* PROFILE PHOTO EDIT SHEET MODAL */}
      <Modal
        visible={isPhotoModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity 
            style={styles.sheetOverlayTapDismiss}
            activeOpacity={1}
            onPress={() => {
              if (!isUploadingPhoto && !isRemovingPhoto) {
                setIsPhotoModalVisible(false);
              }
            }}
          />
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Profile Photo</Text>
            
            {isUploadingPhoto || isRemovingPhoto ? (
              <View style={styles.sheetLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text style={styles.sheetLoadingText}>
                  {isUploadingPhoto ? 'Uploading photo...' : 'Removing photo...'}
                </Text>
              </View>
            ) : (
              <View style={styles.sheetButtonsContainer}>
                <TouchableOpacity 
                  style={styles.sheetButton}
                  onPress={handlePickPhoto}
                  activeOpacity={0.7}
                >
                  <Feather name="image" size={18} color={COLORS.gold} />
                  <Text style={styles.sheetButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                {profile?.profileImageUrl && (
                  <TouchableOpacity 
                    style={[styles.sheetButton, styles.sheetDestructiveButton]}
                    onPress={handleRemovePhoto}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={18} color={COLORS.danger} />
                    <Text style={[styles.sheetButtonText, styles.sheetDestructiveText]}>Remove Photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.sheetCancelButton}
                  onPress={() => setIsPhotoModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* PREFERRED LANGUAGE SELECTION MODAL */}
      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity 
            style={styles.sheetOverlayTapDismiss}
            activeOpacity={1}
            onPress={() => setIsLanguageModalVisible(false)}
          />
          <View style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preferred Language</Text>
              <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                <Feather name="x" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginVertical: SPACING.md }}>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langSelectItem,
                        isSelected && styles.langSelectItemActive,
                      ]}
                      onPress={async () => {
                        try {
                          await changeLanguage(lang.code);
                          if (activeUserId) {
                            setProfile(prev => prev ? { ...prev, preferredLanguage: lang.code } : null);
                          }
                          Alert.alert('Language Updated', `Preferred language set to ${lang.displayName}.`);
                          setIsLanguageModalVisible(false);
                        } catch (err) {
                          Alert.alert('Update Failed', 'Failed to update preferred language.');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={[styles.langSelectName, isSelected && { color: COLORS.gold }]}>
                          {lang.displayName}
                        </Text>
                        <Text style={styles.langSelectNative}>
                          {lang.nativeName}
                        </Text>
                      </View>
                      {isSelected && <Feather name="check" size={18} color={COLORS.gold} />}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.langSelectItem,
                    !selectedLanguage && styles.langSelectItemActive,
                    { borderBottomWidth: 0 }
                  ]}
                  onPress={async () => {
                    try {
                      await changeLanguage(null);
                      if (activeUserId) {
                        setProfile(prev => prev ? { ...prev, preferredLanguage: null } : null);
                      }
                      Alert.alert('Language Cleared', 'No preferred language selected.');
                      setIsLanguageModalVisible(false);
                    } catch (err) {
                      Alert.alert('Update Failed', 'Failed to clear preferred language.');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[styles.langSelectName, !selectedLanguage && { color: COLORS.gold }]}>
                      None / Skip
                    </Text>
                    <Text style={styles.langSelectNative}>
                      No Preference
                    </Text>
                  </View>
                  {!selectedLanguage && <Feather name="check" size={18} color={COLORS.gold} />}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  profileHeader: { alignItems: 'center', paddingVertical: SPACING.xxl, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.gold, fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  userName: { color: COLORS.textPrimary, ...TYPOGRAPHY.h2, fontWeight: '700' },
  userRole: { color: COLORS.gold, ...TYPOGRAPHY.bodyMedium, fontWeight: '600', marginTop: 2 },
  userEmail: { color: COLORS.textSecondary, ...TYPOGRAPHY.caption, marginTop: 4 },
  statsContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, marginHorizontal: SPACING.lg, marginVertical: SPACING.xl, paddingVertical: SPACING.md },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.gold, ...TYPOGRAPHY.h2, fontWeight: '700' },
  statLabel: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, marginTop: 2 },
  divider: { width: 1, height: '100%', backgroundColor: COLORS.border },
  menuSection: { marginHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: { color: COLORS.textSecondary, ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 1.5, marginBottom: SPACING.sm },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: BORDER_RADIUS.md, height: 48, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  menuItemText: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '500' },
  versionText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, textAlign: 'center', opacity: 0.5, marginTop: SPACING.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', padding: SPACING.xl },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.h3, fontWeight: '700' },
  modalForm: { padding: SPACING.lg, gap: SPACING.md },
  modalLabel: { color: COLORS.gold, ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 1 },
  modalDesc: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, lineHeight: 18, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, height: 48, color: COLORS.textPrimary, paddingHorizontal: SPACING.md, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.xs },
  loginBtn: { backgroundColor: COLORS.gold, height: 48, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.sm },
  loginBtnText: { color: COLORS.background, ...TYPOGRAPHY.button, fontWeight: '800' },
  resendBtn: { alignSelf: 'center', padding: SPACING.xs },
  resendBtnText: { color: COLORS.goldMuted, ...TYPOGRAPHY.bodySmall, fontWeight: '600' },
  authModeSwitchRow: { alignItems: 'center', marginTop: SPACING.xs },
  authModeSwitchText: { color: COLORS.goldMuted, ...TYPOGRAPHY.bodySmall, fontWeight: '600' },
  loginLoadingContainer: { flexDirection: 'row', backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, marginTop: SPACING.sm },
  loginLoadingText: { color: COLORS.goldMuted, ...TYPOGRAPHY.bodySmall, fontWeight: '600' },
  loginErrorText: { color: '#FF3B30', ...TYPOGRAPHY.caption, fontWeight: '600' },
  emptyHistoryCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  emptyHistoryText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, textAlign: 'center' },
  historyItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.md },
  historyIconWrapper: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyAction: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '600' },
  historyMonumentName: { color: COLORS.gold, ...TYPOGRAPHY.bodySmall, marginTop: 2 },
  historyDate: { color: COLORS.textSecondary, ...TYPOGRAPHY.caption, marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  viewAllText: { color: COLORS.gold, ...TYPOGRAPHY.bodySmall, fontWeight: '700' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, resizeMode: 'cover' },
  cameraIconBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: COLORS.gold, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  sheetOverlayTapDismiss: { flex: 1 },
  sheetContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0 },
  sheetTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.h3, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.lg },
  sheetButtonsContainer: { gap: SPACING.md },
  sheetButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surfaceLight, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  sheetButtonText: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: '600' },
  sheetDestructiveButton: { borderColor: 'rgba(255, 59, 48, 0.2)', backgroundColor: 'rgba(255, 59, 48, 0.05)' },
  sheetDestructiveText: { color: COLORS.danger },
  sheetCancelButton: { alignItems: 'center', padding: SPACING.md, marginTop: SPACING.xs },
  sheetCancelText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium, fontWeight: '700' },
  sheetLoadingContainer: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  sheetLoadingText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodyMedium },
  registerLangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: SPACING.md,
    justifyContent: 'space-between',
  },
  registerLangChip: {
    width: '48%',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerLangChipActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  registerLangChipText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    textAlign: 'center',
  },
  registerLangChipSubText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  skipLangBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipLangBtnText: {
    color: COLORS.goldMuted,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  langSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  langSelectItemActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.02)',
  },
  langSelectName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  langSelectNative: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, height: 48, marginTop: SPACING.xs },
  passwordTextInput: { flex: 1, color: COLORS.textPrimary, paddingHorizontal: SPACING.md, ...TYPOGRAPHY.bodyMedium, height: '100%' },
  eyeButton: { paddingHorizontal: SPACING.md, justifyContent: 'center', alignItems: 'center' },
  forgotCurrentPasswordLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  forgotCurrentPasswordText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  journeySectionContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  journeyHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: SPACING.md,
  },
  journeyHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  journeyHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyHeaderTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  journeyHeaderSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 4,
    marginLeft: 40,
  },

  journeyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  journeyStatCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  journeyStatValue: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '800',
  },
  journeyStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  journeySubSection: {
    gap: SPACING.sm,
  },
  journeySubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeySubTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  journeySubDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  journeySeeAll: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  journeyEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: SPACING.xs,
  },

  horizontalScrollContent: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  exploredCard: {
    width: 170,
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exploredCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  exploredCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  exploredCardBody: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xs + 2,
  },
  exploredCardName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  exploredCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  exploredCardLocation: {
    color: COLORS.textSecondary,
    fontSize: 10,
    flex: 1,
  },
  exploredCardTime: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },

  favoriteCard: {
    width: 140,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  favoriteCardImage: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
  },
  favoriteCardBody: {
    padding: SPACING.xs + 2,
  },
  favoriteCardName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteCardLocation: {
    color: COLORS.textSecondary,
    fontSize: 10,
    flex: 1,
  },

  favoritesEmptyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  favoritesEmptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  favoritesEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  exploreBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  exploreBtnText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  favoriteCountBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  favoriteCountBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  savedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  savedBadgeText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
  },

  onboardingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  onboardingIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  onboardingTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  onboardingDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  onboardingBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  onboardingBtnText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

export default ProfileScreen;
