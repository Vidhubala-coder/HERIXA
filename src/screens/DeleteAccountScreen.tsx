import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { deleteAccount } from '../services/userService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

export const DeleteAccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken, logout } = useFavorites();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePress = () => {
    if (!password) {
      Alert.alert('Validation Error', 'You must enter your password to confirm account deletion.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'This action is irreversible. All of your saved favorites, scan history, preferences, and account profile details will be permanently deleted. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: performDeletion,
        },
      ]
    );
  };

  const performDeletion = async () => {
    if (!authToken) {
      Alert.alert('Authentication Error', 'You are not currently authenticated.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccount(password, authToken);
      if (res.success) {
        Alert.alert(
          'Account Deleted',
          'Your HERIXA account and all associated cultural records have been permanently removed.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await logout();
                navigation.navigate('Home');
              },
            },
          ]
        );
      } else {
        Alert.alert('Deletion Failed', res.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected server error occurred during account deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          <Feather name="arrow-left" size={22} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.warningCard}>
          <Feather name="alert-triangle" size={24} color={COLORS.danger} style={{ marginBottom: SPACING.xs }} />
          <Text style={styles.warningTitle}>Delete Your Account</Text>
          <Text style={styles.warningText}>
            This action permanently deletes your HERIXA account and associated personal data. This action cannot be undone.
          </Text>
          <Text style={styles.warningSubText}>
            The following data will be permanently removed:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Name, email, and password registration records.</Text>
            <Text style={styles.bulletItem}>• Saved favorites and monument bookmark logs.</Text>
            <Text style={styles.bulletItem}>• Language preferences and app configurations.</Text>
            <Text style={styles.bulletItem}>• Dynamic monument scanning and recognition history entries.</Text>
          </View>
        </View>

        <View style={styles.confirmSection}>
          <Text style={styles.confirmLabel}>Enter your password to confirm account deletion</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordTextInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Confirm account password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isDeleting}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isDeleting}
            >
              <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {isDeleting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.danger} />
              <Text style={styles.loadingText}>Deleting account data...</Text>
            </View>
          ) : (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeletePress}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteButtonText}>DELETE MY ACCOUNT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  content: { flex: 1, padding: SPACING.lg, justifyContent: 'space-between' },
  warningCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  warningTitle: {
    color: COLORS.danger,
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  warningText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  warningSubText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  bulletList: { gap: SPACING.xs, paddingLeft: SPACING.xs },
  bulletItem: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
  },
  confirmSection: { gap: SPACING.md, paddingBottom: SPACING.lg },
  confirmLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    height: 48,
  },
  passwordTextInput: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.bodyMedium,
    height: '100%',
  },
  eyeButton: { paddingHorizontal: SPACING.md, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 48,
    marginTop: SPACING.sm,
  },
  loadingText: { color: COLORS.danger, ...TYPOGRAPHY.bodyMedium, fontWeight: '700' },
  actionsContainer: { gap: SPACING.sm, marginTop: SPACING.sm },
  deleteButton: {
    backgroundColor: COLORS.danger,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: { color: COLORS.textPrimary, ...TYPOGRAPHY.button, fontWeight: '800' },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: { color: COLORS.gold, ...TYPOGRAPHY.button, fontWeight: '800' },
});

export default DeleteAccountScreen;
