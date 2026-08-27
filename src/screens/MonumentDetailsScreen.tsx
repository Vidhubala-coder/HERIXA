import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { MONUMENTS } from '../data/monuments';
import { RootStackParamList } from '../navigation/types';
import { useFavorites } from '../context/FavoritesContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { getMonumentById, ApiMonument, getImageUrl, ApiMonumentImage, getWikimediaFallback } from '../services/monumentService';
import { SafeImage } from '../components/SafeImage';
import { VoiceAssistant } from '../components/VoiceAssistant';

type MonumentDetailsScreenRouteProp = RouteProp<RootStackParamList, 'MonumentDetails'>;
type MonumentDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MonumentDetails'>;

interface MonumentDetailsScreenProps {
  route: MonumentDetailsScreenRouteProp;
  navigation: MonumentDetailsScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

interface CollapsibleCardProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderLeft}>
          {icon && <Feather name={icon as any} size={16} color={COLORS.gold} style={styles.cardIcon} />}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.cardContent}>
          {children}
        </View>
      )}
    </View>
  );
};

export const MonumentDetailsScreen: React.FC<MonumentDetailsScreenProps> = ({ route, navigation }) => {
  const { monumentId } = route.params;
  const { isFavorite, addFavorite, removeFavorite, addHistory } = useFavorites();
  const [isFavoriteActionLoading, setIsFavoriteActionLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const [monument, setMonument] = useState<ApiMonument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssistantVisible, setIsAssistantVisible] = useState<boolean>(false);

  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
  const [zoomImageCaption, setZoomImageCaption] = useState<string | null>(null);
  const [activeDetailsGalleryTab, setActiveDetailsGalleryTab] = useState<'historical' | 'archival' | 'modern' | 'architecture' | 'sculpture' | 'inscription' | 'restoration'>('historical');

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMonumentById(monumentId);
        setMonument(data);
        addHistory('view', data._id || data.id).catch((err) =>
          console.warn('Failed to add view entry to history:', err)
        );
      } catch (err) {
        console.warn(`MonumentDetailsScreen: Failed to fetch monument details for ${monumentId} from backend. Trying local fallback.`, err);
        // Offline Fallback
        const localMon = MONUMENTS.find((m) => m.id === monumentId);
        if (localMon) {
          const mappedLocal = {
            ...localMon,
            _id: localMon.id,
            slug: localMon.id,
            images: [localMon.image],
            historicalBackground: localMon.background,
            culturalSignificance: localMon.significance,
            preservationStatus: localMon.preservation,
            interestingFacts: localMon.facts,
          };
          setMonument(mappedLocal as any);
          addHistory('view', mappedLocal._id || mappedLocal.id).catch((err) =>
            console.warn('Failed to add view entry to history:', err)
          );
        } else {
          setError('Heritage site not found.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [monumentId]);



  useEffect(() => {
    if (monument) {
      const tabs: ('historical' | 'archival' | 'modern' | 'architecture' | 'sculpture' | 'inscription' | 'restoration')[] = 
        ['historical', 'archival', 'modern', 'architecture', 'sculpture', 'inscription', 'restoration'];
      for (const tab of tabs) {
        const count = 
          tab === 'historical' ? (monument.historicalImages || []).filter(img => img.imageType === 'historical').length :
          tab === 'archival' ? (monument.historicalImages || []).filter(img => img.imageType === 'archival').length :
          tab === 'modern' ? (monument.modernImages || []).length :
          tab === 'architecture' ? (monument.architectureImages || []).length :
          tab === 'sculpture' ? (monument.sculptureImages || []).length :
          tab === 'inscription' ? (monument.inscriptionImages || []).length :
          tab === 'restoration' ? (monument.restorationImages || []).length : 0;
        if (count > 0) {
          setActiveDetailsGalleryTab(tab);
          break;
        }
      }
    }
  }, [monument]);

  const favorited = monument ? isFavorite(monument.id) : false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={[styles.errorText, { marginTop: 10 }]}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !monument) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={COLORS.danger} style={{ marginBottom: SPACING.md }} />
        <Text style={styles.errorText}>{error || 'Heritage site not found.'}</Text>
        <PrimaryButton title="Go Back" onPress={() => navigation.goBack()} style={{ width: 140, marginTop: SPACING.sm }} />
      </SafeAreaView>
    );
  }

  const handleFavoritePress = async () => {
    if (isFavoriteActionLoading || !monument) return;
    setIsFavoriteActionLoading(true);
    try {
      if (favorited) {
        await removeFavorite(monument.id);
      } else {
        await addFavorite(monument.id);
      }
    } catch (err) {
      console.warn('[SAVED HERITAGE] Failed to toggle favorite in details screen', err);
    } finally {
      setIsFavoriteActionLoading(false);
    }
  };

  const handleViewInAR = () => {
    if (!monument) return;
    // Navigate to AR tab in Main and pass the monumentId
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          params: {
            screen: 'AR',
            params: { monumentId: monument.id }
          }
        }
      ]
    });
  };

  const handleReadHistory = () => {
    // Pass the MongoDB monument _id
    navigation.navigate('FullHistory', { monumentId: monument.id });
  };

  const hasBasicInfo = !!(
    monument.district ||
    monument.monumentType ||
    monument.historicalPeriod ||
    monument.constructionYear ||
    monument.constructionPeriod ||
    monument.ruler ||
    monument.builder ||
    monument.architect ||
    monument.coordinates ||
    (monument.alternativeNames && monument.alternativeNames.length > 0) ||
    (monument.localNames && monument.localNames.length > 0) ||
    (monument.historicalNames && monument.historicalNames.length > 0)
  );

  const hasTimeline = !!(monument.historicalTimeline && monument.historicalTimeline.length > 0);
  const hasEvents = !!(monument.historicalEvents && monument.historicalEvents.length > 0);
  const hasStructural = !!(
    monument.structuralFeatures ||
    monument.vimanaDetails ||
    monument.gopuramDetails ||
    monument.mandapaDetails ||
    monument.architectureDescription ||
    monument.layout ||
    monument.entrance ||
    monument.gopuram ||
    monument.vimana ||
    monument.mandapa ||
    monument.pillars ||
    monument.sculptures ||
    monument.materials ||
    monument.uniqueArchitecturalFeatures
  );
  const hasSculptures = !!(
    monument.sculptureDetails ||
    monument.pillarDetails ||
    monument.ceilingDetails ||
    monument.inscriptionDetails
  );
  const hasCulture = !!(
    monument.culturalImportance ||
    monument.socialImportance ||
    monument.artisticImportance
  );
  const hasFestivals = !!(
    monument.culturalPractices ||
    monument.traditionalPractices ||
    (monument.festivals && monument.festivals.length > 0) ||
    (monument.rituals && monument.rituals.length > 0)
  );
  const hasLegends = !!(
    monument.mythology ||
    (monument.legends && monument.legends.length > 0) ||
    (monument.localStories && monument.localStories.length > 0) ||
    (monument.interestingStories && monument.interestingStories.length > 0) ||
    (monument.mythologicalStories && monument.mythologicalStories.length > 0) ||
    (monument.localTraditions && monument.localTraditions.length > 0)
  );
  const hasPreservation = !!(
    monument.preservationHistory ||
    monument.restorationHistory ||
    monument.damageHistory ||
    monument.conservationEfforts ||
    monument.currentCondition ||
    monument.conservationAuthority
  );
  const hasHeritage = !!(
    monument.heritageStatus ||
    monument.unescoStatus ||
    monument.unescoYear ||
    monument.heritageRecognition ||
    monument.protectedStatus
  );
  const hasVisitor = !!(
    monument.visitingInformation ||
    monument.openingHours ||
    monument.bestTimeToVisit ||
    monument.entryFee ||
    monument.dressCode ||
    monument.visitorGuidelines ||
    monument.howToReach ||
    monument.openingInformation ||
    monument.dressGuidelines ||
    monument.photographyRules ||
    monument.accessibility
  );
  const hasFacts = !!(
    (monument.interestingFacts && monument.interestingFacts.length > 0) ||
    (monument.didYouKnow && monument.didYouKnow.length > 0) ||
    (monument.importantFacts && monument.importantFacts.length > 0) ||
    (monument.architecturalHighlights && monument.architecturalHighlights.length > 0) ||
    (monument.historicalHighlights && monument.historicalHighlights.length > 0)
  );
  const hasNearby = !!(monument.nearbyPlaces && monument.nearbyPlaces.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Large Hero Image */}
        <View style={styles.imageContainer}>
          <SafeImage
            source={getImageUrl(monument.image)}
            fallbackSource={getWikimediaFallback(monument)}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Gradients */}
          <View style={styles.topGradient} />
          <View style={styles.bottomGradient} />

          {/* Navigation Action Buttons Overlay */}
          <SafeAreaView style={styles.overlayHeader}>
            <TouchableOpacity
              style={styles.roundButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

             <TouchableOpacity
              style={styles.roundButton}
              onPress={handleFavoritePress}
              disabled={isFavoriteActionLoading}
              activeOpacity={0.8}
            >
              {isFavoriteActionLoading ? (
                <ActivityIndicator size="small" color={COLORS.gold} />
              ) : (
                <Ionicons
                  name={favorited ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={favorited ? COLORS.gold : COLORS.textPrimary}
                />
              )}
            </TouchableOpacity>
          </SafeAreaView>

          {/* Location Badge */}
          <View style={styles.imageBadge}>
            <Text style={styles.imageBadgeText}>{monument.category.toUpperCase()}</Text>
          </View>
        </View>

        {/* Info Content */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{monument.name}</Text>
          
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={14} color={COLORS.gold} />
            <Text style={styles.locationText}>
              {monument.location}, {monument.state}
            </Text>
          </View>

          {/* Dynastic Details Box */}
          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>ERA / PERIOD</Text>
              <Text style={styles.metaValue}>{monument.period}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DYNASTY</Text>
              <Text style={styles.metaValue}>{monument.dynasty}</Text>
            </View>
          </View>

          {/* GPS Coordinates Display (Info only) */}
          <View style={styles.gpsContainer}>
            <Feather name="compass" size={14} color={COLORS.textSecondary} />
            <Text style={styles.gpsText}>
              Location Coordinates: {monument.latitude ? monument.latitude.toFixed(4) : '0.0000'}° N, {monument.longitude ? monument.longitude.toFixed(4) : '0.0000'}° E
            </Text>
          </View>

          {/* Action CTAs */}
          <View style={styles.actionRow}>
            <PrimaryButton
              title="VIEW IN AR"
              variant="solid"
              onPress={handleViewInAR}
              style={styles.actionButton}
            />
            <PrimaryButton
              title="FULL HISTORY"
              variant="outline"
              onPress={handleReadHistory}
              style={styles.actionButton}
            />
          </View>



          {/* Ask HERIXA Voice Assistant Banner */}
          <TouchableOpacity
            style={styles.assistantBanner}
            onPress={() => setIsAssistantVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.assistantBannerLeft}>
              <View style={styles.assistantIconContainer}>
                <Ionicons name="mic-outline" size={22} color={COLORS.background} />
              </View>
              <View>
                <Text style={styles.assistantBannerTitle}>ASK HERIXA GUIDE</Text>
                <Text style={styles.assistantBannerSubtitle}>
                  Ask questions in English, தமிழ், or हिन्दी
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.gold} />
          </TouchableOpacity>

          {/* ======================================================== */}
          {/* ACCORDION CARDS START                                    */}
          {/* ======================================================== */}

          {/* 1. Overview */}
          {monument.description && (
            <CollapsibleCard title="Overview" icon="info" defaultOpen={true}>
              <Text style={styles.sectionContent}>{monument.description}</Text>
            </CollapsibleCard>
          )}

          {/* 2. Basic Information */}
          {hasBasicInfo && (
            <CollapsibleCard title="Basic Information" icon="file-text">
              <View style={styles.factsGrid}>
                {monument.alternativeNames && monument.alternativeNames.length > 0 && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Alternative Names</Text>
                    <Text style={styles.factValue}>{monument.alternativeNames.join(', ')}</Text>
                  </View>
                )}
                {monument.localNames && monument.localNames.length > 0 && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Local Names</Text>
                    <Text style={styles.factValue}>{monument.localNames.join(', ')}</Text>
                  </View>
                )}
                {monument.historicalNames && monument.historicalNames.length > 0 && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Historical Names</Text>
                    <Text style={styles.factValue}>{monument.historicalNames.join(', ')}</Text>
                  </View>
                )}
                {monument.district && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>District</Text>
                    <Text style={styles.factValue}>{monument.district}</Text>
                  </View>
                )}
                {monument.monumentType && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Type</Text>
                    <Text style={styles.factValue}>{monument.monumentType}</Text>
                  </View>
                )}
                {monument.historicalPeriod && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Period</Text>
                    <Text style={styles.factValue}>{monument.historicalPeriod}</Text>
                  </View>
                )}
                {monument.constructionYear && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Construction Year</Text>
                    <Text style={styles.factValue}>{monument.constructionYear}</Text>
                  </View>
                )}
                {monument.constructionPeriod && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Construction Period</Text>
                    <Text style={styles.factValue}>{monument.constructionPeriod}</Text>
                  </View>
                )}
                {monument.ruler && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Ruler/King</Text>
                    <Text style={styles.factValue}>{monument.ruler}</Text>
                  </View>
                )}
                {monument.builder && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Builder</Text>
                    <Text style={styles.factValue}>{monument.builder}</Text>
                  </View>
                )}
                {monument.architect && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Architect</Text>
                    <Text style={styles.factValue}>{monument.architect}</Text>
                  </View>
                )}
                {monument.coordinates && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Coordinates</Text>
                    <Text style={styles.factValue}>
                      {monument.coordinates.latitude.toFixed(4)}° N, {monument.coordinates.longitude.toFixed(4)}° E
                    </Text>
                  </View>
                )}
              </View>
            </CollapsibleCard>
          )}

          {/* Monument Photo Gallery */}
          {((monument.historicalImages && monument.historicalImages.length > 0) ||
            (monument.modernImages && monument.modernImages.length > 0) ||
            (monument.architectureImages && monument.architectureImages.length > 0) ||
            (monument.sculptureImages && monument.sculptureImages.length > 0) ||
            (monument.inscriptionImages && monument.inscriptionImages.length > 0) ||
            (monument.restorationImages && monument.restorationImages.length > 0)) && (
            <CollapsibleCard title="Monument Photo Gallery" icon="image">
              <View style={{ gap: SPACING.md }}>
                {/* Segmented control/headers for categories */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                  {[
                    { key: 'historical', label: 'Historical' },
                    { key: 'archival', label: 'Archival' },
                    { key: 'modern', label: 'Modern' },
                    { key: 'architecture', label: 'Architecture' },
                    { key: 'sculpture', label: 'Sculptures' },
                    { key: 'inscription', label: 'Inscriptions' },
                    { key: 'restoration', label: 'Restoration' }
                  ].map((tab) => {
                    const count = 
                      tab.key === 'historical' ? (monument.historicalImages || []).filter(img => img.imageType === 'historical').length :
                      tab.key === 'archival' ? (monument.historicalImages || []).filter(img => img.imageType === 'archival').length :
                      tab.key === 'modern' ? (monument.modernImages || []).length :
                      tab.key === 'architecture' ? (monument.architectureImages || []).length :
                      tab.key === 'sculpture' ? (monument.sculptureImages || []).length :
                      tab.key === 'inscription' ? (monument.inscriptionImages || []).length :
                      tab.key === 'restoration' ? (monument.restorationImages || []).length : 0;

                    if (count === 0) return null;

                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[
                          styles.detailTabBtn,
                          activeDetailsGalleryTab === tab.key && styles.detailTabBtnActive,
                          { marginRight: 8, height: 32 }
                        ]}
                        onPress={() => setActiveDetailsGalleryTab(tab.key as any)}
                      >
                        <Text style={[
                          styles.detailTabBtnText,
                          activeDetailsGalleryTab === tab.key && styles.detailTabBtnTextActive
                        ]}>
                          {tab.label} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Visual Grid of Images */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md }}>
                  {((
                    activeDetailsGalleryTab === 'historical' ? (monument.historicalImages || []).filter(img => img.imageType === 'historical') :
                    activeDetailsGalleryTab === 'archival' ? (monument.historicalImages || []).filter(img => img.imageType === 'archival') :
                    activeDetailsGalleryTab === 'modern' ? (monument.modernImages || []) :
                    activeDetailsGalleryTab === 'architecture' ? (monument.architectureImages || []) :
                    activeDetailsGalleryTab === 'sculpture' ? (monument.sculptureImages || []) :
                    activeDetailsGalleryTab === 'inscription' ? (monument.inscriptionImages || []) :
                    activeDetailsGalleryTab === 'restoration' ? (monument.restorationImages || []) : []
                  ) as ApiMonumentImage[]).map((img, idx) => (
                    <TouchableOpacity
                      key={img._id || img.id || String(idx)}
                      style={{ width: (width - SPACING.lg * 2 - SPACING.md * 2) / 2 - 8, gap: 4 }}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedZoomImage(img.imageUrl);
                        setZoomImageCaption(
                          `${img.title || 'Photograph'}\n` +
                          `${img.description ? `${img.description}\n` : ''}` +
                          `${img.year ? `Year: ${img.year}  ` : ''}` +
                          `${img.photographer ? `By: ${img.photographer}\n` : '\n'}` +
                          `${img.source ? `Source: ${img.source}  ` : ''}` +
                          `${img.license ? `License: ${img.license}\n` : '\n'}` +
                          `Status: ${img.verificationStatus === 'admin-verified' ? 'Verified Authentic Reference' : 'Unverified reference'}`
                        );
                      }}
                    >
                      <SafeImage source={getImageUrl(img.imageUrl)} style={{ width: '100%', height: 110, borderRadius: BORDER_RADIUS.md, resizeMode: 'cover' }} resizeMode="cover" />
                      <Text style={{ color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall, fontWeight: '600' }} numberOfLines={1}>
                        {img.title || 'Untitled'}
                      </Text>
                      {img.year && (
                        <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>
                          Year: {img.year}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </CollapsibleCard>
          )}

          {/* 3. Full History */}
          {(monument.fullHistory || monument.origin || monument.originalPurpose || monument.whyItWasBuilt || monument.historicalDevelopment || monument.historicalChanges || monument.historicalPersonalities) && (
            <CollapsibleCard title="Full History" icon="book-open">
              {monument.origin && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Origin</Text>
                  <Text style={styles.detailText}>{monument.origin}</Text>
                </View>
              )}
              {monument.originalPurpose && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Original Purpose</Text>
                  <Text style={styles.detailText}>{monument.originalPurpose}</Text>
                </View>
              )}
              {monument.whyItWasBuilt && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Why It Was Built</Text>
                  <Text style={styles.detailText}>{monument.whyItWasBuilt}</Text>
                </View>
              )}
              {monument.historicalPersonalities && monument.historicalPersonalities.length > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Historical Personalities</Text>
                  <Text style={styles.detailText}>{monument.historicalPersonalities.join(', ')}</Text>
                </View>
              )}
              {monument.historicalDevelopment && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Historical Development</Text>
                  <Text style={styles.detailText}>{monument.historicalDevelopment}</Text>
                </View>
              )}
              {monument.historicalChanges && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Historical Changes</Text>
                  <Text style={styles.detailText}>{monument.historicalChanges}</Text>
                </View>
              )}
              {monument.fullHistory && (
                <Text style={[styles.sectionContent, { marginTop: SPACING.sm }]}>{monument.fullHistory}</Text>
              )}
            </CollapsibleCard>
          )}

          {/* HISTORY & HERITAGE SECTION */}
          {monument.historySections && monument.historySections.length > 0 && (
            <CollapsibleCard title="History & Heritage" icon="book" defaultOpen={true}>
              {[...monument.historySections]
                .sort((a, b) => a.order - b.order)
                .map((sec, idx) => (
                  <View key={sec.id || idx} style={styles.historySectionBlock}>
                    <Text style={styles.historySectionTitle}>{sec.title}</Text>
                    <Text style={styles.sectionContent}>{sec.content}</Text>
                    {sec.imageUrls && sec.imageUrls.length > 0 && (
                      <View style={styles.historyImagesRow}>
                        {sec.imageUrls.map((imgUrl, imgIdx) => (
                          <TouchableOpacity
                            key={imgIdx}
                            onPress={() => setSelectedZoomImage(getImageUrl(imgUrl))}
                            activeOpacity={0.8}
                            style={styles.historyImageTouch}
                          >
                            <SafeImage source={getImageUrl(imgUrl)} style={styles.historyInlineImage} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
            </CollapsibleCard>
          )}

          {/* 4. Origin Story */}
          {monument.originStory && (
            <CollapsibleCard title="Origin Story" icon="sunrise">
              <Text style={styles.sectionContent}>{monument.originStory}</Text>
            </CollapsibleCard>
          )}

          {/* 5. Construction History */}
          {monument.constructionHistory && (
            <CollapsibleCard title="Construction History" icon="tool">
              <Text style={styles.sectionContent}>{monument.constructionHistory}</Text>
            </CollapsibleCard>
          )}

          {/* 6. Historical Timeline */}
          {hasTimeline && (
            <CollapsibleCard title="Historical Timeline" icon="clock">
              {(monument.historicalTimeline || []).map((t, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineLineContainer}>
                    <View style={styles.timelineDot} />
                    {idx < (monument.historicalTimeline || []).length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineTextContainer}>
                    <Text style={styles.timelineYearText}>{t.year}</Text>
                    <Text style={styles.timelineTitleText}>{t.title}</Text>
                    <Text style={styles.timelineDescriptionText}>{t.description}</Text>
                    {t.significance && (
                      <Text style={[styles.timelineDescriptionText, { fontStyle: 'italic', marginTop: 2, color: COLORS.gold }]}>
                        Significance: {t.significance}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </CollapsibleCard>
          )}

          {/* 7. Historical Events */}
          {hasEvents && (
            <CollapsibleCard title="Historical Events" icon="calendar">
              {(monument.historicalEvents || []).map((e, idx) => (
                <View key={idx} style={styles.eventCard}>
                  <Text style={styles.eventPeriod}>{e.period}</Text>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventDescription}>{e.description}</Text>
                </View>
              ))}
            </CollapsibleCard>
          )}

          {/* 8. Architecture */}
          {(monument.architecture || monument.architecturalStyle || monument.buildingMaterials || monument.architectureDescription || monument.layout || monument.uniqueArchitecturalFeatures) && (
            <CollapsibleCard title="Architecture" icon="layout">
              {monument.architecturalStyle && (
                <Text style={styles.subHeading}>Architectural Style: {monument.architecturalStyle}</Text>
              )}
              {monument.buildingMaterials && (
                <Text style={styles.subHeading}>Building Materials: {monument.buildingMaterials}</Text>
              )}
              {monument.architectureDescription && (
                <Text style={[styles.sectionContent, { marginBottom: SPACING.sm }]}>{monument.architectureDescription}</Text>
              )}
              {monument.layout && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Layout</Text>
                  <Text style={styles.detailText}>{monument.layout}</Text>
                </View>
              )}
              {monument.uniqueArchitecturalFeatures && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Unique Architectural Features</Text>
                  <Text style={styles.detailText}>{monument.uniqueArchitecturalFeatures}</Text>
                </View>
              )}
              {monument.architecture && (
                <Text style={styles.sectionContent}>{monument.architecture}</Text>
              )}
            </CollapsibleCard>
          )}

          {/* 9. Structural Features */}
          {hasStructural && (
            <CollapsibleCard title="Structural Features" icon="grid">
              {monument.structuralFeatures && (
                <Text style={styles.sectionContent}>{monument.structuralFeatures}</Text>
              )}
              {monument.entrance && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Entrance</Text>
                  <Text style={styles.detailText}>{monument.entrance}</Text>
                </View>
              )}
              {(monument.gopuramDetails || monument.gopuram) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Gopuram Details</Text>
                  <Text style={styles.detailText}>{monument.gopuramDetails || monument.gopuram}</Text>
                </View>
              )}
              {(monument.vimanaDetails || monument.vimana) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Vimana Details</Text>
                  <Text style={styles.detailText}>{monument.vimanaDetails || monument.vimana}</Text>
                </View>
              )}
              {(monument.mandapaDetails || monument.mandapa) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Mandapa Details</Text>
                  <Text style={styles.detailText}>{monument.mandapaDetails || monument.mandapa}</Text>
                </View>
              )}
              {monument.pillars && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pillars & Columns</Text>
                  <Text style={styles.detailText}>{monument.pillars}</Text>
                </View>
              )}
              {monument.sculptures && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sculptural Work</Text>
                  <Text style={styles.detailText}>{monument.sculptures}</Text>
                </View>
              )}
              {monument.materials && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Materials Details</Text>
                  <Text style={styles.detailText}>{monument.materials}</Text>
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 10. Sculptures and Inscriptions */}
          {hasSculptures && (
            <CollapsibleCard title="Sculptures and Inscriptions" icon="feather">
              {monument.sculptureDetails && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sculptures</Text>
                  <Text style={styles.detailText}>{monument.sculptureDetails}</Text>
                </View>
              )}
              {monument.pillarDetails && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pillars</Text>
                  <Text style={styles.detailText}>{monument.pillarDetails}</Text>
                </View>
              )}
              {monument.ceilingDetails && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ceiling</Text>
                  <Text style={styles.detailText}>{monument.ceilingDetails}</Text>
                </View>
              )}
              {monument.inscriptionDetails && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Inscriptions</Text>
                  <Text style={styles.detailText}>{monument.inscriptionDetails}</Text>
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 11. Engineering */}
          {monument.engineeringFeatures && (
            <CollapsibleCard title="Engineering" icon="cpu">
              <Text style={styles.sectionContent}>{monument.engineeringFeatures}</Text>
            </CollapsibleCard>
          )}

          {/* 12. Cultural Importance */}
          {hasCulture && (
            <CollapsibleCard title="Cultural Importance" icon="award">
              {monument.culturalImportance && (
                <Text style={styles.sectionContent}>{monument.culturalImportance}</Text>
              )}
              {monument.socialImportance && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Social Role</Text>
                  <Text style={styles.detailText}>{monument.socialImportance}</Text>
                </View>
              )}
              {monument.artisticImportance && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Artistic Value</Text>
                  <Text style={styles.detailText}>{monument.artisticImportance}</Text>
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 13. Religious Importance */}
          {monument.religiousImportance && (
            <CollapsibleCard title="Religious Importance" icon="heart">
              <Text style={styles.sectionContent}>{monument.religiousImportance}</Text>
            </CollapsibleCard>
          )}

          {/* 14. Festivals and Rituals */}
          {hasFestivals && (
            <CollapsibleCard title="Festivals and Rituals" icon="star">
              {monument.culturalPractices && (
                <Text style={styles.sectionContent}>{monument.culturalPractices}</Text>
              )}
              {monument.traditionalPractices && (
                <Text style={[styles.sectionContent, { marginTop: SPACING.xs }]}>
                  {monument.traditionalPractices}
                </Text>
              )}
              {monument.festivals && monument.festivals.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Key Festivals</Text>
                  {monument.festivals.map((f, idx) => (
                    <Text key={idx} style={styles.listItem}>• {f}</Text>
                  ))}
                </View>
              )}
              {monument.rituals && monument.rituals.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Daily / Periodic Rituals</Text>
                  {monument.rituals.map((r, idx) => (
                    <Text key={idx} style={styles.listItem}>• {r}</Text>
                  ))}
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 15. Legends and Stories */}
          {hasLegends && (
            <CollapsibleCard title="Legends and Stories" icon="message-circle">
              {monument.mythology && (
                <Text style={styles.sectionContent}>{monument.mythology}</Text>
              )}
              {monument.legends && monument.legends.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Legends</Text>
                  {monument.legends.map((l, idx) => (
                    <Text key={idx} style={styles.listItem}>• {l}</Text>
                  ))}
                </View>
              )}
              {monument.localStories && monument.localStories.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Local Stories</Text>
                  {monument.localStories.map((s, idx) => (
                    <Text key={idx} style={styles.listItem}>• {s}</Text>
                  ))}
                </View>
              )}
              {monument.interestingStories && monument.interestingStories.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Interesting Stories</Text>
                  {monument.interestingStories.map((s, idx) => (
                    <Text key={idx} style={styles.listItem}>• {s}</Text>
                  ))}
                </View>
              )}
              {monument.mythologicalStories && monument.mythologicalStories.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Mythological Stories</Text>
                  {monument.mythologicalStories.map((s, idx) => (
                    <Text key={idx} style={styles.listItem}>• {s}</Text>
                  ))}
                </View>
              )}
              {monument.localTraditions && monument.localTraditions.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>Local Traditions</Text>
                  {monument.localTraditions.map((t, idx) => (
                    <Text key={idx} style={styles.listItem}>• {t}</Text>
                  ))}
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 16. Preservation and Restoration */}
          {hasPreservation && (
            <CollapsibleCard title="Preservation and Restoration" icon="shield">
              {monument.currentCondition && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Current Condition</Text>
                  <Text style={styles.detailText}>{monument.currentCondition}</Text>
                </View>
              )}
              {monument.conservationAuthority && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Conservation Authority</Text>
                  <Text style={styles.detailText}>{monument.conservationAuthority}</Text>
                </View>
              )}
              {monument.preservationHistory && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Preservation History</Text>
                  <Text style={styles.detailText}>{monument.preservationHistory}</Text>
                </View>
              )}
              {monument.restorationHistory && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Restoration History</Text>
                  <Text style={styles.detailText}>{monument.restorationHistory}</Text>
                </View>
              )}
              {monument.damageHistory && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Damage History</Text>
                  <Text style={styles.detailText}>{monument.damageHistory}</Text>
                </View>
              )}
              {monument.conservationEfforts && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Conservation Efforts</Text>
                  <Text style={styles.detailText}>{monument.conservationEfforts}</Text>
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 17. Heritage Status */}
          {hasHeritage && (
            <CollapsibleCard title="Heritage Status" icon="globe">
              <View style={styles.factsGrid}>
                {monument.heritageStatus && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Status</Text>
                    <Text style={styles.factValue}>{monument.heritageStatus}</Text>
                  </View>
                )}
                {monument.protectedStatus && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Protected Status</Text>
                    <Text style={styles.factValue}>{monument.protectedStatus}</Text>
                  </View>
                )}
                {monument.unescoStatus && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>UNESCO Status</Text>
                    <Text style={styles.factValue}>{monument.unescoStatus}</Text>
                  </View>
                )}
                {monument.unescoYear && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Year Inscribed</Text>
                    <Text style={styles.factValue}>{monument.unescoYear}</Text>
                  </View>
                )}
                {monument.heritageRecognition && (
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Recognition</Text>
                    <Text style={styles.factValue}>{monument.heritageRecognition}</Text>
                  </View>
                )}
              </View>
            </CollapsibleCard>
          )}

          {/* 18. Visitor Information */}
          {hasVisitor && (
            <CollapsibleCard title="Visitor Information" icon="map">
              {monument.openingHours && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Opening Hours</Text>
                  <Text style={styles.detailText}>{monument.openingHours}</Text>
                </View>
              )}
              {monument.openingInformation && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Opening Information</Text>
                  <Text style={styles.detailText}>{monument.openingInformation}</Text>
                </View>
              )}
              {monument.bestTimeToVisit && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Best Time to Visit</Text>
                  <Text style={styles.detailText}>{monument.bestTimeToVisit}</Text>
                </View>
              )}
              {monument.entryFee && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Entry Fee</Text>
                  <Text style={styles.detailText}>{monument.entryFee}</Text>
                </View>
              )}
              {monument.dressCode && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Dress Code</Text>
                  <Text style={styles.detailText}>{monument.dressCode}</Text>
                </View>
              )}
              {monument.dressGuidelines && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Dress Guidelines</Text>
                  <Text style={styles.detailText}>{monument.dressGuidelines}</Text>
                </View>
              )}
              {monument.photographyRules && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Photography Rules</Text>
                  <Text style={styles.detailText}>{monument.photographyRules}</Text>
                </View>
              )}
              {monument.accessibility && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Accessibility</Text>
                  <Text style={styles.detailText}>{monument.accessibility}</Text>
                </View>
              )}
              {monument.visitorGuidelines && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Visitor Guidelines</Text>
                  <Text style={styles.detailText}>{monument.visitorGuidelines}</Text>
                </View>
              )}
              {monument.howToReach && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>How to Reach</Text>
                  <Text style={styles.detailText}>{monument.howToReach}</Text>
                </View>
              )}
              {monument.visitingInformation && (
                <Text style={[styles.sectionContent, { marginTop: SPACING.sm }]}>
                  {monument.visitingInformation}
                </Text>
              )}
            </CollapsibleCard>
          )}

          {/* 19. Interesting Facts */}
          {hasFacts && (
            <CollapsibleCard title="Interesting Facts" icon="zap">
              {monument.interestingFacts && monument.interestingFacts.length > 0 && (
                <View style={styles.listSection}>
                  {monument.interestingFacts.map((fact, index) => (
                    <Text key={index} style={styles.listItem}>• {fact}</Text>
                  ))}
                </View>
              )}
              {monument.didYouKnow && monument.didYouKnow.length > 0 && (
                <View style={[styles.listSection, { marginTop: SPACING.sm }]}>
                  <Text style={styles.listSectionTitle}>Did You Know?</Text>
                  {monument.didYouKnow.map((fact, index) => (
                    <Text key={index} style={styles.listItem}>• {fact}</Text>
                  ))}
                </View>
              )}
              {monument.importantFacts && monument.importantFacts.length > 0 && (
                <View style={[styles.listSection, { marginTop: SPACING.sm }]}>
                  <Text style={styles.listSectionTitle}>Important Facts</Text>
                  {monument.importantFacts.map((fact, index) => (
                    <Text key={index} style={styles.listItem}>• {fact}</Text>
                  ))}
                </View>
              )}
              {monument.architecturalHighlights && monument.architecturalHighlights.length > 0 && (
                <View style={[styles.listSection, { marginTop: SPACING.sm }]}>
                  <Text style={styles.listSectionTitle}>Architectural Highlights</Text>
                  {monument.architecturalHighlights.map((fact, index) => (
                    <Text key={index} style={styles.listItem}>• {fact}</Text>
                  ))}
                </View>
              )}
              {monument.historicalHighlights && monument.historicalHighlights.length > 0 && (
                <View style={[styles.listSection, { marginTop: SPACING.sm }]}>
                  <Text style={styles.listSectionTitle}>Historical Highlights</Text>
                  {monument.historicalHighlights.map((fact, index) => (
                    <Text key={index} style={styles.listItem}>• {fact}</Text>
                  ))}
                </View>
              )}
            </CollapsibleCard>
          )}

          {/* 20. Nearby Places */}
          {hasNearby && (
            <CollapsibleCard title="Nearby Places" icon="navigation">
              <View style={styles.listSection}>
                {(monument.nearbyPlaces || []).map((place, index) => (
                  <Text key={index} style={styles.listItem}>• {place}</Text>
                ))}
              </View>
            </CollapsibleCard>
          )}
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* Voice Assistant Modal */}
      <VoiceAssistant
        isVisible={isAssistantVisible}
        onClose={() => setIsAssistantVisible(false)}
        monumentId={monument.id}
        monumentName={monument.name}
      />



      {/* Image Zoom Modal */}
      <Modal
        visible={!!selectedZoomImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectedZoomImage(null);
          setZoomImageCaption(null);
        }}
      >
        <TouchableOpacity
          style={styles.zoomModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setSelectedZoomImage(null);
            setZoomImageCaption(null);
          }}
        >
          <SafeAreaView style={styles.zoomModalContent}>
            <TouchableOpacity
              style={styles.closeZoomBtn}
              onPress={() => {
                setSelectedZoomImage(null);
                setZoomImageCaption(null);
              }}
            >
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
            {selectedZoomImage && (
              <View style={{ width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
                <SafeImage source={getImageUrl(selectedZoomImage)} style={styles.zoomedImage} resizeMode="contain" />
                {zoomImageCaption && (
                  <View style={{ padding: SPACING.md, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: BORDER_RADIUS.md, marginTop: SPACING.md, marginHorizontal: SPACING.lg }}>
                    <Text style={{ color: '#FFF', textAlign: 'center', ...TYPOGRAPHY.bodySmall }}>
                      {zoomImageCaption}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  assistantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  assistantBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  assistantIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantBannerTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    letterSpacing: 1,
  },
  assistantBannerSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
  },
  imageContainer: {
    height: 320,
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.4)',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(18, 18, 18, 0.6)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(18, 18, 18, 0.5)',
  },
  overlayHeader: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 18, 18, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageBadge: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  imageBadgeText: {
    color: COLORS.background,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  infoContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
    lineHeight: 34,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationText: {
    color: COLORS.goldMuted,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '500',
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flex: 1,
  },
  metaDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  metaLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xl,
  },
  gpsText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  sectionContent: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 22,
  },
  preservationBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shieldIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  preservationContent: {
    flex: 1,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
  },
  footerSpacing: {
    height: 40,
  },
  view3dButton: {
    backgroundColor: COLORS.gold,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  view3dButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '800',
    letterSpacing: 1,
  },
  threeDSection: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  threeDSectionTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  threeDButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  threeDErrorText: {
    color: COLORS.danger,
    ...TYPOGRAPHY.bodySmall,
    marginBottom: SPACING.sm,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  cardContent: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  factsGrid: {
    width: '100%',
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  factLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  factValue: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  subHeading: {
    color: COLORS.goldMuted,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  detailItem: {
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: SPACING.xs,
  },
  detailLabel: {
    color: COLORS.goldMuted,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
  },
  listSection: {
    marginTop: SPACING.xs,
  },
  listSectionTitle: {
    color: COLORS.goldMuted,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    marginTop: SPACING.xs,
    marginBottom: 4,
  },
  listItem: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
    marginBottom: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  timelineLineContainer: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 16,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    marginTop: 6,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineYearText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
  },
  timelineTitleText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
  },
  timelineDescriptionText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
  },
  eventCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  eventPeriod: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  eventTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    marginVertical: 2,
  },
  eventDescription: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
  },
  historySectionBlock: {
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: SPACING.md,
  },
  historySectionTitle: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  historyImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  historyImageTouch: {
    width: (width - 72) / 3,
    height: (width - 72) / 3,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyInlineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeZoomBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomedImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  detailTabBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    height: 38,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTabBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  detailTabBtnText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  detailTabBtnTextActive: {
    color: COLORS.background,
    fontWeight: '700',
  },
});
export default MonumentDetailsScreen;
