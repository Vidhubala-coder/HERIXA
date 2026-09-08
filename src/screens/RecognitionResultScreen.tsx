import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from "../constants/theme";
import { SafeImage } from "../components/SafeImage";
import { getImageUrl } from "../services/monumentService";
import { textToSpeechService } from "../services/textToSpeechService";
import { useFavorites } from "../context/FavoritesContext";
import { SupportedLanguage } from "../utils/narrationBuilder";
import { apiFetch } from "../services/api";
import { HowToExperienceVoiceGuide } from "../components/HowToExperienceVoiceGuide";
import { HeritageHistoryVoiceCard } from "../components/HeritageHistoryVoiceCard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RecognitionResult">;

const VALID_LANGS: SupportedLanguage[] = ["en", "ta", "hi", "te", "ml", "kn"];

interface RichDetails {
  location?: string;
  state?: string;
  period?: string;
  architecturalStyle?: string;
  architecturalHighlights?: string[];
}

export const RecognitionResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { result } = route.params;
  const { selectedLanguage, isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(result.monumentId);

  const lang: SupportedLanguage = VALID_LANGS.includes(selectedLanguage as SupportedLanguage)
    ? (selectedLanguage as SupportedLanguage)
    : "en";

  const confidencePercent = (result.confidence * 100).toFixed(1);

  // Audio player ownership refs
  const historyStopRef = useRef<() => void>(() => {});
  const hteStopRef = useRef<() => void>(() => {});

  const handleHistoryPlaybackStart = useCallback(() => {
    hteStopRef.current();
  }, []);

  const handleHtePlaybackStart = useCallback(() => {
    historyStopRef.current();
  }, []);

  // Enriched monument data
  const [richDetails, setRichDetails] = useState<RichDetails | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRich = async () => {
      try {
        const data = await apiFetch(`/api/monuments/${result.monumentId}/narration`, { method: "GET" });
        if (data?.success && data.data && isMounted) {
          const m = data.data;
          setRichDetails({
            location: m.location,
            state: m.state,
            period: m.period,
            architecturalStyle: m.architecturalStyle,
            architecturalHighlights: m.architecturalHighlights,
          });
        }
      } catch (e) {
        console.warn("[RecognitionResult] Rich details fetch error:", e);
      }
    };
    fetchRich();
    return () => { isMounted = false; };
  }, [result.monumentId]);

  useFocusEffect(useCallback(() => {
    return () => {
      historyStopRef.current();
      hteStopRef.current();
      textToSpeechService.stop().catch(() => {});
    };
  }, []));

  const navigateAway = (fn: () => void) => {
    historyStopRef.current();
    hteStopRef.current();
    textToSpeechService.stop().catch(() => {});
    fn();
  };

  const toggleBookmark = () => {
    if (favorited) {
      removeFavorite(result.monumentId);
    } else {
      addFavorite(result.monumentId);
    }
  };

  const highlights = richDetails?.architecturalHighlights || result.architecturalHighlights || [
    "Monolithic scale and Dravidian stone architecture",
    "Intricate granite carvings and historical inscriptions",
    "Preserved sanctuary and Vimana structural tower",
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateAway(() => navigation.navigate("Main", { screen: "SmartScan" }))}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monument Identified</Text>
        <TouchableOpacity style={styles.bookmarkBtn} onPress={toggleBookmark} activeOpacity={0.8}>
          <Ionicons
            name={favorited ? "bookmark" : "bookmark-outline"}
            size={20}
            color={favorited ? COLORS.gold : COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Monument Image Banner */}
        <View style={styles.imgCard}>
          <SafeImage
            source={getImageUrl(result.imageUrl || result.monumentName)}
            style={styles.img}
            resizeMode="cover"
          />
        </View>

        {/* Circular Confidence & Title Header */}
        <View style={styles.resultHeaderCard}>
          <View style={styles.confidenceCircleOuter}>
            <View style={styles.confidenceCircleInner}>
              <Text style={styles.confidencePercentText}>{confidencePercent}%</Text>
              <Text style={styles.confidenceLabelText}>CONFIDENCE</Text>
            </View>
          </View>

          <View style={styles.resultTitleContainer}>
            <View style={styles.aiBadge}>
              <Feather name="check-circle" size={12} color={COLORS.white} style={{ marginRight: 4 }} />
              <Text style={styles.aiBadgeText}>AI RECOGNITION MATCH</Text>
            </View>

            <Text style={styles.monumentTitle}>{result.monumentName}</Text>
            <Text style={styles.monumentSubtitle}>
              {richDetails?.location || 'Thanjavur, Tamil Nadu'} • {result.dynasty || richDetails?.period || 'Chola Dynasty'}
            </Text>
          </View>
        </View>

        {/* 🎙️ 1. HERITAGE HISTORY VOICE CARD (Starts narration automatically on land) */}
        <HeritageHistoryVoiceCard
          monumentId={result.monumentId}
          monumentName={result.monumentName}
          dynasty={result.dynasty}
          initialLanguage={lang}
          autoPlay={true}
          onPlaybackStart={handleHistoryPlaybackStart}
          stopSignalRef={historyStopRef}
        />

        {/* 🎧 2. HOW TO EXPERIENCE VOICE GUIDE */}
        <HowToExperienceVoiceGuide
          monumentId={result.monumentId}
          monumentName={result.monumentName}
          initialLanguage={lang}
          onOpenFullProtocol={() => navigateAway(() => navigation.navigate("MonumentDetails", { monumentId: result.monumentId }))}
          onPlaybackStart={handleHtePlaybackStart}
          stopSignalRef={hteStopRef}
        />

        {/* Metadata Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Key Details</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{richDetails?.location || 'Thanjavur, Tamil Nadu'}</Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Dynasty</Text>
              <Text style={styles.metaValue}>{result.dynasty || richDetails?.period || 'Chola Dynasty'}</Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Era / Period</Text>
              <Text style={styles.metaValue}>{richDetails?.period || '11th Century CE'}</Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Architecture Style</Text>
              <Text style={styles.metaValue}>{richDetails?.architecturalStyle || 'Dravidian Architecture'}</Text>
            </View>
          </View>
        </View>

        {/* Architecture Highlights */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Architecture Highlights</Text>
          {highlights.map((item, idx) => (
            <View key={idx} style={styles.highlightRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => navigateAway(() => navigation.navigate("MonumentDetails", { monumentId: result.monumentId }))}
          activeOpacity={0.85}
        >
          <Feather name="book-open" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={styles.primaryActionBtnText}>Read Complete History</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActionRow}>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={toggleBookmark}
            activeOpacity={0.85}
          >
            <Ionicons
              name={favorited ? "bookmark" : "bookmark-outline"}
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.secondaryActionBtnText}>
              {favorited ? "Saved in Collection" : "Save to Collection"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => navigateAway(() => navigation.navigate("MonumentDetails", { monumentId: result.monumentId }))}
            activeOpacity={0.85}
          >
            <Feather name="map-pin" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionBtnText}>Plan a Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceIvory,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: "800",
  },
  bookmarkBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceIvory,
  },
  scroll: {
    padding: SPACING.lg,
  },
  imgCard: {
    height: 200,
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceIvory,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  img: {
    width: "100%",
    height: "100%",
  },
  resultHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  confidenceCircleOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  confidenceCircleInner: {
    alignItems: "center",
  },
  confidencePercentText: {
    color: COLORS.white,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "800",
    fontSize: 14,
  },
  confidenceLabelText: {
    color: COLORS.goldLight,
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    fontWeight: "800",
  },
  resultTitleContainer: {
    flex: 1,
  },
  aiBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  aiBadgeText: {
    color: COLORS.white,
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: "800",
  },
  monumentTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: "800",
  },
  monumentSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionCardTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: "800",
    marginBottom: SPACING.md,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  metaItem: {
    width: "46%",
    backgroundColor: COLORS.surfaceIvory,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderWarm,
  },
  metaLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  metaValue: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: "700",
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 7,
  },
  highlightText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    gap: SPACING.md,
  },
  primaryActionBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: COLORS.white,
    ...TYPOGRAPHY.button,
    fontWeight: "800",
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryActionBtnText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.button,
    fontWeight: "700",
    fontSize: 12,
  },
});

export default RecognitionResultScreen;
