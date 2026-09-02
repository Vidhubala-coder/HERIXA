import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { useFavorites } from '../context/FavoritesContext';

type ResetPasswordScreenProps = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ route, navigation }) => {
  const token = route.params?.token;
  const { resetPassword } = useFavorites();

  React.useEffect(() => {
    console.log('[HERIXA-RESET] ResetPasswordScreen mounted');
    console.log(`[HERIXA-RESET] Deep link received: ${token ? 'YES' : 'NO'}`);
    if (token) {
      console.log(`[HERIXA-RESET] Token received: YES (length: ${token.length})`);
    } else {
      console.log('[HERIXA-RESET] Token received: NO');
    }
  }, [token]);

  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setSubmitError(null);

    if (!passwordInput || !confirmPasswordInput) {
      setSubmitError('Both password fields are required.');
      return;
    }

    if (passwordInput.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (passwordInput !== confirmPasswordInput) {
      setSubmitError('Passwords do not match.');
      return;
    }

    if (!token) {
      setSubmitError('Invalid reset session. Please request a new recovery link.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[HERIXA-RESET] Reset API request started');
      const res = await resetPassword(token, passwordInput, confirmPasswordInput);
      console.log(`[HERIXA-RESET] Reset API response: ${JSON.stringify(res)}`);
      
      if (res.success) {
        console.log('[HERIXA-RESET] Reset successful');
        setSuccess(true);
      } else {
        console.log(`[HERIXA-RESET] Reset failed: ${res.message}`);
        setSubmitError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      console.warn('[HERIXA-RESET] Reset password error caught:', err);
      const errorMsg = err.responseBody?.message || err.message || 'An error occurred. Please try again.';
      console.log(`[HERIXA-RESET] Reset failed with message: ${errorMsg}`);
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'Profile' } }],
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoRing}>
              <Feather name="aperture" size={32} color={COLORS.gold} />
            </View>
            <Text style={styles.appName}>HERIXA</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create New Password</Text>

            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Feather name="check" size={36} color={COLORS.gold} />
                </View>
                <Text style={styles.successText}>Password changed successfully.</Text>
                
                <TouchableOpacity style={styles.btn} onPress={handleBackToLogin} activeOpacity={0.8}>
                  <Text style={styles.btnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
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

                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
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

                {submitError && <Text style={styles.errorText}>{submitError}</Text>}

                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.loadingText}>Resetting password...</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.btn} onPress={handleResetPassword} activeOpacity={0.8}>
                    <Text style={styles.btnText}>Reset Password</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.cancelBtn} onPress={handleBackToLogin} disabled={isSubmitting}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  appName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  form: {
    width: '100%',
  },
  label: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  passwordInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  eyeButton: {
    padding: SPACING.xs,
  },
  errorText: {
    color: '#D32F2F',
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  btnText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    marginBottom: SPACING.lg,
  },
  successText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
});
