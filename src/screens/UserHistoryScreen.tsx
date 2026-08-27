import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { getImageUrl } from '../services/monumentService';

const { width } = Dimensions.get('window');

export const UserHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    history,
    deleteHistory,
    clearHistory,
    deletingIds,
    isClearing,
    isLoading
  } = useFavorites();

  const handleClearAll = () => {
    if (isClearing) return;
    Alert.alert(
      'Clear all history?',
      'All your recognition and search history will be permanently removed from this account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
            } catch (err) {
              // Errors are alerted inside context helper
            }
          }
        }
      ]
    );
  };

  const handleDeleteItem = (historyId: string) => {
    if (deletingIds.includes(historyId)) return;
    Alert.alert(
      'Delete history item?',
      'Are you sure you want to remove this record from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHistory(historyId);
            } catch (err) {
              // Errors are alerted inside context helper
            }
          }
        }
      ]
    );
  };

  const handleItemPress = (item: any) => {
    const monId = item.monumentId?._id || item.monumentId?.id;
    if (monId) {
      navigation.navigate('MonumentDetails', { monumentId: monId });
    }
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const isDeleting = deletingIds.includes(item._id || item.id);
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    let actionTitle = 'Viewed Monument';
    let iconName: keyof typeof Feather.glyphMap = 'eye';
    if (item.actionType === 'recognition') {
      actionTitle = 'Recognized Monument';
      iconName = 'aperture';
    } else if (item.actionType === 'search') {
      actionTitle = `Searched: "${item.query || ''}"`;
      iconName = 'search';
    } else if (item.actionType === 'ai_question') {
      actionTitle = `Asked AI: "${item.query || ''}"`;
      iconName = 'cpu';
    }

    const monName = item.monumentId?.name;
    const monImage = item.monumentId?.image || item.monumentId?.imageUrl;
    const resolvedImage = monImage ? getImageUrl(monImage) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleItemPress(item)}
        disabled={!item.monumentId}
      >
        {/* Left Side: Thumbnail or Fallback Icon */}
        <View style={styles.imageWrapper}>
          {resolvedImage ? (
            <Image source={{ uri: resolvedImage }} style={styles.thumbnail} />
          ) : (
            <View style={styles.fallbackIconWrapper}>
              <Feather name={iconName} size={18} color={COLORS.gold} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.actionTitle} numberOfLines={1}>{actionTitle}</Text>
          {monName && (
            <Text style={styles.monumentName} numberOfLines={1}>{monName}</Text>
          )}
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {/* Action: Delete */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item._id || item.id)}
          disabled={isDeleting}
          activeOpacity={0.7}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <Feather name="trash-2" size={16} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Feather name="clock" size={32} color={COLORS.gold} />
        </View>
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptySubtitle}>
          Your monument searches and recognition activity will appear here.
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          activeOpacity={0.8}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Main',
                  params: { screen: 'Explore' }
                }
              ]
            });
          }}
        >
          <Text style={styles.exploreButtonText}>Explore Monuments</Text>
        </TouchableOpacity>
      </View>
    );
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
        >
          <Feather name="arrow-left" size={22} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Heritage Journey</Text>

        {history.length > 0 ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
            disabled={isClearing}
            activeOpacity={0.7}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <Text style={styles.clearButtonText}>Clear All</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* List / Loading */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, idx) => item._id || item.id || String(idx)}
          renderItem={renderHistoryItem}
          contentContainerStyle={[
            styles.listContainer,
            history.length === 0 && { flex: 1, justifyContent: 'center' }
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  clearButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  clearButtonText: {
    color: COLORS.danger,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  imageWrapper: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackIconWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
    justifyContent: 'center',
  },
  actionTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  monumentName: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginTop: 2,
  },
  dateText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  exploreButton: {
    backgroundColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    maxWidth: 240,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.goldMuted,
  },
  exploreButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
  },
});

export default UserHistoryScreen;
