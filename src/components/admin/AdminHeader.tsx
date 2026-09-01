import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { getImageUrl } from '../../services/monumentService';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onMenuPress: () => void;
  navigation?: any;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onMenuPress,
  navigation,
}) => {
  const { userProfile } = useFavorites();
  const userName = userProfile?.name || 'Admin';
  const rawAvatar = userProfile?.avatar || userProfile?.profileImageUrl;
  const avatarUrl = rawAvatar ? getImageUrl(rawAvatar) : null;
  const userInitials = userName ? userName.charAt(0).toUpperCase() : 'A';

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.menuBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="menu" size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.brand} numberOfLines={1}>HERIXA ADMIN</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle || title || 'Heritage Administration'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation?.navigate('AdminNotifications')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bell" size={18} color={COLORS.textSecondary} />
          <View style={styles.notifBadge} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => navigation?.navigate('AdminProfile')}
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
          )}
          <View style={styles.profileTextCol}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.profileRole}>Admin</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#141412',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  menuBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleContainer: {
    flex: 1,
  },
  brand: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.gold,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  avatarText: {
    color: '#141412',
    fontSize: 12,
    fontWeight: '800',
  },
  profileTextCol: {
    justifyContent: 'center',
    paddingRight: 4,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 90,
  },
  profileRole: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
  },
});
