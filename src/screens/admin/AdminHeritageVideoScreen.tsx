import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { getMonuments } from '../../services/monumentService';
import { heritageVideoService, HeritageStoryData, StoryItem, StoryScene, getVideoUrl } from '../../services/heritageVideoService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface ApiMonument {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
}

interface StagedVideo {
  uri: string;
  name: string;
  type: string;
  size?: number;
  duration?: number;
}

export const AdminHeritageVideoScreen: React.FC = () => {
  const [monuments, setMonuments] = useState<ApiMonument[]>([]);
  const [selectedMonumentId, setSelectedMonumentId] = useState<string>('');
  const [story, setStory] = useState<HeritageStoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [sourceUrlInput, setSourceUrlInput] = useState<string>('');

  // Video Upload State
  const [directVideoUrlInput, setDirectVideoUrlInput] = useState<string>('');
  const [stagedGalleryVideo, setStagedGalleryVideo] = useState<StagedVideo | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);

  useEffect(() => {
    loadMonuments();
  }, []);

  useEffect(() => {
    if (selectedMonumentId) {
      loadAdminStory(selectedMonumentId);
      setStagedGalleryVideo(null);
      setDirectVideoUrlInput('');
    }
  }, [selectedMonumentId]);

  const loadMonuments = async () => {
    try {
      const res = await getMonuments();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      const mapped = list.map((m: any) => ({
        _id: m._id || m.id || '',
        id: m.id || m._id || '',
        name: m.name,
        slug: m.slug
      }));
      setMonuments(mapped);
      if (mapped.length > 0) {
        setSelectedMonumentId(mapped[0]._id || mapped[0].id || '');
      }
    } catch (err) {
      console.error('[ADMIN STORY] Failed to load monuments:', err);
    }
  };

  const loadAdminStory = async (monumentId: string) => {
    setLoading(true);
    try {
      const data = await heritageVideoService.getAdminStory(monumentId, 'en');
      setStory(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load story draft');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractFromSource = async () => {
    if (!sourceUrlInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid trusted source URL.');
      return;
    }
    setActionLoading(true);
    try {
      const data = await heritageVideoService.generateStoryFromSource(selectedMonumentId, sourceUrlInput.trim());
      setStory(data);
      setSourceUrlInput('');
      Alert.alert('Success', 'AI structured story extracted from trusted source.');
    } catch (err: any) {
      Alert.alert('Extraction Failed', err.response?.data?.error || err.message || 'Failed to extract story.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedMonumentId) return;
    setActionLoading(true);
    try {
      const data = await heritageVideoService.generateScript(selectedMonumentId);
      setStory(data);
      Alert.alert('Success', 'Cinematic narration script and 9-scene storyboard generated.');
    } catch (err: any) {
      Alert.alert('Script Generation Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateMedia = async () => {
    if (!selectedMonumentId) return;
    setActionLoading(true);
    try {
      const data = await heritageVideoService.generateMedia(selectedMonumentId);
      setStory(data);
      Alert.alert('Success', 'Media processing started. Video asset reference attached.');
    } catch (err: any) {
      Alert.alert('Media Generation Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Option A — Add Direct Video URL Handler
  const handleAddDirectVideoUrl = async () => {
    const url = directVideoUrlInput.trim();
    if (!url) {
      Alert.alert('Validation Error', 'Please enter a video URL.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid HTTP or HTTPS video URL.');
      return;
    }
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com/watch') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
      Alert.alert(
        'Unsupported Video Format',
        'YouTube or webpage links are not directly playable. Please provide a direct video stream URL (e.g. ending in .mp4 or .mov).'
      );
      return;
    }

    setActionLoading(true);
    try {
      const updated = await heritageVideoService.updateAdminStory(selectedMonumentId, { videoUrl: url }, 'en');
      setStory(updated);
      setDirectVideoUrlInput('');
      Alert.alert('Success', 'Direct video URL saved successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Failed to save video URL.');
    } finally {
      setActionLoading(false);
    }
  };

  // Option B — Add From Gallery Handler
  const handlePickVideoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Video gallery permission is required to select a video.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || asset.uri.split('/').pop() || `video-${Date.now()}.mp4`;
      const mimeType = asset.mimeType || (fileName.endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
      const fileSize = asset.fileSize;

      if (fileSize && fileSize > 100 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Video must be 100 MB or smaller.');
        return;
      }

      setStagedGalleryVideo({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
        size: fileSize,
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
      });
    } catch (err: any) {
      Alert.alert('Selection Error', err.message || 'Failed to select video from gallery.');
    }
  };

  // Option B — Execute Multipart Video Upload
  const handleUploadGalleryVideo = async () => {
    if (!stagedGalleryVideo || !selectedMonumentId) return;

    if (stagedGalleryVideo.size && stagedGalleryVideo.size > 100 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Video must be 100 MB or smaller.');
      return;
    }

    setIsUploadingVideo(true);
    setActionLoading(true);
    try {
      const updated = await heritageVideoService.uploadVideoFile(selectedMonumentId, stagedGalleryVideo, 'en');
      setStory(updated);
      setStagedGalleryVideo(null);
      Alert.alert('Success', 'Video uploaded successfully!');
    } catch (err: any) {
      const errMsg = err.responseBody?.error || err.message || 'Video upload failed. Please try again.';
      Alert.alert('Upload Failed', errMsg);
    } finally {
      setIsUploadingVideo(false);
      setActionLoading(false);
    }
  };

  // Remove Active Video
  const handleRemoveVideo = async () => {
    if (!selectedMonumentId) return;
    setActionLoading(true);
    try {
      const updated = await heritageVideoService.updateAdminStory(selectedMonumentId, { videoUrl: '' }, 'en');
      setStory(updated);
      Alert.alert('Removed', 'Video URL removed from story draft.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove video.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!story || !selectedMonumentId) return;
    setActionLoading(true);
    try {
      const updated = await heritageVideoService.updateAdminStory(selectedMonumentId, story, 'en');
      setStory(updated);
      Alert.alert('Saved', 'Story draft saved to MongoDB successfully.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedMonumentId) return;
    setActionLoading(true);
    try {
      const published = await heritageVideoService.publishStory(selectedMonumentId);
      setStory(published);
      Alert.alert('Published!', 'Heritage story published successfully. Tamil & Hindi background translations triggered.');
    } catch (err: any) {
      const errors = err.response?.data?.validationErrors || [err.message];
      Alert.alert('Publish Rejected', errors.join('\n• '));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedMonumentId) return;
    setActionLoading(true);
    try {
      await heritageVideoService.unpublishStory(selectedMonumentId);
      await loadAdminStory(selectedMonumentId);
      Alert.alert('Unpublished', 'Story set to UNPUBLISHED and hidden from normal users.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderPreviewVideoHtml = (videoUrl: string) => {
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
        <video controls playsinline preload="metadata">
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
      </body>
      </html>
    `;
  };

  return (
    <AdminLayout activeSection="video" title="AI Heritage Stories">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎬 AI Heritage Stories Management</Text>
          <Text style={styles.subtitle}>
            Source-backed, AI-scripted, admin-reviewed cinematic stories for HERIXA monuments.
          </Text>
        </View>

        {/* Monument Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Select Heritage Monument</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            {monuments.map(m => {
              const mId = m._id || m.id || '';
              const isSelected = mId === selectedMonumentId;
              return (
                <TouchableOpacity
                  key={mId}
                  style={[styles.monumentChip, isSelected && styles.monumentChipSelected]}
                  onPress={() => setSelectedMonumentId(mId)}
                >
                  <Text style={[styles.monumentChipText, isSelected && styles.monumentChipTextSelected]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Loading Monument Story Data...</Text>
          </View>
        ) : (
          <>
            {/* Status & Version Card */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Story Status & Lifecycle</Text>
                <View style={[styles.statusBadge, story?.status === 'PUBLISHED' ? styles.publishedBadge : styles.draftBadge]}>
                  <Text style={styles.statusBadgeText}>{story?.status || 'DRAFT'}</Text>
                </View>
              </View>
              <Text style={styles.infoText}>
                Version: {story?.storyVersion || 1} • Total Duration: {story?.duration ? `${Math.ceil(story.duration / 60)} mins` : 'N/A'}
              </Text>
              {story?.errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>Processing Failure: {story.errorMessage}</Text>
                </View>
              )}
            </View>

            {/* 2. Source-First AI Extraction */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>2. Source URL & AI Research</Text>
              <Text style={styles.infoText}>
                Enter official archaeological or tourism URL to extract verified historical facts & legend lore via Gemini.
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://asi.nic.in/monuments/temple-guidance"
                  placeholderTextColor="#888"
                  value={sourceUrlInput}
                  onChangeText={setSourceUrlInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.actionBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleExtractFromSource}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.actionBtnText}>Fetch & Extract</Text>}
                </TouchableOpacity>
              </View>

              {story?.sources && story.sources.length > 0 && (
                <View style={styles.sourcesList}>
                  <Text style={styles.subHeading}>Associated Sources:</Text>
                  {story.sources.map((s, idx) => (
                    <Text key={idx} style={styles.sourceItemText}>
                      • {s.title} ({s.organization}) — {s.url}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* 3. Story Content Editor */}
            {story && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>3. Story Overview & Facts Review</Text>
                
                <Text style={styles.fieldLabel}>Story Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={story.title}
                  onChangeText={t => setStory({ ...story, title: t })}
                />

                <Text style={styles.fieldLabel}>Short Introduction</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  multiline
                  value={story.shortIntroduction}
                  onChangeText={t => setStory({ ...story, shortIntroduction: t })}
                />

                <Text style={styles.subHeading}>Key Sections Summary:</Text>
                <View style={styles.sectionPillGrid}>
                  <Text style={styles.sectionPill}>Historical Background: {(story.sections?.historicalBackground || []).length} items</Text>
                  <Text style={styles.sectionPill}>Architecture: {(story.sections?.architecture || []).length} items</Text>
                  <Text style={styles.sectionPill}>Stories & Legends: {(story.sections?.storiesAndLegends || []).length} items</Text>
                </View>
              </View>
            )}

            {/* 4. Narration Script & Scene Storyboard */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>4. Narration Script & 9-Scene Storyboard</Text>
              <TouchableOpacity
                style={[styles.actionBtnSecondary, actionLoading && styles.btnDisabled]}
                onPress={handleGenerateScript}
                disabled={actionLoading}
              >
                <Feather name="file-text" size={16} color={COLORS.gold} />
                <Text style={styles.actionBtnSecondaryText}>Generate Narration Script & Scenes</Text>
              </TouchableOpacity>

              {story?.scenes && story.scenes.length > 0 && (
                <View style={styles.scenesContainer}>
                  {story.scenes.map((sc, idx) => (
                    <View key={idx} style={styles.sceneBox}>
                      <Text style={styles.sceneTitleText}>SCENE {sc.sceneNumber}: {sc.title} ({sc.duration}s)</Text>
                      <Text style={styles.sceneNarrationText}>"{sc.narration}"</Text>
                      <Text style={styles.sceneVisualText}>🎥 {sc.visualDescription}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 5. Heritage Video Management (Upload & URL) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>5. Heritage Video Management</Text>
              <Text style={styles.infoText}>
                Attach a direct playable video URL or upload a real heritage video from phone gallery.
              </Text>

              {/* Option A — Add Video URL */}
              <View style={styles.uploadOptionBox}>
                <View style={styles.optionHeader}>
                  <Feather name="link" size={16} color={COLORS.gold} />
                  <Text style={styles.optionTitle}>Option A — Add Video URL</Text>
                </View>
                <Text style={styles.optionSubtext}>
                  Paste a direct video file link (HTTP/HTTPS MP4 or MOV stream):
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.urlInput}
                    placeholder="https://example.com/heritage-video.mp4"
                    placeholderTextColor="#888"
                    value={directVideoUrlInput}
                    onChangeText={setDirectVideoUrlInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.actionBtn, actionLoading && styles.btnDisabled]}
                    onPress={handleAddDirectVideoUrl}
                    disabled={actionLoading}
                  >
                    <Text style={styles.actionBtnText}>Add Video</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Option B — Add From Gallery */}
              <View style={styles.uploadOptionBox}>
                <View style={styles.optionHeader}>
                  <Feather name="folder" size={16} color={COLORS.gold} />
                  <Text style={styles.optionTitle}>Option B — Add From Gallery</Text>
                </View>
                <Text style={styles.optionSubtext}>
                  Select a video file (MP4, MOV) directly from your device media gallery:
                </Text>

                {!stagedGalleryVideo ? (
                  <TouchableOpacity
                    style={[styles.galleryPickerBtn, actionLoading && styles.btnDisabled]}
                    onPress={handlePickVideoFromGallery}
                    disabled={actionLoading}
                  >
                    <Feather name="plus-circle" size={18} color={COLORS.gold} />
                    <Text style={styles.galleryPickerBtnText}>＋ Add from Gallery</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.stagedVideoBox}>
                    <View style={styles.stagedHeader}>
                      <Feather name="film" size={18} color={COLORS.gold} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stagedFileName} numberOfLines={1}>
                          {stagedGalleryVideo.name}
                        </Text>
                        <Text style={styles.stagedFileMeta}>
                          {stagedGalleryVideo.size ? `${(stagedGalleryVideo.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                          {stagedGalleryVideo.duration ? ` • ${stagedGalleryVideo.duration}s` : ''}
                          {stagedGalleryVideo.type ? ` • ${stagedGalleryVideo.type}` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Staged Video Local Preview */}
                    <View style={styles.videoPlayerWrapper}>
                      <WebView
                        originWhitelist={['*']}
                        source={{ html: renderPreviewVideoHtml(stagedGalleryVideo.uri) }}
                        style={styles.webViewPlayer}
                        allowsInlineMediaPlayback
                      />
                    </View>

                    <View style={styles.stagedActionRow}>
                      <TouchableOpacity
                        style={[styles.uploadConfirmBtn, isUploadingVideo && styles.btnDisabled]}
                        onPress={handleUploadGalleryVideo}
                        disabled={isUploadingVideo}
                      >
                        {isUploadingVideo ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.uploadConfirmBtnText}>Uploading video...</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name="upload-cloud" size={16} color="#FFFFFF" />
                            <Text style={styles.uploadConfirmBtnText}>Upload Video</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cancelStagedBtn}
                        onPress={() => setStagedGalleryVideo(null)}
                        disabled={isUploadingVideo}
                      >
                        <Text style={styles.cancelStagedBtnText}>Remove Selection</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Saved Video Preview & State */}
              {story?.videoUrl ? (
                <View style={styles.savedVideoBox}>
                  <View style={styles.optionHeader}>
                    <Feather name="check-circle" size={16} color="#16A34A" />
                    <Text style={styles.savedVideoTitle}>Active Heritage Video</Text>
                  </View>
                  <Text style={styles.savedVideoUrlText} numberOfLines={2}>
                    {getVideoUrl(story.videoUrl)}
                  </Text>

                  <View style={styles.videoPlayerWrapper}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: renderPreviewVideoHtml(getVideoUrl(story.videoUrl)) }}
                      style={styles.webViewPlayer}
                      allowsInlineMediaPlayback
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.removeVideoBtn}
                    onPress={handleRemoveVideo}
                    disabled={actionLoading}
                  >
                    <Feather name="trash-2" size={14} color="#DC2626" />
                    <Text style={styles.removeVideoBtnText}>Remove Saved Video</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* AI Auto Generation fallback trigger */}
              <TouchableOpacity
                style={[styles.actionBtnSecondary, actionLoading && styles.btnDisabled, { marginTop: 8 }]}
                onPress={handleGenerateMedia}
                disabled={actionLoading}
              >
                <Feather name="film" size={16} color={COLORS.gold} />
                <Text style={styles.actionBtnSecondaryText}>Generate Synthetic AI Video Reference</Text>
              </TouchableOpacity>
            </View>

            {/* 6. Admin Actions & Publish */}
            <View style={styles.actionCard}>
              <TouchableOpacity style={styles.saveDraftBtn} onPress={handleSaveDraft} disabled={actionLoading}>
                <Text style={styles.saveDraftBtnText}>Save Draft</Text>
              </TouchableOpacity>

              {story?.status === 'PUBLISHED' ? (
                <TouchableOpacity style={styles.unpublishBtn} onPress={handleUnpublish} disabled={actionLoading}>
                  <Text style={styles.unpublishBtnText}>Unpublish Story</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={actionLoading}>
                  <Text style={styles.publishBtnText}>Publish Story</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: SPACING.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  monumentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    marginRight: 8,
  },
  monumentChipSelected: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  monumentChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  monumentChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingBox: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  publishedBadge: {
    backgroundColor: 'rgba(21, 128, 61, 0.12)',
  },
  draftBadge: {
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
  },
  statusBadgeText: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xs,
  },
  actionBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    borderColor: COLORS.gold,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionBtnSecondaryText: {
    color: COLORS.gold,
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  sourcesList: {
    marginTop: 6,
    gap: 2,
  },
  subHeading: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  sourceItemText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: 10,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xs,
  },
  sectionPillGrid: {
    gap: 4,
  },
  sectionPill: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  scenesContainer: {
    gap: 8,
    marginTop: 8,
  },
  sceneBox: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: 2,
  },
  sceneTitleText: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  sceneNarrationText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  sceneVisualText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },

  // Video Management Styles
  uploadOptionBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  optionSubtext: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  galleryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.sm,
  },
  galleryPickerBtnText: {
    color: COLORS.gold,
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  stagedVideoBox: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    gap: 8,
  },
  stagedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stagedFileName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  stagedFileMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  videoPlayerWrapper: {
    height: 180,
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webViewPlayer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  stagedActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  uploadConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  cancelStagedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  cancelStagedBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: FONT_SIZE.xs,
  },
  savedVideoBox: {
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
    borderColor: 'rgba(22, 163, 74, 0.25)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    gap: 8,
    marginTop: 4,
  },
  savedVideoTitle: {
    color: '#16A34A',
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  savedVideoUrlText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  removeVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  removeVideoBtnText: {
    color: '#DC2626',
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },

  actionCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  saveDraftBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  saveDraftBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  publishBtn: {
    flex: 1,
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
  unpublishBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  unpublishBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: FONT_SIZE.xs,
  },
});
