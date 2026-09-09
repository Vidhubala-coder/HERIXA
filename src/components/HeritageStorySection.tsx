import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { heritageVideoService, HeritageStoryData, StoryLanguage, StoryScene, StoryItem, getVideoUrl } from '../services/heritageVideoService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface HeritageStorySectionProps {
  monumentId: string;
  monumentSlug: string;
  monumentName?: string;
}

const { width, height } = Dimensions.get('window');

export const HeritageStorySection: React.FC<HeritageStorySectionProps> = ({
  monumentId,
  monumentSlug,
  monumentName
}) => {
  const [activeLanguage, setActiveLanguage] = useState<StoryLanguage>('en');
  const [story, setStory] = useState<HeritageStoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  useEffect(() => {
    loadPublicStory(activeLanguage);
  }, [monumentId, activeLanguage]);

  const loadPublicStory = async (lang: StoryLanguage) => {
    setLoading(true);
    try {
      const data = await heritageVideoService.getPublicStory(monumentId, lang);
      setStory(data);
    } catch (err) {
      console.warn('[HERIXA STORY COMPONENT] Failed to load story:', err);
      setStory(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: StoryLanguage) => {
    setActiveLanguage(lang);
  };

  const isUrlValidMedia = (url?: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed.toLowerCase().includes('bigbuckbunny')) return false;
    if (trimmed.toLowerCase().includes('sample') && trimmed.toLowerCase().includes('gtv-videos-bucket')) return false;
    if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
    return false;
  };

  const hasValidVideo = story && (story.status === 'PUBLISHED' || !!story.videoUrl) && isUrlValidMedia(story.videoUrl);

  const renderVideoHtml = (rawVideoUrl: string, posterUrl?: string) => {
    const videoUrl = getVideoUrl(rawVideoUrl);
    const poster = posterUrl || 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
          video { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <video id="v" controls playsinline preload="metadata" poster="${poster}">
          <source id="v-src" src="${videoUrl}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
        <script>
          const v = document.getElementById('v');
          const src = document.getElementById('v-src');
          function notifyError(msg) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIDEO_ERROR', detail: msg }));
            }
          }
          if (src) {
            src.addEventListener('error', function() {
              const code = v && v.error ? (v.error.message || 'Error code: ' + v.error.code) : 'Failed to load video resource.';
              notifyError(code);
            });
          }
          if (v) {
            v.addEventListener('error', function() {
              const code = v.error ? (v.error.message || 'Error code: ' + v.error.code) : 'Video playback failed.';
              notifyError(code);
            });
          }
        </script>
      </body>
      </html>
    `;
  };

  const [videoError, setVideoError] = useState<boolean>(false);
  const [videoErrorDetail, setVideoErrorDetail] = useState<string>('');

  const handleRetryVideo = () => {
    setVideoError(false);
    setVideoErrorDetail('');
    loadPublicStory(activeLanguage);
  };

  const handleOpenModal = () => {
    setModalVisible(true);
    setVideoError(false);
    setVideoErrorDetail('');
    loadPublicStory(activeLanguage);
  };

  return (
    <View style={styles.container}>
      {/* Hero Banner Card */}
      <TouchableOpacity
        style={styles.heroCard}
        activeOpacity={0.9}
        onPress={handleOpenModal}
      >
        <View style={styles.heroHeaderRow}>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeIcon}>🎬</Text>
            <Text style={styles.badgeText}>AI HERITAGE STORY</Text>
          </View>
          {story?.duration ? (
            <View style={styles.durationTag}>
              <Feather name="clock" size={12} color={COLORS.gold} />
              <Text style={styles.durationText}>{Math.ceil(story.duration / 60)} min story</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.heroTitle}>{story?.title || `${monumentName || 'Monument'} Heritage Story`}</Text>
        <Text style={styles.heroSubtitle}>
          {story?.shortIntroduction || 'Watch the complete narrative history, architectural features, cultural legacy, and traditions.'}
        </Text>

        <View style={styles.heroActionRow}>
          <View style={styles.watchBtn}>
            <Feather name="play-circle" size={18} color="#000" />
            <Text style={styles.watchBtnText}>WATCH STORY</Text>
          </View>
          <Text style={styles.languagesAvailableText}>English • தமிழ் • हिन्दी</Text>
        </View>
      </TouchableOpacity>

      {/* Full Experience Story Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {story?.title || 'AI Heritage Story'}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* 6-Language Switcher Bar */}
            <View style={styles.langBar}>
              <Text style={styles.langBarLabel}>Language:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 6 }}>
                {(['en', 'ta', 'hi', 'te', 'ml', 'kn'] as StoryLanguage[]).map(lang => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langChip, activeLanguage === lang && styles.langChipActive]}
                    onPress={() => {
                      setVideoError(false);
                      handleLanguageChange(lang);
                    }}
                  >
                    <Text style={[styles.langChipText, activeLanguage === lang && styles.langChipTextActive]}>
                      {lang === 'en' ? 'EN' : lang === 'ta' ? 'தமிழ்' : lang === 'hi' ? 'हिंदी' : lang === 'te' ? 'తెలుగు' : lang === 'ml' ? 'മലയാളം' : 'ಕನ್ನಡ'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text style={styles.loadingText}>Loading Heritage Story...</Text>
              </View>
            ) : story && (story.status === 'PUBLISHED' || !!story.videoUrl) ? (
              <View style={{ gap: SPACING.lg }}>
                {/* Video Player or Video Error State or No Video State */}
                {hasValidVideo ? (
                  videoError ? (
                    <View style={styles.errorVideoCard}>
                      <Feather name="alert-triangle" size={32} color={COLORS.gold} />
                      <Text style={styles.errorVideoTitle}>Unable to play this heritage video.</Text>
                      {videoErrorDetail ? <Text style={styles.errorVideoDetail}>{videoErrorDetail}</Text> : null}
                      <TouchableOpacity style={styles.retryBtn} onPress={handleRetryVideo}>
                        <Feather name="refresh-cw" size={16} color="#FFF" />
                        <Text style={styles.retryBtnText}>Retry Playback</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.videoWrapper}>
                      <WebView
                        originWhitelist={['*']}
                        source={{ html: renderVideoHtml(story.videoUrl!, story.thumbnailUrl) }}
                        style={styles.webViewPlayer}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        domStorageEnabled={true}
                        javaScriptEnabled={true}
                        allowsFullscreenVideo={true}
                        mixedContentMode="always"
                        onMessage={(event) => {
                          try {
                            const data = JSON.parse(event.nativeEvent.data);
                            if (data.type === 'VIDEO_ERROR') {
                              setVideoError(true);
                              if (data.detail) {
                                setVideoErrorDetail(data.detail);
                              }
                            }
                          } catch (e) {}
                        }}
                      />
                    </View>
                  )
                ) : (
                  <View style={styles.noVideoCard}>
                    <Feather name="film" size={28} color={COLORS.gold} />
                    <Text style={styles.noVideoText}>Heritage video is not available yet.</Text>
                  </View>
                )}

                {/* Story Intro */}
                <View style={styles.introCard}>
                  <Text style={styles.storyHeaderTitle}>{story.title}</Text>
                  <Text style={styles.storyHeaderIntro}>{story.shortIntroduction}</Text>
                </View>

                {/* Story Scenes Breakdown */}
                {story.scenes && story.scenes.length > 0 && (
                  <View style={styles.sceneSection}>
                    <Text style={styles.sectionHeading}>Cinematic Story Breakdown</Text>
                    {story.scenes.map((scene, idx) => (
                      <View key={idx} style={styles.sceneCard}>
                        <View style={styles.sceneCardHeader}>
                          <Text style={styles.sceneNumber}>SCENE {scene.sceneNumber}</Text>
                          <Text style={styles.sceneTitle}>{scene.title}</Text>
                        </View>
                        <Text style={styles.sceneNarration}>"{scene.narration}"</Text>
                        {scene.visualDescription && (
                          <Text style={styles.sceneVisual}>🎥 Visual: {scene.visualDescription}</Text>
                        )}
                        {scene.caption && (
                          <View style={styles.captionTag}>
                            <Text style={styles.captionText}>{scene.caption}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Sections Summary & Fact vs Legend Badges */}
                <View style={styles.discoverySection}>
                  <Text style={styles.sectionHeading}>What You'll Discover</Text>

                  {/* Historical Background */}
                  {story.sections?.historicalBackground && story.sections.historicalBackground.length > 0 && (
                    <View style={styles.factGroup}>
                      <Text style={styles.factGroupTitle}>Historical Background</Text>
                      {story.sections.historicalBackground.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <View style={[styles.classificationBadge, item.classification === 'TRADITIONAL_ACCOUNT' ? styles.legendBadge : styles.verifiedBadge]}>
                            <Text style={styles.badgeLabel}>
                              {item.classification === 'TRADITIONAL_ACCOUNT' ? 'LEGEND / TRADITIONAL ACCOUNT' : 'VERIFIED HISTORICAL FACT'}
                            </Text>
                          </View>
                          <Text style={styles.itemText}>{item.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Architecture */}
                  {story.sections?.architecture && story.sections.architecture.length > 0 && (
                    <View style={styles.factGroup}>
                      <Text style={styles.factGroupTitle}>Architecture & Engineering</Text>
                      {story.sections.architecture.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.badgeLabel}>VERIFIED FACT</Text>
                          </View>
                          <Text style={styles.itemText}>{item.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Stories and Legends */}
                  {story.sections?.storiesAndLegends && story.sections.storiesAndLegends.length > 0 && (
                    <View style={styles.factGroup}>
                      <Text style={styles.factGroupTitle}>Stories & Traditions</Text>
                      {story.sections.storiesAndLegends.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <View style={styles.legendBadge}>
                            <Text style={styles.badgeLabel}>LEGEND / TRADITIONAL ACCOUNT</Text>
                          </View>
                          <Text style={styles.itemText}>{item.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Transparency Footer */}
                <View style={styles.transparencyFooter}>
                  <Text style={styles.footerHeading}>Source Verification & Transparency</Text>
                  {story.sources && story.sources.length > 0 ? (
                    story.sources.map((src, idx) => (
                      <Text key={idx} style={styles.sourceLine}>
                        • {src.title} ({src.organization})
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.sourceLine}>• Archaeological Survey & Official Heritage Department Records</Text>
                  )}
                  <Text style={styles.disclaimerText}>
                    Historical facts are attributed to trusted heritage sources. Traditional legends are labelled as oral lore.
                  </Text>
                </View>
              </View>
            ) : (
              /* Empty State (Zero Gemini Calls) */
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎬</Text>
                <Text style={styles.emptyTitle}>Heritage Story Coming Soon</Text>
                <Text style={styles.emptyText}>
                  Our heritage story for this monument is currently being prepared, translated, and verified by heritage authorities.
                </Text>
                <Text style={styles.emptySubtext}>
                  Please check back soon for the full cinematic narrative experience.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  heroActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
  },
  watchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
    letterSpacing: 0.5,
  },
  languagesAvailableText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  langBarLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  langChipActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  langChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  langChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  videoWrapper: {
    width: '100%',
    height: 220,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  webViewPlayer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  introCard: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: 6,
  },
  storyHeaderTitle: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  storyHeaderIntro: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  sceneSection: {
    gap: SPACING.sm,
  },
  sectionHeading: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  sceneCard: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  sceneCardHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sceneNumber: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  sceneTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  sceneNarration: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  sceneVisual: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  captionTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  captionText: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  discoverySection: {
    gap: SPACING.md,
  },
  factGroup: {
    gap: 6,
  },
  factGroupTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  itemRow: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: 4,
  },
  classificationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
  },
  legendBadge: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
  },
  badgeLabel: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  itemText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
  },
  transparencyFooter: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: 6,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  footerHeading: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  sourceLine: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  disclaimerText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  noVideoCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 180,
  },
  noVideoText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorVideoCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 180,
  },
  errorVideoTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorVideoDetail: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
});
