import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, Image, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFavorites } from '../../context/FavoritesContext';
import { createMonument, uploadMonumentImage } from '../../services/monumentService';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { AdminLayout } from '../../components/admin/AdminLayout';

type PublishStatus = 'draft' | 'published' | 'archived';

const STEPS = [
  'Basic Info',
  'Location',
  'Architecture',
  'Heritage',
  'Tourism',
  'AI & AR',
  'Publish',
];

export const AddHeritageSiteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { authToken, activeUserId } = useFavorites();
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Cover Image
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [alternateName, setAlternateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('temple');
  const [heritageType, setHeritageType] = useState('');
  const [period, setPeriod] = useState('');
  const [dynasty, setDynasty] = useState('');
  const [culturalSignificance, setCulturalSignificance] = useState('');
  const [unescoStatus, setUnescoStatus] = useState(false);

  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [architecturalStyle, setArchitecturalStyle] = useState('');
  const [constructionPeriod, setConstructionPeriod] = useState('');
  const [materials, setMaterials] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');

  const [history, setHistory] = useState('');
  const [historicalImportance, setHistoricalImportance] = useState('');
  const [preservation, setPreservation] = useState('');

  const [visitingTime, setVisitingTime] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [nearbyAttractions, setNearbyAttractions] = useState('');

  const [recognitionClass, setRecognitionClass] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.7');
  const [arEnabled, setArEnabled] = useState(false);
  const [modelUrl, setModelUrl] = useState('');

  const [status, setStatus] = useState<PublishStatus>('draft');

  const pickImage = async () => {
    try {
      const { status: permissionStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to select a cover image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[IMAGE-PICKER] Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Monument name is required.');
      return;
    }
    if (!authToken) return;
    
    setIsSaving(true);
    setUploadStatus('Creating heritage site record...');
    try {
      const payload: any = {
        name: name.trim(),
        alternateName: alternateName.trim() || undefined,
        description: description.trim() || undefined,
        category,
        heritageType: heritageType || undefined,
        period: period || undefined,
        historicalPeriod: period || undefined,
        dynasty: dynasty || undefined,
        culturalSignificance: culturalSignificance || undefined,
        isUNESCOHeritageSite: unescoStatus,
        country: country || 'India',
        state: state || undefined,
        district: district || undefined,
        city: city || undefined,
        address: address || undefined,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
        architecturalStyle: architecturalStyle || undefined,
        constructionPeriod: constructionPeriod || undefined,
        materials: materials ? materials.split(',').map(s => s.trim()) : undefined,
        keyArchitecturalFeatures: keyFeatures ? keyFeatures.split('\n').filter(Boolean) : undefined,
        history: history || undefined,
        historicalImportance: historicalImportance || undefined,
        preservation: preservation || undefined,
        visitingTime: visitingTime || undefined,
        accessibility: accessibility || undefined,
        nearbyAttractions: nearbyAttractions ? nearbyAttractions.split('\n').filter(Boolean) : undefined,
        recognitionClass: recognitionClass || undefined,
        aiConfidenceThreshold: confidenceThreshold ? parseFloat(confidenceThreshold) : 0.7,
        arEnabled,
        modelUrl: modelUrl || undefined,
        status,
      };

      const res = await createMonument(payload, authToken);
      const createdMonument = res?.data;
      const createdId = createdMonument?._id || createdMonument?.id;

      // Upload Cover Image if selected
      if (selectedImageUri && createdId && activeUserId) {
        setUploadStatus('Uploading heritage cover image...');
        try {
          const formData = new FormData();
          const filename = selectedImageUri.split('/').pop() || 'cover.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          if (Platform.OS === 'web') {
            const resp = await fetch(selectedImageUri);
            const blob = await resp.blob();
            formData.append('image', blob, filename);
          } else {
            formData.append('image', {
              uri: selectedImageUri,
              name: filename,
              type,
            } as any);
          }

          formData.append('monumentId', createdId);
          formData.append('uploaderId', activeUserId);
          formData.append('imageType', 'primary');

          await uploadMonumentImage(createdId, formData, activeUserId, authToken);
        } catch (imgErr) {
          console.error('[IMAGE-UPLOAD] Failed to upload cover image:', imgErr);
        }
      }

      Alert.alert(
        'Success',
        `Heritage site "${name}" has been created successfully.`,
        [{ text: 'OK', onPress: () => navigation.navigate('HeritageSites') }]
      );
    } catch (err: any) {
      console.error('[ADD-SITE] Save failed:', err);
      Alert.alert('Error', err.message || 'Failed to save heritage site.');
    } finally {
      setIsSaving(false);
      setUploadStatus(null);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.fields}>
            <Field label="Site / Monument Name *" value={name} onChangeText={setName} placeholder="e.g., Brihadeeswarar Temple" />
            <Field label="Alternate Name / Vernacular" value={alternateName} onChangeText={setAlternateName} placeholder="e.g., Thanjavur Periya Kovil" />
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Brief summary of the monument..." multiline />
            <Field label="Period / Era" value={period} onChangeText={setPeriod} placeholder="e.g., 11th Century CE" />
            <Field label="Ruling Dynasty" value={dynasty} onChangeText={setDynasty} placeholder="e.g., Chola Dynasty" />
            <Field label="Heritage Category" value={category} onChangeText={setCategory} placeholder="temple, palace, fort, monument" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>UNESCO World Heritage Site</Text>
              <Switch value={unescoStatus} onValueChange={setUnescoStatus} trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(212,175,55,0.4)' }} thumbColor={unescoStatus ? COLORS.gold : '#A0A09C'} />
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.fields}>
            <View style={styles.row}>
              <View style={styles.half}><Field label="Country" value={country} onChangeText={setCountry} /></View>
              <View style={styles.half}><Field label="State" value={state} onChangeText={setState} /></View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}><Field label="District" value={district} onChangeText={setDistrict} placeholder="e.g., Thanjavur" /></View>
              <View style={styles.half}><Field label="City / Town" value={city} onChangeText={setCity} placeholder="e.g., Thanjavur" /></View>
            </View>
            <Field label="Address / Landmarks" value={address} onChangeText={setAddress} placeholder="Full postal address..." />
            <View style={styles.row}>
              <View style={styles.half}><Field label="Latitude" value={lat} onChangeText={setLat} placeholder="10.7828" keyboardType="numeric" /></View>
              <View style={styles.half}><Field label="Longitude" value={lng} onChangeText={setLng} placeholder="79.1318" keyboardType="numeric" /></View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.fields}>
            <Field label="Architectural Style" value={architecturalStyle} onChangeText={setArchitecturalStyle} placeholder="e.g., Dravidian Architecture" />
            <Field label="Construction Period" value={constructionPeriod} onChangeText={setConstructionPeriod} placeholder="e.g., 1003–1010 CE" />
            <Field label="Primary Materials" value={materials} onChangeText={setMaterials} placeholder="Granite, Sandstone (comma separated)" />
            <Field label="Key Architectural Features" value={keyFeatures} onChangeText={setKeyFeatures} placeholder="Vimana height: 66m\nKumbam monolith: 80 tons" multiline />
          </View>
        );
      case 3:
        return (
          <View style={styles.fields}>
            <Field label="Historical Background" value={history} onChangeText={setHistory} placeholder="Detailed historical origin..." multiline />
            <Field label="Cultural Significance" value={culturalSignificance} onChangeText={setCulturalSignificance} placeholder="Significance to Tamil literature & Chola empire" multiline />
            <Field label="Preservation Status" value={preservation} onChangeText={setPreservation} placeholder="Maintained by Archaeological Survey of India (ASI)" />
          </View>
        );
      case 4:
        return (
          <View style={styles.fields}>
            <Field label="Visiting Hours" value={visitingTime} onChangeText={setVisitingTime} placeholder="e.g., 6:00 AM – 8:30 PM daily" />
            <Field label="Accessibility & Entry" value={accessibility} onChangeText={setAccessibility} placeholder="Wheelchair accessible, free entry" />
            <Field label="Nearby Attractions" value={nearbyAttractions} onChangeText={setNearbyAttractions} placeholder="Thanjavur Maratha Palace\nSchwartz Church" multiline />
          </View>
        );
      case 5:
        return (
          <View style={styles.fields}>
            <Field label="AI Recognition Class Label" value={recognitionClass} onChangeText={setRecognitionClass} placeholder="e.g., brihadeeswarar" />
            <Field label="Confidence Threshold" value={confidenceThreshold} onChangeText={setConfidenceThreshold} placeholder="0.7" keyboardType="numeric" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable AR 3D Experience</Text>
              <Switch value={arEnabled} onValueChange={setArEnabled} trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(212,175,55,0.4)' }} thumbColor={arEnabled ? COLORS.gold : '#A0A09C'} />
            </View>
            {arEnabled && (
              <Field label="3D Model Asset URL" value={modelUrl} onChangeText={setModelUrl} placeholder="https://.../model.glb" />
            )}
          </View>
        );
      case 6:
        return (
          <View style={styles.fields}>
            {/* Cover Image Picker */}
            <Text style={styles.fieldLabel}>Site Cover Image</Text>
            <TouchableOpacity style={styles.imagePickerBox} onPress={pickImage} activeOpacity={0.8}>
              {selectedImageUri ? (
                <Image source={{ uri: selectedImageUri }} style={styles.previewCoverImage} />
              ) : (
                <View style={styles.imagePlaceholderInner}>
                  <Feather name="image" size={28} color={COLORS.gold} />
                  <Text style={styles.imagePlaceholderText}>Select Heritage Cover Image</Text>
                  <Text style={styles.imagePlaceholderSub}>JPG, PNG up to 10MB</Text>
                </View>
              )}
            </TouchableOpacity>
            {selectedImageUri && (
              <TouchableOpacity style={styles.changeImgBtn} onPress={pickImage}>
                <Feather name="refresh-cw" size={12} color={COLORS.gold} />
                <Text style={styles.changeImgText}>Change Image</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Publish Status</Text>
            <View style={styles.statusButtons}>
              {(['draft', 'published', 'archived'] as PublishStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusBtn, status === st && styles.statusBtnActive]}
                  onPress={() => setStatus(st)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusBtnText, status === st && styles.statusBtnTextActive]}>
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Summary Review</Text>
              <Text style={styles.summaryItem}>• Name: {name || 'Not specified'}</Text>
              <Text style={styles.summaryItem}>• Category: {category}</Text>
              <Text style={styles.summaryItem}>• Location: {[city, state].filter(Boolean).join(', ') || 'India'}</Text>
              <Text style={styles.summaryItem}>• UNESCO: {unescoStatus ? 'Yes' : 'No'}</Text>
              <Text style={styles.summaryItem}>• AR Enabled: {arEnabled ? 'Yes' : 'No'}</Text>
            </View>

            {uploadStatus && (
              <View style={styles.loadingProgressBox}>
                <ActivityIndicator size="small" color={COLORS.gold} />
                <Text style={styles.loadingProgressText}>{uploadStatus}</Text>
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <AdminLayout navigation={navigation} activeSection="heritage" title="Add Heritage Site">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Step Wizard Bar */}
        <View style={styles.stepsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsBarContent}>
            {STEPS.map((label, idx) => {
              const isActive = step === idx;
              const isCompleted = step > idx;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.stepTab,
                    isActive && styles.stepTabActive,
                    isCompleted && styles.stepTabCompleted,
                  ]}
                  onPress={() => setStep(idx)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.stepTabText,
                      isActive && styles.stepTabTextActive,
                      isCompleted && styles.stepTabTextCompleted,
                    ]}
                  >
                    {idx + 1}. {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Step Card Container */}
        <View style={styles.card}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.iconChip}>
              <Feather name="plus-circle" size={16} color={COLORS.gold} />
            </View>
            <View>
              <Text style={styles.stepTitle}>{STEPS[step]}</Text>
              <Text style={styles.stepDesc}>Step {step + 1} of {STEPS.length}</Text>
            </View>
          </View>

          {renderStepContent()}

          {/* Wizard Controls */}
          <View style={styles.stepControls}>
            {step > 0 && (
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(s => s - 1)} activeOpacity={0.7}>
                <Feather name="chevron-left" size={16} color={COLORS.textPrimary} />
                <Text style={styles.prevBtnText}>Previous</Text>
              </TouchableOpacity>
            )}

            {step < STEPS.length - 1 ? (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(s => s + 1)} activeOpacity={0.8}>
                <Text style={styles.nextBtnText}>Next Step</Text>
                <Feather name="chevron-right" size={16} color="#141412" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#141412" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#141412" />
                    <Text style={styles.saveBtnText}>Save Heritage Site</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, multiline, keyboardType }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textSecondary}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      keyboardType={keyboardType}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { padding: SPACING.md, paddingBottom: 60 },
  stepsBar: { marginBottom: SPACING.md },
  stepsBarContent: { flexDirection: 'row', gap: SPACING.xs },
  stepTab: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepTabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  stepTabCompleted: { borderColor: 'rgba(212, 175, 55, 0.3)' },
  stepTabText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  stepTabTextActive: { color: COLORS.gold, fontWeight: '700' },
  stepTabTextCompleted: { color: COLORS.gold },

  card: {
    backgroundColor: '#181816',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  stepDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },

  fields: { gap: SPACING.md },
  fieldContainer: {},
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 11,
    color: COLORS.textPrimary, fontSize: 13,
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  half: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: SPACING.xs, paddingVertical: 4 },
  switchLabel: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },

  imagePickerBox: {
    height: 160, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed', backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  previewCoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholderInner: { alignItems: 'center', padding: SPACING.md },
  imagePlaceholderText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 8 },
  imagePlaceholderSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  changeImgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginTop: 6 },
  changeImgText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },

  statusButtons: { flexDirection: 'row', gap: SPACING.xs },
  statusBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  statusBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  statusBtnTextActive: { color: '#141412' },

  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryTitle: { color: COLORS.gold, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  summaryItem: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 },
  loadingProgressBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: BORDER_RADIUS.md, marginVertical: SPACING.sm,
  },
  loadingProgressText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },

  stepControls: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: SPACING.lg, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  prevBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gold, marginLeft: 'auto',
  },
  nextBtnText: { color: '#141412', fontSize: 13, fontWeight: '800' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gold, marginLeft: 'auto',
  },
  saveBtnText: { color: '#141412', fontSize: 13, fontWeight: '800' },
  disabledBtn: { opacity: 0.7 },
});
