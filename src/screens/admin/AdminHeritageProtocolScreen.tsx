import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { AdminPortalParamList } from '../../navigation/types';
import {
  getAdminProtocol,
  updateAdminProtocol,
  generateProtocolFromSource,
  publishProtocol,
  HeritageProtocolData,
  ProtocolItem,
  ProtocolSections,
  ProtocolSource,
  ProtocolItemClassification
} from '../../services/protocolService';
import { getMonuments, ApiMonument } from '../../services/monumentService';

type Props = NativeStackScreenProps<AdminPortalParamList, 'AdminHeritageProtocol'>;

const SECTION_KEYS: { key: keyof ProtocolSections; title: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'beforeVisit', title: 'Before You Visit', icon: 'calendar' },
  { key: 'entryGuidelines', title: 'Entry Guidelines', icon: 'log-in' },
  { key: 'dressGuidance', title: 'Dress Guidance', icon: 'user-check' },
  { key: 'traditionalPractices', title: 'Traditional Practices', icon: 'heart' },
  { key: 'photography', title: 'Photography Guidelines', icon: 'camera' },
  { key: 'dos', title: "Do's", icon: 'check-circle' },
  { key: 'donts', title: "Don'ts", icon: 'slash' },
  { key: 'respectfulBehaviour', title: 'Respectful Behaviour', icon: 'sun' },
  { key: 'accessibility', title: 'Accessibility & Terrain', icon: 'help-circle' },
  { key: 'restrictions', title: 'Important Restrictions', icon: 'alert-triangle' },
  { key: 'visitorNotes', title: 'Visitor Notes', icon: 'file-text' }
];

export const AdminHeritageProtocolScreen: React.FC<Props> = ({ navigation, route }) => {
  const [monuments, setMonuments] = useState<ApiMonument[]>([]);
  const [selectedMonument, setSelectedMonument] = useState<ApiMonument | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'ta' | 'hi'>('en');

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [protocol, setProtocol] = useState<HeritageProtocolData | null>(null);

  // Modals
  const [showMonumentModal, setShowMonumentModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiSourceUrl, setAiSourceUrl] = useState<string>('');
  const [aiSourceType, setAiSourceType] = useState<string>('Official Government');

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    beforeVisit: true,
    entryGuidelines: true
  });

  // Fetch Monuments List
  useEffect(() => {
    const loadMonuments = async () => {
      try {
        const res = await getMonuments();
        if (res && res.data && res.data.length > 0) {
          setMonuments(res.data);
          const initialId = route.params?.monumentId;
          const target = initialId ? res.data.find((m: ApiMonument) => (m._id === initialId || m.id === initialId)) || res.data[0] : res.data[0];
          setSelectedMonument(target);
        }
      } catch (err) {
        console.warn('[AdminProtocol] Failed to load monuments:', err);
      }
    };
    loadMonuments();
  }, [route.params?.monumentId]);

  // Fetch Protocol for Selected Monument
  const fetchProtocol = async () => {
    if (!selectedMonument) return;
    const mId = selectedMonument._id || selectedMonument.id;
    setLoading(true);
    try {
      const res = await getAdminProtocol(mId, selectedLang);
      if (res && res.success && res.data) {
        setProtocol(res.data);
      }
    } catch (err) {
      console.warn('[AdminProtocol] Failed to load protocol:', err);
      Alert.alert('Error', 'Failed to load heritage protocol data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocol();
  }, [selectedMonument, selectedLang]);

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedMonument || !protocol) return;
    setActionLoading(true);
    const mId = selectedMonument._id || selectedMonument.id;
    try {
      const res = await updateAdminProtocol(mId, {
        sections: protocol.sections,
        sources: protocol.sources,
        language: selectedLang
      });
      if (res && res.success) {
        setProtocol(res.data);
        Alert.alert('Success', 'Protocol draft saved successfully.');
      } else {
        Alert.alert('Error', res.message || 'Failed to save draft.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Save draft request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger AI Extraction
  const handleAiExtract = async () => {
    if (!aiSourceUrl || !aiSourceUrl.startsWith('http')) {
      Alert.alert('Validation Error', 'Please enter a valid HTTP/HTTPS source URL.');
      return;
    }
    if (!selectedMonument) return;

    setShowAiModal(false);
    setActionLoading(true);
    const mId = selectedMonument._id || selectedMonument.id;

    try {
      const res = await generateProtocolFromSource(mId, aiSourceUrl, aiSourceType, selectedLang);
      if (res && res.success) {
        setProtocol(res.data);
        setAiSourceUrl('');
        Alert.alert('AI Extraction Complete', 'Source content extracted and structured into draft. Please review and edit before publishing.');
      } else {
        Alert.alert('Extraction Failed', res.message || 'Unable to extract protocol from source.');
      }
    } catch (err: any) {
      Alert.alert('Extraction Error', err.message || 'AI source processing failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Publish / Unpublish
  const handlePublish = async (action: 'publish' | 'unpublish') => {
    if (!selectedMonument || !protocol) return;
    setActionLoading(true);
    const mId = selectedMonument._id || selectedMonument.id;
    try {
      const res = await publishProtocol(mId, action, selectedLang);
      if (res && res.success) {
        setProtocol(res.data);
        Alert.alert('Success', res.message || `Protocol ${action}ed successfully.`);
      } else {
        Alert.alert('Publishing Warning', res.message || `Failed to ${action} protocol.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Publishing request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Section Item Editing Handlers
  const handleAddItem = (sectionKey: keyof ProtocolSections) => {
    if (!protocol) return;
    const newItem: ProtocolItem = {
      id: Date.now().toString(),
      text: 'New guideline requirement...',
      classification: 'GENERAL_GUIDANCE',
      lastVerifiedAt: new Date().toISOString()
    };

    setProtocol({
      ...protocol,
      sections: {
        ...protocol.sections,
        [sectionKey]: [...(protocol.sections[sectionKey] || []), newItem]
      }
    });
  };

  const handleUpdateItem = (sectionKey: keyof ProtocolSections, index: number, updated: ProtocolItem) => {
    if (!protocol) return;
    const currentList = [...(protocol.sections[sectionKey] || [])];
    currentList[index] = updated;
    setProtocol({
      ...protocol,
      sections: {
        ...protocol.sections,
        [sectionKey]: currentList
      }
    });
  };

  const handleRemoveItem = (sectionKey: keyof ProtocolSections, index: number) => {
    if (!protocol) return;
    const currentList = [...(protocol.sections[sectionKey] || [])];
    currentList.splice(index, 1);
    setProtocol({
      ...protocol,
      sections: {
        ...protocol.sections,
        [sectionKey]: currentList
      }
    });
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Heritage Protocol Guide</Text>
        {actionLoading ? (
          <ActivityIndicator size="small" color={COLORS.gold} />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Monument Selector Dropdown Header */}
        <TouchableOpacity
          style={styles.monumentSelector}
          onPress={() => setShowMonumentModal(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.selectorLabel}>SELECTED HERITAGE MONUMENT</Text>
            <Text style={styles.selectorValue}>
              {selectedMonument ? selectedMonument.name : 'Select Monument...'}
            </Text>
          </View>
          <Feather name="chevron-down" size={20} color={COLORS.gold} />
        </TouchableOpacity>

        {/* Toolbar & Status Bar */}
        {protocol && (
          <View style={styles.statusBarRow}>
            <View style={styles.statusBadgeContainer}>
              <Text style={styles.statusLabel}>STATUS:</Text>
              <View style={[
                styles.statusBadge,
                protocol.status === 'PUBLISHED' && styles.statusBadgePublished,
                protocol.status === 'UNPUBLISHED' && styles.statusBadgeUnpublished
              ]}>
                <Text style={styles.statusBadgeText}>{protocol.status}</Text>
              </View>
            </View>

            {/* Language Toggle */}
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
                <Text style={[styles.langChipText, selectedLang === 'ta' && styles.langChipTextActive]}>TA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, selectedLang === 'hi' && styles.langChipActive]}
                onPress={() => setSelectedLang('hi')}
              >
                <Text style={[styles.langChipText, selectedLang === 'hi' && styles.langChipTextActive]}>HI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Admin Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAi]}
            onPress={() => setShowAiModal(true)}
            disabled={actionLoading}
          >
            <Feather name="cpu" size={14} color={COLORS.background} />
            <Text style={styles.actionBtnAiText}>Fetch from Source</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSave]}
            onPress={handleSaveDraft}
            disabled={actionLoading}
          >
            <Feather name="save" size={14} color={COLORS.textPrimary} />
            <Text style={styles.actionBtnText}>Save Draft</Text>
          </TouchableOpacity>

          {protocol?.status === 'PUBLISHED' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnUnpublish]}
              onPress={() => handlePublish('unpublish')}
              disabled={actionLoading}
            >
              <Feather name="x-circle" size={14} color="#FF6B6B" />
              <Text style={{ color: '#FF6B6B', fontSize: 12, fontWeight: '700' }}>Unpublish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPublish]}
              onPress={() => handlePublish('publish')}
              disabled={actionLoading}
            >
              <Feather name="check-circle" size={14} color={COLORS.gold} />
              <Text style={{ color: COLORS.gold, fontSize: 12, fontWeight: '700' }}>Publish</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Loading protocol data...</Text>
          </View>
        )}

        {/* Protocol Sections List */}
        {!loading && protocol && (
          <View style={styles.sectionsContainer}>
            {SECTION_KEYS.map(secCfg => {
              const items = protocol.sections[secCfg.key] || [];
              const isOpen = !!openSections[secCfg.key];

              return (
                <View key={secCfg.key} style={styles.sectionCard}>
                  <TouchableOpacity
                    style={styles.sectionCardHeader}
                    onPress={() => toggleSection(secCfg.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Feather name={secCfg.icon} size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
                      <Text style={styles.sectionTitle}>{secCfg.title}</Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{items.length}</Text>
                      </View>
                    </View>
                    <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.sectionCardBody}>
                      {items.map((item, idx) => (
                        <View key={item.id || idx} style={styles.itemEditBox}>
                          <View style={styles.itemEditHeader}>
                            <View style={styles.classPickerRow}>
                              {(['VERIFIED', 'GENERAL_GUIDANCE', 'UNVERIFIED'] as ProtocolItemClassification[]).map(cType => (
                                <TouchableOpacity
                                  key={cType}
                                  style={[
                                    styles.classChip,
                                    item.classification === cType && styles.classChipActive
                                  ]}
                                  onPress={() => handleUpdateItem(secCfg.key, idx, { ...item, classification: cType })}
                                >
                                  <Text style={[
                                    styles.classChipText,
                                    item.classification === cType && styles.classChipTextActive
                                  ]}>
                                    {cType}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TouchableOpacity onPress={() => handleRemoveItem(secCfg.key, idx)}>
                              <Feather name="trash-2" size={16} color="#FF6B6B" />
                            </TouchableOpacity>
                          </View>

                          <TextInput
                            style={styles.itemTextInput}
                            value={item.text}
                            onChangeText={t => handleUpdateItem(secCfg.key, idx, { ...item, text: t })}
                            multiline
                            placeholder="Enter guideline text..."
                            placeholderTextColor={COLORS.textSecondary}
                          />

                          {item.sourceTitle && (
                            <Text style={styles.itemSourceMeta}>
                              Source: {item.sourceOrganization ? `${item.sourceOrganization} — ` : ''}{item.sourceTitle}
                            </Text>
                          )}
                        </View>
                      ))}

                      <TouchableOpacity style={styles.addItemBtn} onPress={() => handleAddItem(secCfg.key)}>
                        <Feather name="plus" size={14} color={COLORS.gold} />
                        <Text style={styles.addItemBtnText}>Add Item to {secCfg.title}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Monument Picker Modal */}
      <Modal visible={showMonumentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Heritage Monument</Text>
              <TouchableOpacity onPress={() => setShowMonumentModal(false)}>
                <Feather name="x" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={monuments}
              keyExtractor={item => item._id || item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.monumentOption}
                  onPress={() => {
                    setSelectedMonument(item);
                    setShowMonumentModal(false);
                  }}
                >
                  <Text style={styles.monumentOptionText}>{item.name}</Text>
                  <Text style={styles.monumentOptionSub}>{item.location}, {item.state}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* AI Extraction Modal */}
      <Modal visible={showAiModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fetch & Extract Source Guidance</Text>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Feather name="x" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalInstruction}>
              Enter trusted official URL (e.g. Temple trust website or Govt tourism page).
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://example.gov.in/temple-guidelines"
              placeholderTextColor={COLORS.textSecondary}
              value={aiSourceUrl}
              onChangeText={setAiSourceUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={styles.modalActionBtn} onPress={handleAiExtract}>
              <Text style={styles.modalActionBtnText}>Fetch & Structure via AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: TYPOGRAPHY.h3.fontSize, fontWeight: 'bold', color: COLORS.textPrimary },
  scrollContent: { padding: SPACING.md, gap: SPACING.md },
  monumentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gold
  },
  selectorLabel: { fontSize: 10, color: COLORS.gold, fontWeight: 'bold', letterSpacing: 0.5 },
  selectorValue: { fontSize: TYPOGRAPHY.bodyMedium.fontSize, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 2 },
  statusBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#E0A800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgePublished: { backgroundColor: '#28A745' },
  statusBadgeUnpublished: { backgroundColor: '#DC3545' },
  statusBadgeText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
  langContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: 2, borderWidth: 1, borderColor: COLORS.border },
  langChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
  langChipActive: { backgroundColor: COLORS.gold },
  langChipText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  langChipTextActive: { color: COLORS.background },
  actionGrid: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  actionBtnAi: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  actionBtnAiText: { color: COLORS.background, fontSize: 12, fontWeight: 'bold' },
  actionBtnSave: { backgroundColor: COLORS.surface },
  actionBtnPublish: { borderColor: COLORS.gold },
  actionBtnUnpublish: { borderColor: '#FF6B6B' },
  actionBtnText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  loadingContainer: { padding: SPACING.xl, alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8 },
  sectionsContainer: { gap: SPACING.sm },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: TYPOGRAPHY.bodyMedium.fontSize, fontWeight: '600', color: COLORS.textPrimary },
  countBadge: { backgroundColor: COLORS.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  countBadgeText: { fontSize: 10, color: COLORS.gold, fontWeight: 'bold' },
  sectionCardBody: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.sm },
  itemEditBox: { backgroundColor: COLORS.background, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  itemEditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classPickerRow: { flexDirection: 'row', gap: 4 },
  classChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border },
  classChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  classChipText: { fontSize: 8, color: COLORS.textSecondary, fontWeight: '600' },
  classChipTextActive: { color: COLORS.background, fontWeight: 'bold' },
  itemTextInput: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.bodySmall.fontSize, minHeight: 40, textAlignVertical: 'top' },
  itemSourceMeta: { fontSize: 9, color: COLORS.textSecondary, fontStyle: 'italic' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  addItemBtnText: { color: COLORS.gold, fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.md },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: TYPOGRAPHY.h3.fontSize, fontWeight: 'bold', color: COLORS.textPrimary },
  monumentOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  monumentOptionText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold' },
  monumentOptionSub: { color: COLORS.textSecondary, fontSize: 12 },
  modalInstruction: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  modalInput: { backgroundColor: COLORS.background, color: COLORS.textPrimary, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, fontSize: 12 },
  modalActionBtn: { backgroundColor: COLORS.gold, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  modalActionBtnText: { color: COLORS.background, fontSize: 14, fontWeight: 'bold' }
});
