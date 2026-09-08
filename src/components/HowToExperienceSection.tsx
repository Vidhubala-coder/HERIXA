import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { getPublicProtocol, HeritageProtocolData, ProtocolItem, ProtocolSections } from '../services/protocolService';
import { HowToExperienceVoiceGuide } from './HowToExperienceVoiceGuide';

interface Props {
  monumentId: string;
  monumentSlug?: string;
  monumentName?: string;
}

interface SectionConfig {
  key: keyof ProtocolSections;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  defaultOpen?: boolean;
}

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'beforeVisit', title: 'Before You Visit', icon: 'calendar', defaultOpen: true },
  { key: 'entryGuidelines', title: 'Entry Guidelines', icon: 'log-in', defaultOpen: true },
  { key: 'dressGuidance', title: 'Dress Guidance', icon: 'user-check', defaultOpen: true },
  { key: 'traditionalPractices', title: 'Traditional Practices', icon: 'heart' },
  { key: 'photography', title: 'Photography Guidelines', icon: 'camera' },
  { key: 'dos', title: "Do's", icon: 'check-circle' },
  { key: 'donts', title: "Don'ts", icon: 'slash' },
  { key: 'respectfulBehaviour', title: 'Respectful Behaviour', icon: 'sun' },
  { key: 'accessibility', title: 'Accessibility & Terrain', icon: 'help-circle' },
  { key: 'restrictions', title: 'Important Restrictions', icon: 'alert-triangle' },
  { key: 'visitorNotes', title: 'Visitor Notes', icon: 'file-text' },
];

export const HowToExperienceSection: React.FC<Props> = ({ monumentId, monumentName }) => {
  const [selectedLang, setSelectedLang] = useState<'en' | 'ta' | 'hi'>('en');
  const [loading, setLoading] = useState<boolean>(true);
  const [protocol, setProtocol] = useState<HeritageProtocolData | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    beforeVisit: true,
    entryGuidelines: true,
    dressGuidance: true
  });

  const fetchProtocol = async (lang: 'en' | 'ta' | 'hi') => {
    setLoading(true);
    try {
      const res = await getPublicProtocol(monumentId, lang);
      if (res && res.success && res.data) {
        setProtocol(res.data);
        setIsVerified(res.isVerified);
      } else {
        setProtocol(null);
        setIsVerified(false);
        if (res?.message) setMessage(res.message);
      }
    } catch (err) {
      console.warn('[HowToExperience] Failed to fetch protocol:', err);
      setProtocol(null);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocol(selectedLang);
  }, [monumentId, selectedLang]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      {/* Monument-Specific Voice Instruction Feature */}
      <HowToExperienceVoiceGuide
        monumentId={monumentId}
        monumentName={monumentName || 'Heritage Monument'}
        initialLanguage={selectedLang}
      />
      {/* Header & Subtitle */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="compass" size={20} color={COLORS.gold} style={styles.headerIcon} />
          <Text style={styles.sectionHeaderTitle}>How to Experience</Text>
        </View>

        {/* Language Switcher */}
        <View style={styles.langContainer}>
          <TouchableOpacity
            style={[styles.langChip, selectedLang === 'en' && styles.langChipActive]}
            onPress={() => setSelectedLang('en')}
          >
            <Text style={[styles.langChipText, selectedLang === 'en' && styles.langChipTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, selectedLang === 'ta' && styles.langChipActive]}
            onPress={() => setSelectedLang('ta')}
          >
            <Text style={[styles.langChipText, selectedLang === 'ta' && styles.langChipTextActive]}>தமிழ்</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, selectedLang === 'hi' && styles.langChipActive]}
            onPress={() => setSelectedLang('hi')}
          >
            <Text style={[styles.langChipText, selectedLang === 'hi' && styles.langChipTextActive]}>हिंदी</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Learn how to respectfully and appropriately experience this heritage site.
      </Text>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading heritage guide...</Text>
        </View>
      )}

      {/* Empty State / Unverified Guidance */}
      {!loading && (!protocol || !isVerified) && (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.gold} style={{ marginBottom: SPACING.xs }} />
          <Text style={styles.emptyTitle}>Heritage guidance is currently being verified.</Text>
          <Text style={styles.emptyDescription}>
            {message || 'Please follow instructions provided by site authorities and security personnel during your visit.'}
          </Text>
        </View>
      )}

      {/* Verified Content Sections */}
      {!loading && protocol && isVerified && (
        <View style={styles.sectionsList}>
          {SECTION_CONFIGS.map(cfg => {
            const items: ProtocolItem[] = protocol.sections[cfg.key] || [];
            if (!Array.isArray(items) || items.length === 0) {
              return null; // Do not display empty sections
            }

            const isOpen = !!openSections[cfg.key];

            return (
              <View key={cfg.key} style={styles.cardContainer}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleSection(cfg.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeaderLeft}>
                    <Feather name={cfg.icon} size={16} color={COLORS.gold} style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>{cfg.title}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{items.length}</Text>
                    </View>
                  </View>
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.cardContent}>
                    {items.map((item, idx) => (
                      <View key={item.id || idx} style={styles.itemRow}>
                        <View style={styles.badgeRow}>
                          {item.classification === 'VERIFIED' ? (
                            <View style={styles.verifiedBadge}>
                              <Ionicons name="checkmark-circle" size={12} color={COLORS.gold} style={{ marginRight: 3 }} />
                              <Text style={styles.verifiedBadgeText}>VERIFIED SOURCE</Text>
                            </View>
                          ) : (
                            <View style={styles.guidanceBadge}>
                              <Feather name="info" size={10} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
                              <Text style={styles.guidanceBadgeText}>GENERAL ETIQUETTE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemText}>{item.text}</Text>

                        {/* Source Attribution Snippet if Verified */}
                        {item.classification === 'VERIFIED' && item.sourceTitle && (
                          <Text style={styles.sourceAttribution}>
                            Source: {item.sourceOrganization ? `${item.sourceOrganization} — ` : ''}{item.sourceTitle}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Source Transparency Footer */}
          <View style={styles.sourcesFooter}>
            <Text style={styles.sourcesFooterTitle}>Information Sources & Verification</Text>
            {protocol.sources && protocol.sources.length > 0 ? (
              protocol.sources.map((src, sIdx) => (
                <TouchableOpacity
                  key={src.id || sIdx}
                  style={styles.sourceRow}
                  onPress={() => {
                    if (src.url) Linking.openURL(src.url).catch(() => {});
                  }}
                >
                  <Feather name="external-link" size={13} color={COLORS.gold} style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceTitleText}>{src.title || src.organization}</Text>
                    <Text style={styles.sourceMetaText}>
                      {src.organization} • {src.sourceType} • Verified {new Date(src.retrievedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.sourceMetaText}>Compiled from verified heritage documentation.</Text>
            )}

            <View style={styles.disclaimerBox}>
              <Feather name="alert-circle" size={13} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.disclaimerText}>
                Visitor rules may change. Please follow current instructions displayed by authorities at the heritage site.
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: SPACING.xs,
  },
  sectionHeaderTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  langContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  langChipActive: {
    backgroundColor: COLORS.gold,
  },
  langChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  langChipTextActive: {
    color: COLORS.background,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.bodyMedium.fontSize,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.bodyMedium.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionsList: {
    gap: SPACING.sm,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: SPACING.xs,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.bodyMedium.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  countBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countBadgeText: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  cardContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  itemRow: {
    paddingTop: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.gold,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.gold,
  },
  guidanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  guidanceBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  itemText: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  sourceAttribution: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  sourcesFooter: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourcesFooterTitle: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourceTitleText: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  sourceMetaText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  disclaimerText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 14,
  },
});
