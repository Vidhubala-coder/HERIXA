import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFavorites } from '../../context/FavoritesContext';
import { getMonuments, getImageUrl, uploadMonumentVisuals, deleteMonumentVisual, getMonumentVisuals } from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { SafeImage } from '../../components/SafeImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = SCREEN_WIDTH >= 768 ? 4 : 2;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 3) / GRID_COLUMNS;

export const HeritageVisualsAdminScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken } = useFavorites();
  const [monuments, setMonuments] = useState<any[]>([]);
  const [selectedMonumentId, setSelectedMonumentId] = useState<string>('');
  const [selectedMonument, setSelectedMonument] = useState<any>(null);
  const [visuals, setVisuals] = useState<any[]>([]);
  
  const [isLoadingMonuments, setIsLoadingMonuments] = useState(true);
  const [isLoadingVisuals, setIsLoadingVisuals] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Monument Selector Modal
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Selected Images Previews for Upload
  const [stagedImages, setStagedImages] = useState<string[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  // Full Image Preview Modal
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  // 1. Fetch All Monuments
  const loadMonuments = useCallback(async () => {
    try {
      setIsLoadingMonuments(true);
      const res = await getMonuments();
      const docs = res.data || [];
      setMonuments(docs);
      if (docs.length > 0 && !selectedMonumentId) {
        setSelectedMonumentId(docs[0]._id || docs[0].id);
        setSelectedMonument(docs[0]);
      }
    } catch (e) {
      console.warn('[HeritageVisualsAdmin] loadMonuments error:', e);
    } finally {
      setIsLoadingMonuments(false);
    }
  }, [selectedMonumentId]);

  // 2. Fetch Visuals for Selected Monument
  const loadVisuals = useCallback(async (mId: string) => {
    if (!mId) return;
    try {
      setIsLoadingVisuals(true);
      const res = await getMonumentVisuals(mId, authToken || undefined);
      if (res.success && res.data) {
        setVisuals(res.data);
      }
    } catch (e) {
      console.warn('[HeritageVisualsAdmin] loadVisuals error:', e);
    } finally {
      setIsLoadingVisuals(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadMonuments();
  }, []);

  useEffect(() => {
    if (selectedMonumentId) {
      const found = monuments.find(m => (m._id || m.id) === selectedMonumentId);
      if (found) setSelectedMonument(found);
      loadVisuals(selectedMonumentId);
    }
  }, [selectedMonumentId, monuments, loadVisuals]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMonuments();
    if (selectedMonumentId) {
      await loadVisuals(selectedMonumentId);
    }
    setIsRefreshing(false);
  };

  // 3. Multi-Image Selection Handler
  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library access is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(a => a.uri).filter(Boolean);
        setStagedImages(prev => [...prev, ...uris]);
        setPreviewModalVisible(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to select images.');
    }
  };

  // 4. Batch Upload Executer
  const executeBatchUpload = async () => {
    if (!authToken || !selectedMonumentId || stagedImages.length === 0) return;
    try {
      setIsUploading(true);
      const res = await uploadMonumentVisuals(selectedMonumentId, stagedImages, authToken);
      if (res && res.success) {
        Alert.alert('Upload Successful', `${stagedImages.length} heritage visual(s) added to ${selectedMonument?.name || 'monument'}.`);
        setStagedImages([]);
        setPreviewModalVisible(false);
        await loadVisuals(selectedMonumentId);
      } else {
        Alert.alert('Upload Error', res?.message || 'Failed to upload images.');
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Network error during visual upload.');
    } finally {
      setIsUploading(false);
    }
  };

  // 5. Delete Visual Handler
  const handleDeleteVisual = (visualId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this heritage visual?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!authToken || !selectedMonumentId) return;
            try {
              const res = await deleteMonumentVisual(selectedMonumentId, visualId, authToken);
              if (res && res.success) {
                Alert.alert('Deleted', 'Heritage visual removed successfully.');
                await loadVisuals(selectedMonumentId);
              } else {
                Alert.alert('Error', res?.message || 'Failed to delete visual.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete visual.');
            }
          }
        }
      ]
    );
  };

  return (
    <AdminLayout navigation={navigation} activeSection="visuals" title="Heritage Visuals Management">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
        }
      >
        {/* Monument Selection & Controls Header */}
        <View style={styles.headerCard}>
          <Text style={styles.cardSectionTitle}>SELECT HERITAGE MONUMENT</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            onPress={() => setSelectorVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.selectorLeft}>
              <Feather name="map-pin" size={18} color={COLORS.gold} />
              <Text style={styles.selectorTitle} numberOfLines={1}>
                {selectedMonument?.name || 'Select a Monument'}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <View style={styles.badgeCol}>
              <StatusBadge
                status="active"
                label={`${visuals.length} Visual(s) Uploaded`}
                dot
              />
            </View>

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickImages}
              disabled={isUploading || !selectedMonumentId}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#141412" />
              ) : (
                <>
                  <Feather name="plus-circle" size={16} color="#141412" />
                  <Text style={styles.uploadBtnText}>+ Add Visuals</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing Visuals Gallery Grid */}
        {isLoadingVisuals ? (
          <ActivityIndicator size="large" color={COLORS.gold} style={{ marginVertical: SPACING.xl }} />
        ) : visuals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="image" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Heritage Visuals Uploaded</Text>
            <Text style={styles.emptySub}>
              Tap '+ Add Visuals' to upload historical and architectural photos for {selectedMonument?.name || 'this monument'}.
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {visuals.map((item, idx) => {
              const imgUrl = getImageUrl(item.uri || item.imageUrl);
              return (
                <View key={item._id || idx} style={styles.visualCard}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setPreviewImageUri(imgUrl)}
                    style={styles.cardImageContainer}
                  >
                    <SafeImage source={{ uri: imgUrl }} style={styles.cardImage} resizeMode="cover" />
                    <View style={styles.imageOverlayBadge}>
                      <Text style={styles.imageIndexText}>#{idx + 1}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.cardFooter}>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.visualTitle} numberOfLines={1}>
                        {item.title || `Visual ${idx + 1}`}
                      </Text>
                      {!!item.caption && (
                        <Text style={styles.visualCaption} numberOfLines={1}>
                          {item.caption}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteVisual(item._id)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={14} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Monument Selector Modal */}
        <Modal visible={selectorVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Monument</Text>
                <TouchableOpacity onPress={() => setSelectorVisible(false)}>
                  <Feather name="x" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 350 }}>
                {monuments.map(m => {
                  const mId = m._id || m.id;
                  const isSelected = mId === selectedMonumentId;
                  return (
                    <TouchableOpacity
                      key={mId}
                      style={[styles.monumentOption, isSelected && styles.monumentOptionActive]}
                      onPress={() => {
                        setSelectedMonumentId(mId);
                        setSelectedMonument(m);
                        setSelectorVisible(false);
                      }}
                    >
                      <Feather
                        name={isSelected ? 'check-circle' : 'map-pin'}
                        size={16}
                        color={isSelected ? COLORS.gold : COLORS.textSecondary}
                      />
                      <Text style={[styles.monumentOptionText, isSelected && { color: COLORS.gold }]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Staged Batch Upload Preview Modal */}
        <Modal visible={previewModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Previews ({stagedImages.length})</Text>
                <TouchableOpacity onPress={() => { setStagedImages([]); setPreviewModalVisible(false); }}>
                  <Feather name="x" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.stagedSubText}>
                The following images will be uploaded to {selectedMonument?.name}:
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: SPACING.md }}>
                {stagedImages.map((uri, idx) => (
                  <View key={idx} style={styles.stagedThumbContainer}>
                    <Image source={{ uri }} style={styles.stagedThumb} />
                    <TouchableOpacity
                      style={styles.removeThumbBtn}
                      onPress={() => setStagedImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Feather name="x" size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => { setStagedImages([]); setPreviewModalVisible(false); }}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmUploadBtn}
                  onPress={executeBatchUpload}
                  disabled={isUploading || stagedImages.length === 0}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#141412" />
                  ) : (
                    <Text style={styles.confirmUploadText}>Upload {stagedImages.length} Image(s)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Full Image Preview Modal */}
        <Modal visible={!!previewImageUri} animationType="fade" transparent>
          <View style={styles.fullViewerOverlay}>
            <TouchableOpacity style={styles.fullViewerCloseBtn} onPress={() => setPreviewImageUri(null)}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
            {!!previewImageUri && (
              <Image source={{ uri: previewImageUri }} style={styles.fullViewerImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  headerCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardSectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  selectorTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  badgeCol: { flex: 1 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  uploadBtnText: { color: '#141412', fontSize: 13, fontWeight: '800' },
  emptyCard: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 300 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  visualCard: {
    width: CARD_WIDTH,
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  cardImageContainer: { width: '100%', height: 140, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  imageOverlayBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  imageIndexText: { color: COLORS.gold, fontSize: 10, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.sm,
  },
  cardTextCol: { flex: 1, gap: 2 },
  visualTitle: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  visualCaption: { color: COLORS.textSecondary, fontSize: 10 },
  deleteBtn: {
    padding: 6, borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.md,
  },
  modalContent: {
    width: '100%', maxWidth: 450, backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.md, gap: SPACING.sm,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  monumentOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  monumentOptionActive: { backgroundColor: 'rgba(212, 175, 55, 0.08)' },
  monumentOptionText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  stagedSubText: { color: COLORS.textSecondary, fontSize: 12 },
  stagedThumbContainer: { position: 'relative', marginRight: SPACING.xs },
  stagedThumb: { width: 80, height: 80, borderRadius: BORDER_RADIUS.md },
  removeThumbBtn: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E74C3C', justifyContent: 'center', alignItems: 'center',
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelModalBtn: { paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  cancelModalText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  confirmUploadBtn: { paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.gold },
  confirmUploadText: { color: '#141412', fontSize: 12, fontWeight: '800' },

  // Full Viewer Overlay
  fullViewerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  fullViewerCloseBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 8 },
  fullViewerImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.8 },
});
