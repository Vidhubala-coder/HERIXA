import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Switch, Modal, FlatList, Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFavorites } from '../../context/FavoritesContext';
import {
  getMonumentById,
  updateMonumentDetails,
  getImageUrl,
  addHeritageView,
  editHeritageView,
  deleteHeritageView,
  updateVisualizationConfig,
  reorderHeritageViews
} from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { SafeImage } from '../../components/SafeImage';

const TABS = ['Overview', 'Heritage', 'Architecture', 'Media', 'AI', 'Visuals', 'Tourism', 'Activity'];

const VIEW_TYPES = [
  'Exterior',
  'Entrance',
  'Gopuram',
  'Vimana',
  'Mandapam',
  'Sculptures',
  'Inscriptions',
  'Interior',
  'Courtyard',
  'Architecture',
  'Historical View',
  'Cultural Detail',
  'Other'
];

export const HeritageDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { monumentId } = route.params;
  const { authToken } = useFavorites();
  const [monument, setMonument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // ─── Heritage Visualization States ──────────────────────────────────────────
  const [visModalVisible, setVisModalVisible] = useState(false);
  const [editingImage, setEditingImage] = useState<any>(null);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [viewType, setViewType] = useState('Front View');
  const [viewTitle, setViewTitle] = useState('');
  const [viewDesc, setViewDesc] = useState('');
  const [viewOrder, setViewOrder] = useState('0');
  const [viewEnabled, setViewEnabled] = useState(true);
  const [setAsCover, setSetAsCover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await getMonumentById(monumentId);
        setMonument(res);
        setEditName(res.name || '');
        setEditDesc(res.description || '');
      } catch (e) {
        console.warn('[HeritageDetail] load error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [monumentId]);

  const handleSave = async () => {
    if (!authToken || !monument) return;
    setIsSaving(true);
    try {
      await updateMonumentDetails(monument._id || monument.id, { name: editName, description: editDesc }, authToken);
      setMonument((prev: any) => ({ ...prev, name: editName, description: editDesc }));
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Pick Image ────────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library access is required to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  // ─── Save Heritage View ───────────────────────────────────────────────────
  const handleSaveVisualization = async () => {
    if (!pickedImageUri && !editingImage) {
      Alert.alert('Error', 'Please select an image first.');
      return;
    }
    if (!viewTitle.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    if (!authToken) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      if (pickedImageUri) {
        const uriParts = pickedImageUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || 'heritage_view.jpg';
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        let mimeType = 'image/jpeg';
        if (fileExt === 'png') mimeType = 'image/png';
        else if (fileExt === 'webp') mimeType = 'image/webp';

        const cleanUri = Platform.OS === 'android' ? pickedImageUri : pickedImageUri.replace('file://', '');

        formData.append('image', {
          uri: cleanUri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      formData.append('viewType', viewType);
      formData.append('category', viewType);
      formData.append('title', viewTitle.trim());
      formData.append('description', viewDesc.trim());
      formData.append('caption', viewDesc.trim());
      formData.append('order', viewOrder);
      formData.append('displayOrder', viewOrder);
      formData.append('enabled', viewEnabled ? 'true' : 'false');
      formData.append('visible', viewEnabled ? 'true' : 'false');
      formData.append('setAsCover', setAsCover ? 'true' : 'false');

      let res;
      if (editingImage) {
        res = await editHeritageView(monument._id || monument.id, editingImage._id || editingImage.id, formData, authToken);
      } else {
        res = await addHeritageView(monument._id || monument.id, formData, authToken);
      }

      if (res.success && res.data) {
        setMonument(res.data);
        setVisModalVisible(false);
        resetVisForm();
        Alert.alert('Success', editingImage ? 'Heritage image updated successfully.' : 'Heritage image uploaded successfully.');
      } else {
        console.error('[Heritage Image Upload Failed]', res);
        Alert.alert('Image upload failed', res.message || 'Please check the image format and try again.');
      }
    } catch (e: any) {
      console.error('[Heritage Image Upload Exception]', e);
      Alert.alert('Image upload failed', e.message || 'Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetVisForm = () => {
    setEditingImage(null);
    setPickedImageUri(null);
    setViewType('Front View');
    setViewTitle('');
    setViewDesc('');
    setViewOrder('0');
    setViewEnabled(true);
    setSetAsCover(false);
  };

  const handleEditClick = (img: any) => {
    setEditingImage(img);
    setPickedImageUri(null);
    setViewType(img.viewType || 'Front View');
    setViewTitle(img.title || '');
    setViewDesc(img.description || '');
    setViewOrder(String(img.order || 0));
    setViewEnabled(img.enabled !== false);
    setSetAsCover(monument.coverImageUrl === img.uri);
    setVisModalVisible(true);
  };

  // ─── Delete Heritage View ─────────────────────────────────────────────────
  const handleDeleteClick = (imageId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this heritage view image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!authToken) return;
            try {
              const res = await deleteHeritageView(monument._id || monument.id, imageId, authToken);
              if (res.success && res.data) {
                setMonument(res.data);
                Alert.alert('Deleted', 'Heritage view deleted successfully.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete view.');
            }
          }
        }
      ]
    );
  };

  // ─── Set Cover Directly ───────────────────────────────────────────────────
  const handleSetCoverDirect = async (imgUri: string) => {
    if (!authToken) return;
    try {
      const res = await updateVisualizationConfig(monument._id || monument.id, { coverImageUrl: imgUri }, authToken);
      if (res.success && res.data) {
        setMonument(res.data);
        Alert.alert('Success', 'Cover image updated.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to set cover image.');
    }
  };

  // ─── Toggle Interactive Heritage Preview ─────────────────────────────────
  const handleToggleInteractive = async (enabled: boolean) => {
    if (!authToken) return;
    try {
      const res = await updateVisualizationConfig(monument._id || monument.id, { interactivePreviewEnabled: enabled }, authToken);
      if (res.success && res.data) {
        setMonument(res.data);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update interactive preview status.');
    }
  };

  // ─── Reordering ────────────────────────────────────────────────────────────
  const handleMoveImage = async (index: number, direction: 'up' | 'down') => {
    if (!monument.heritagePreviewImages) return;
    const images = [...monument.heritagePreviewImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const temp = images[index];
    images[index] = images[targetIndex];
    images[targetIndex] = temp;

    const orderedIds = images.map((img: any) => img._id || img.id);
    try {
      const res = await reorderHeritageViews(monument._id || monument.id, orderedIds, authToken!);
      if (res.success && res.data) {
        setMonument(res.data);
      }
    } catch (e) {
      console.warn('Reorder failed:', e);
    }
  };

  // ─── Render Tab Content ───────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return (
        <View style={styles.tabContent}>
          {isEditing ? (
            <>
              <FieldRow label="Name">
                <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} />
              </FieldRow>
              <FieldRow label="Description">
                <TextInput style={[styles.editInput, { height: 88 }]} value={editDesc} onChangeText={setEditDesc} multiline textAlignVertical="top" />
              </FieldRow>
            </>
          ) : (
            <>
              <InfoRow label="Name" value={monument.name} />
              <InfoRow label="Description" value={monument.description} />
              <InfoRow label="Category" value={monument.category} />
              <InfoRow label="Period" value={monument.period || monument.historicalPeriod} />
              <InfoRow label="Dynasty" value={monument.dynasty} />
              <InfoRow label="State" value={monument.state} />
              <InfoRow label="District" value={monument.district} />
              <InfoRow label="UNESCO" value={monument.isUNESCOHeritageSite ? 'Yes' : 'No'} />
            </>
          )}
        </View>
      );
      case 1: return (
        <View style={styles.tabContent}>
          <InfoRow label="History" value={monument.history} />
          <InfoRow label="Historical Importance" value={monument.historicalImportance} />
          <InfoRow label="Cultural Significance" value={monument.culturalSignificance} />
          <InfoRow label="Preservation" value={monument.preservation} />
        </View>
      );
      case 2: return (
        <View style={styles.tabContent}>
          <InfoRow label="Architectural Style" value={monument.architecturalStyle} />
          <InfoRow label="Construction Period" value={monument.constructionPeriod} />
          <InfoRow label="Materials" value={Array.isArray(monument.materials) ? monument.materials.join(', ') : monument.materials} />
          <InfoRow label="Key Features" value={Array.isArray(monument.keyArchitecturalFeatures) ? monument.keyArchitecturalFeatures.join('\n') : undefined} />
        </View>
      );
      
      // ── Media / Heritage Visualization Manager ──
      case 3: {
        const coverUrl = monument.coverImageUrl
          ? getImageUrl(monument.coverImageUrl)
          : monument.images?.[0]
            ? getImageUrl(monument.images[0])
            : null;

        const has3DModel = !!(monument.modelUrl && monument.modelUrl.trim());
        const previewEnabled = monument.interactivePreviewEnabled !== false;

        return (
          <View style={styles.tabContent}>
            {/* Status Panel */}
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Visualization Status</Text>
              
              <View style={styles.statusLine}>
                <Text style={styles.statusLabel}>Heritage Content:</Text>
                <Text style={[styles.statusVal, has3DModel ? styles.valActive : styles.valInactive]}>
                  {has3DModel ? '★ Available' : 'Images Only'}
                </Text>
              </View>

              <View style={styles.statusLine}>
                <Text style={styles.statusLabel}>Interactive Preview:</Text>
                <View style={styles.toggleWrapper}>
                  <Text style={[styles.statusVal, previewEnabled ? styles.valActive : styles.valInactive]}>
                    {previewEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                  <Switch
                    value={previewEnabled}
                    onValueChange={handleToggleInteractive}
                    trackColor={{ false: COLORS.border, true: COLORS.gold }}
                  />
                </View>
              </View>

              <View style={styles.statusLine}>
                <Text style={styles.statusLabel}>Heritage Views:</Text>
                <Text style={styles.statusVal}>{monument.heritagePreviewImages?.length || 0} views</Text>
              </View>

              {coverUrl && (
                <View style={styles.coverPreviewBox}>
                  <Text style={styles.statusLabel}>Cover Image:</Text>
                  <SafeImage source={{ uri: coverUrl }} style={styles.coverImg} resizeMode="cover" />
                </View>
              )}
            </View>

            {/* Actions Bar */}
            <View style={styles.actionsBar}>
              <Text style={styles.sectionTitle}>Heritage Views</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  resetVisForm();
                  setVisModalVisible(true);
                }}
              >
                <Feather name="plus" size={16} color={COLORS.background} />
                <Text style={styles.addBtnText}>ADD HERITAGE VIEW</Text>
              </TouchableOpacity>
            </View>

            {/* Views List Grid */}
            {!monument.heritagePreviewImages?.length ? (
              <View style={styles.emptyGrid}>
                <Feather name="image" size={32} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No visualization views uploaded yet.</Text>
              </View>
            ) : (
              <FlatList
                data={monument.heritagePreviewImages}
                keyExtractor={(img: any) => img._id || img.id}
                scrollEnabled={false}
                renderItem={({ item: img, index }: { item: any; index: number }) => {
                  const isCover = monument.coverImageUrl === img.uri;
                  return (
                    <View style={styles.gridItem}>
                      <SafeImage source={{ uri: getImageUrl(img.uri) }} style={styles.gridImg} resizeMode="cover" />
                      <View style={styles.gridDetails}>
                        <Text style={styles.gridTitle} numberOfLines={1}>{img.title}</Text>
                        <Text style={styles.gridType}>{img.viewType}</Text>
                        <View style={styles.gridInfoRow}>
                          <Text style={styles.gridOrder}>Order: {img.order}</Text>
                          <Text style={[styles.gridStatus, img.enabled !== false ? styles.statusActive : styles.statusInactive]}>
                            {img.enabled !== false ? '● Active' : '● Disabled'}
                          </Text>
                        </View>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.gridActions}>
                        <TouchableOpacity style={styles.gridActBtn} onPress={() => handleEditClick(img)}>
                          <Feather name="edit" size={13} color={COLORS.gold} />
                          <Text style={styles.gridActText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridActBtn} onPress={() => handleDeleteClick(img._id || img.id)}>
                          <Feather name="trash-2" size={13} color={COLORS.danger} />
                          <Text style={[styles.gridActText, { color: COLORS.danger }]}>Delete</Text>
                        </TouchableOpacity>

                        {!isCover && (
                          <TouchableOpacity style={styles.gridActBtn} onPress={() => handleSetCoverDirect(img.uri)}>
                            <Feather name="image" size={13} color={COLORS.textPrimary} />
                            <Text style={styles.gridActText}>Set Cover</Text>
                          </TouchableOpacity>
                        )}
                        {isCover && (
                          <View style={styles.coverBadge}>
                            <Text style={styles.coverBadgeText}>Cover</Text>
                          </View>
                        )}
                      </View>

                      {/* Reorder Buttons */}
                      <View style={styles.reorderArrows}>
                        <TouchableOpacity
                          disabled={index === 0}
                          onPress={() => handleMoveImage(index, 'up')}
                          style={[styles.arrowBtn, index === 0 && { opacity: 0.3 }]}
                        >
                          <Feather name="arrow-up" size={14} color={COLORS.gold} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={index === monument.heritagePreviewImages.length - 1}
                          onPress={() => handleMoveImage(index, 'down')}
                          style={[styles.arrowBtn, index === monument.heritagePreviewImages.length - 1 && { opacity: 0.3 }]}
                        >
                          <Feather name="arrow-down" size={14} color={COLORS.gold} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        );
      }

      case 4: return (
        <View style={styles.tabContent}>
          <InfoRow label="Recognition Class" value={monument.recognitionClass} />
          <InfoRow label="AI Confidence Threshold" value={monument.aiConfidenceThreshold?.toString()} />
          <InfoRow label="Dataset Images" value={`${monument.recognitionImages?.length ?? 0} images`} />
        </View>
      );
      case 5: return (
        <View style={styles.tabContent}>
          {/* Header Row */}
          <View style={styles.visTabHeader}>
            <View>
              <Text style={styles.visTabTitle}>Heritage Visuals</Text>
              <Text style={styles.visTabSub}>{monument.heritagePreviewImages?.length || 0} images configured</Text>
            </View>
            <TouchableOpacity
              style={styles.addVisBtn}
              onPress={() => { resetVisForm(); setVisModalVisible(true); }}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color={COLORS.background} />
              <Text style={styles.addVisBtnText}>Add Heritage Image</Text>
            </TouchableOpacity>
          </View>

          {/* Settings Summary */}
          <View style={styles.visConfigCard}>
            <View style={styles.visConfigRow}>
              <Text style={styles.visConfigLabel}>Cover Image</Text>
              <Text style={styles.visConfigVal}>{monument.coverImageUrl ? 'Configured' : 'Default'}</Text>
            </View>
            <View style={styles.visConfigRow}>
              <Text style={styles.visConfigLabel}>Interactive Preview</Text>
              <Text style={[styles.visConfigVal, { color: COLORS.gold }]}>
                {monument.interactivePreviewEnabled !== false ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {/* Visuals Image List */}
          {(!monument.heritagePreviewImages || monument.heritagePreviewImages.length === 0) ? (
            <View style={styles.emptyVisCard}>
              <Feather name="image" size={32} color={COLORS.textSecondary} />
              <Text style={styles.emptyVisTitle}>No Heritage Images Uploaded</Text>
              <Text style={styles.emptyVisSub}>Tap 'Add Heritage Image' to upload high quality views and details for this monument.</Text>
            </View>
          ) : (
            monument.heritagePreviewImages.map((img: any, idx: number) => {
              const isCover = monument.coverImageUrl === img.uri;
              return (
                <View key={img._id || img.id || idx} style={styles.visCard}>
                  <SafeImage
                    source={{ uri: getImageUrl(img.uri) }}
                    style={styles.visCardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.visCardBody}>
                    <View style={styles.visCardHeader}>
                      <Text style={styles.visCardTitle} numberOfLines={1}>
                        {img.title || img.category || img.viewType || `View #${idx + 1}`}
                      </Text>
                      {img.featured && <Feather name="star" size={14} color={COLORS.gold} />}
                    </View>
                    <Text style={styles.visCardCategory}>
                      {img.category || img.viewType || 'Exterior'}
                      {img.order !== undefined ? ` • Order: ${img.order}` : ''}
                    </Text>
                    {!!(img.description || img.caption) && (
                      <Text style={styles.visCardDesc} numberOfLines={2}>
                        {img.description || img.caption}
                      </Text>
                    )}
                    <View style={styles.visCardBadges}>
                      <StatusBadge
                        status={img.enabled !== false ? 'active' : 'draft'}
                        label={img.enabled !== false ? 'Visible' : 'Hidden'}
                      />
                      {isCover && <StatusBadge status="verified" label="Cover Image" />}
                    </View>

                    {/* Action Row */}
                    <View style={styles.visActionRow}>
                      {!isCover && (
                        <TouchableOpacity
                          style={styles.visActionBtn}
                          onPress={async () => {
                            if (!authToken) return;
                            try {
                              const res = await updateVisualizationConfig(
                                monument._id || monument.id,
                                { coverImageUrl: img.uri },
                                authToken
                              );
                              if (res.success && res.data) {
                                setMonument(res.data);
                                Alert.alert('Updated', 'Set as cover image successfully.');
                              }
                            } catch (e) {
                              Alert.alert('Error', 'Failed to update cover image.');
                            }
                          }}
                        >
                          <Feather name="bookmark" size={12} color={COLORS.gold} />
                          <Text style={styles.visActionText}>Set Cover</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.visActionBtn}
                        onPress={() => handleEditClick(img)}
                      >
                        <Feather name="edit-2" size={12} color={COLORS.textPrimary} />
                        <Text style={[styles.visActionText, { color: COLORS.textPrimary }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.visActionBtn, styles.visActionBtnDanger]}
                        onPress={() => handleDeleteClick(img._id || img.id)}
                      >
                        <Feather name="trash-2" size={12} color="#D45A5B" />
                        <Text style={[styles.visActionText, { color: '#D45A5B' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      );
      case 6: return (
        <View style={styles.tabContent}>
          <InfoRow label="Best Visiting Time" value={monument.visitingTime} />
          <InfoRow label="Accessibility" value={monument.accessibility} />
          <InfoRow label="Nearby Attractions" value={Array.isArray(monument.nearbyAttractions) ? monument.nearbyAttractions.join('\n') : monument.nearbyAttractions} />
        </View>
      );
      case 7: return (
        <View style={styles.tabContent}>
          <Text style={styles.infoLabel}>Monument ID</Text>
          <Text style={styles.monoText}>{monument._id || monument.id}</Text>
          <InfoRow label="Created At" value={monument.createdAt ? new Date(monument.createdAt).toLocaleString() : '—'} />
          <InfoRow label="Updated At" value={monument.updatedAt ? new Date(monument.updatedAt).toLocaleString() : '—'} />
        </View>
      );
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout navigation={navigation} activeSection="heritage" title="Heritage Detail">
        <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.gold} /></View>
      </AdminLayout>
    );
  }

  if (!monument) {
    return (
      <AdminLayout navigation={navigation} activeSection="heritage" title="Heritage Detail">
        <View style={styles.loader}><Text style={styles.errText}>Monument not found.</Text></View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout navigation={navigation} activeSection="heritage" title={monument.name}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.pageTitle} numberOfLines={1}>{monument.name}</Text>
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color={COLORS.background} /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Feather name="edit-2" size={14} color={COLORS.gold} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <StatusBadge
            status={(monument as any).status === 'draft' ? 'draft' : 'published'}
            dot
          />
          {monument.heritagePreviewImages?.length > 0 && <StatusBadge status="active" label={`${monument.heritagePreviewImages.length} Visuals`} dot />}
          {monument.isUNESCOHeritageSite && <StatusBadge status="verified" label="UNESCO" dot />}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderTabContent()}
        </ScrollView>

        {/* ─── ADD/EDIT VIEW MODAL ─── */}
        <Modal
          visible={visModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setVisModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingImage ? 'Edit Heritage View' : 'Add Heritage View'}
                </Text>
                <TouchableOpacity onPress={() => setVisModalVisible(false)}>
                  <Feather name="x" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {/* Image Picker */}
                <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickImage}>
                  {pickedImageUri || editingImage?.uri ? (
                    <SafeImage
                      source={{ uri: pickedImageUri || getImageUrl(editingImage?.uri) }}
                      style={styles.pickerImgPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.pickerPlaceholder}>
                      <Feather name="camera" size={24} color={COLORS.gold} />
                      <Text style={styles.pickerPlaceholderText}>Upload Image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* View Type Picker */}
                <Text style={styles.fieldLabel}>View Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeList}>
                  {VIEW_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, viewType === t && styles.typeBtnActive]}
                      onPress={() => setViewType(t)}
                    >
                      <Text style={[styles.typeBtnText, viewType === t && styles.typeBtnTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Fields */}
                <View style={styles.formGap}>
                  <View style={styles.modalField}>
                    <Text style={styles.fieldLabel}>View Title</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={viewTitle}
                      onChangeText={setViewTitle}
                      placeholder="e.g. Front Elevation"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.fieldLabel}>Short Description</Text>
                    <TextInput
                      style={[styles.modalInput, { height: 60 }]}
                      value={viewDesc}
                      onChangeText={setViewDesc}
                      placeholder="Brief details about the view..."
                      placeholderTextColor={COLORS.textSecondary}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.fieldLabel}>Display Order</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={viewOrder}
                      onChangeText={setViewOrder}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>

                  {/* Switch toggles */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active / Enabled</Text>
                    <Switch
                      value={viewEnabled}
                      onValueChange={setViewEnabled}
                      trackColor={{ false: COLORS.border, true: COLORS.gold }}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Set as Cover Image</Text>
                    <Switch
                      value={setAsCover}
                      onValueChange={setSetAsCover}
                      trackColor={{ false: COLORS.border, true: COLORS.gold }}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Submit Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setVisModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={handleSaveVisualization}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <Text style={styles.modalSubmitText}>Save View</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={infoStyles.value}>{value || '—'}</Text>
  </View>
);
const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={infoStyles.fieldRow}>
    <Text style={infoStyles.label}>{label}</Text>
    {children}
  </View>
);
const infoStyles = StyleSheet.create({
  row: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fieldRow: { gap: 6, marginBottom: SPACING.sm },
  label: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 3 },
  value: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errText: { color: COLORS.textSecondary, fontSize: 14 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  pageTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  editBtnText: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 13 },
  saveBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gold,
  },
  saveBtnText: { color: COLORS.background, fontSize: 13, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tabs: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.gold },
  tabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: COLORS.gold, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md },
  tabContent: { gap: SPACING.md },
  editInput: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 44,
    color: COLORS.textPrimary, fontSize: 14,
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  monoText: { color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: 12, marginBottom: SPACING.md },

  // ─── Heritage Visualization Styles ─────────────────────────────────────────
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  panelTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  statusLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: COLORS.textSecondary, fontSize: 13 },
  statusVal: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  valActive: { color: COLORS.gold },
  valInactive: { color: COLORS.textSecondary },
  toggleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coverPreviewBox: { marginTop: 8, gap: 6 },
  coverImg: { width: '100%', height: 110, borderRadius: BORDER_RADIUS.sm },

  actionsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, marginBottom: 4 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.gold
  },
  addBtnText: { color: COLORS.background, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  emptyGrid: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 13 },

  // Grid list of images
  grid: { gap: SPACING.md },
  gridItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.sm,
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  gridImg: { width: 80, height: 80, borderRadius: BORDER_RADIUS.sm },
  gridDetails: { flex: 1, gap: 2, justifyContent: 'center' },
  gridTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  gridType: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  gridInfoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  gridOrder: { color: COLORS.textSecondary, fontSize: 11 },
  gridStatus: { fontSize: 11, fontWeight: '600' },
  statusActive: { color: COLORS.gold },
  statusInactive: { color: COLORS.textSecondary },

  gridActions: { justifyContent: 'center', gap: 6, minWidth: 70, alignItems: 'flex-end', paddingRight: 24 },
  gridActBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  gridActText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  coverBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: { color: COLORS.gold, fontSize: 9, fontWeight: '700' },

  reorderArrows: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: 8,
  },
  arrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 24,
    paddingHorizontal: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  imagePickerBtn: {
    height: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  pickerImgPreview: { width: '100%', height: '100%' },
  pickerPlaceholder: { alignItems: 'center', gap: 4 },
  pickerPlaceholderText: { color: COLORS.textSecondary, fontSize: 13 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  typeList: { flexDirection: 'row', marginBottom: SPACING.md, flexGrow: 0 },
  typeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  typeBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(212,175,55,0.08)' },
  typeBtnText: { color: COLORS.textSecondary, fontSize: 12 },
  typeBtnTextActive: { color: COLORS.gold, fontWeight: '600' },

  formGap: { gap: SPACING.sm },
  modalField: { gap: 4 },
  modalInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { color: COLORS.textPrimary, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  modalCancel: { flex: 1, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  modalCancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  modalSubmit: { flex: 1, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center' },
  modalSubmitText: { color: COLORS.background, fontSize: 14, fontWeight: '700' },

  // Interactive Visual Tab Styles
  visTabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  visTabTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  visTabSub: { color: COLORS.textSecondary, fontSize: 12 },
  addVisBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.gold
  },
  addVisBtnText: { color: COLORS.background, fontSize: 12, fontWeight: '700' },
  visConfigCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.xs,
  },
  visConfigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visConfigLabel: { color: COLORS.textSecondary, fontSize: 12 },
  visConfigVal: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  emptyVisCard: {
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyVisTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  emptyVisSub: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  visCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  visCardImage: { width: '100%', height: 160, backgroundColor: COLORS.surfaceLight },
  visCardBody: { padding: SPACING.md, gap: SPACING.xs },
  visCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visCardTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  visCardCategory: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  visCardDesc: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 16 },
  visCardBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  visActionRow: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.xs,
    paddingTop: SPACING.xs, marginTop: SPACING.xs,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  visActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceLight,
  },
  visActionBtnDanger: { borderColor: 'rgba(212,90,91,0.3)', backgroundColor: 'rgba(212,90,91,0.08)' },
  visActionText: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
});
