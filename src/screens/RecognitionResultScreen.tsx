/**
 * HERIXA RecognitionResultScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * After monument recognition, this screen:
 *  1. Immediately builds a local narration from RecognitionResultData
 *  2. Starts speaking via chunked TTS (90-120 seconds)
 *  3. Concurrently fetches richer monument data from /api/monuments/:id/narration
 *  4. Uses richer data for REPLAY and future interactions
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from "../constants/theme";
import { SafeImage } from "../components/SafeImage";
import { getImageUrl } from "../services/monumentService";
import { textToSpeechService } from "../services/textToSpeechService";
import { useFavorites } from "../context/FavoritesContext";
import { buildNarration, splitIntoChunks, NarrationContext, SupportedLanguage } from "../utils/narrationBuilder";
import { getLanguageByCode } from "../config/languages";
import { apiFetch } from "../services/api";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RecognitionResult">;
type VoiceState = "idle" | "speaking" | "stopped" | "loading";

const VALID_LANGS: SupportedLanguage[] = ["en", "ta", "hi", "te", "ml", "kn"];
const AUTO_NARRATE_KEY = "@heritage_ar_auto_narrate";
// Approx words-per-minute for Indian language TTS engines
const WORDS_PER_MIN = 120;

function estimateDurationLabel(text: string): string {
  const words = text.split(/\s+/).length;
  const secs = Math.round((words / WORDS_PER_MIN) * 60);
  if (secs < 60) return `~${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `~${m} min ${s} sec` : `~${m} min`;
}

export const RecognitionResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { result } = route.params;
  const { selectedLanguage } = useFavorites();

  const lang: SupportedLanguage = VALID_LANGS.includes(selectedLanguage as SupportedLanguage)
    ? (selectedLanguage as SupportedLanguage)
    : "en";

  const langConfig = getLanguageByCode(lang);
  const isHighConfidence = result.confidence >= 0.80;
  const isMediumConfidence = result.confidence >= 0.35 && !isHighConfidence;
  const confidencePercent = `${(result.confidence * 100).toFixed(0)}%`;

  // ── Voice state ────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>("loading");
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [durationLabel, setDurationLabel] = useState("");
  const isMountedRef = useRef(true);
  const hasSpokenRef = useRef<string>("");
  const speakingAnim = useRef(new Animated.Value(1)).current;

  // ── Enriched monument data ─────────────────────────────────────────────
  const [richCtx, setRichCtx] = useState<NarrationContext | null>(null);
  const richCtxRef = useRef<NarrationContext | null>(null);

  const hasPreviews = !!(richCtx?.heritagePreviewImages && richCtx.heritagePreviewImages.filter(img => img.enabled !== false).length > 0 && richCtx.interactivePreviewEnabled !== false);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);


  // ── Pulsing animation while speaking ──────────────────────────────────
  useEffect(() => {
    if (voiceState === "speaking") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(speakingAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(speakingAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      speakingAnim.stopAnimation();
      Animated.timing(speakingAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [voiceState]);

  // ── Build narration context from RecognitionResultData (immediate) ─────
  const buildBaseCtx = useCallback((): NarrationContext => ({
    monumentId: result.monumentId,
    monumentName: result.monumentName,
    confidence: result.confidence,
    dynasty: result.dynasty,
    architecturalHighlights: result.architecturalHighlights,
    imageUrl: result.imageUrl,
  }), [result]);

  // ── Fetch rich monument data from backend (background) ────────────────
  useEffect(() => {
    const fetchRich = async () => {
      try {
        const data = await apiFetch(`/api/monuments/${result.monumentId}/narration`, { method: "GET" });
        if (data?.success && data.data && isMountedRef.current) {
          const m = data.data;
          const ctx: NarrationContext = {
            monumentId: result.monumentId,
            monumentName: m.name || result.monumentName,
            confidence: result.confidence,
            dynasty: m.dynasty || result.dynasty,
            architecturalHighlights: m.architecturalHighlights || result.architecturalHighlights,
            imageUrl: result.imageUrl,
            location: m.location,
            state: m.state,
            district: m.district,
            period: m.period,
            ruler: m.ruler,
            builder: m.builder,
            architect: m.architect,
            description: m.description,
            historicalBackground: m.historicalBackground,
            historicalSignificance: m.historicalSignificance,
            architecture: m.architecture,
            culturalSignificance: m.culturalSignificance,
            architecturalStyle: m.architecturalStyle,
            constructionPeriod: m.constructionPeriod,
            constructionHistory: m.constructionHistory,
            whyItWasBuilt: m.whyItWasBuilt,
            originStory: m.originStory,
            shortHistory: m.shortHistory,
            fullHistory: m.fullHistory,
            vimanaDetails: m.vimanaDetails,
            gopuramDetails: m.gopuramDetails,
            mandapaDetails: m.mandapaDetails,
            sculptureDetails: m.sculptureDetails,
            pillarDetails: m.pillarDetails,
            inscriptionDetails: m.inscriptionDetails,
            buildingMaterials: m.buildingMaterials,
            uniqueArchitecturalFeatures: m.uniqueArchitecturalFeatures,
            engineeringFeatures: m.engineeringFeatures,
            structuralFeatures: m.structuralFeatures,
            culturalImportance: m.culturalImportance,
            religiousImportance: m.religiousImportance,
            artisticImportance: m.artisticImportance,
            unescoStatus: m.unescoStatus,
            unescoYear: m.unescoYear,
            heritageStatus: m.heritageStatus,
            heritageRecognition: m.heritageRecognition,
            bestTimeToVisit: m.bestTimeToVisit,
            visitingInformation: m.visitingInformation,
            nearbyPlaces: m.nearbyPlaces,
            interestingFacts: m.interestingFacts,
            didYouKnow: m.didYouKnow,
            preservationStatus: m.preservationStatus,
            legends: m.legends,
            mythology: m.mythology,
          };
          richCtxRef.current = ctx;
          setRichCtx(ctx);
        }
      } catch (e) {
        console.warn("[RecognitionResult] Rich narration fetch failed:", e);
      }
    };
    fetchRich();
  }, [result.monumentId]);

  // ── Core speak function ────────────────────────────────────────────────
  const startNarration = useCallback(async (ctx: NarrationContext, langOverride?: SupportedLanguage) => {
    const l = langOverride || lang;
    const narration = buildNarration(ctx, l);
    if (!narration) return;

    const chunks = splitIntoChunks(narration, 480);
    if (isMountedRef.current) {
      setDurationLabel(estimateDurationLabel(narration));
      setChunkProgress({ current: 0, total: chunks.length });
    }

    await textToSpeechService.speakChunked(
      chunks,
      l,
      () => { if (isMountedRef.current) setVoiceState("speaking"); },
      (idx, total) => { if (isMountedRef.current) setChunkProgress({ current: idx + 1, total }); },
      () => { if (isMountedRef.current) setVoiceState("stopped"); },
      () => { if (isMountedRef.current) setVoiceState("stopped"); }
    );
  }, [lang]);

  // ── Auto-narrate on mount ──────────────────────────────────────────────
  const resultKey = `${result.monumentId}_${result.confidence}`;
  useEffect(() => {
    if (hasSpokenRef.current === resultKey) return;
    hasSpokenRef.current = resultKey;

    const timer = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        const pref = await AsyncStorage.getItem(AUTO_NARRATE_KEY);
        if (pref === "false") { if (isMountedRef.current) setVoiceState("idle"); return; }
      } catch (_) {}
      // Start with base context immediately, richer data used on replay
      startNarration(richCtxRef.current ?? buildBaseCtx());
    }, 500);

    return () => clearTimeout(timer);
  }, [resultKey]);

  // ── Cleanup on screen leave ────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    return () => {
      textToSpeechService.stop().catch(() => {});
      if (isMountedRef.current) setVoiceState("idle");
    };
  }, []));

  // ── Voice controls ─────────────────────────────────────────────────────
  const handleStop = async () => {
    await textToSpeechService.stop();
    if (isMountedRef.current) setVoiceState("stopped");
  };

  const handleReplay = () => {
    hasSpokenRef.current = "";
    // Use richest available context for replay
    startNarration(richCtxRef.current ?? buildBaseCtx());
  };

  const handlePlay = () => {
    startNarration(richCtxRef.current ?? buildBaseCtx());
  };

  const navigateAway = (fn: () => void) => {
    textToSpeechService.stop().catch(() => {});
    fn();
  };

  // ── Voice control bar ──────────────────────────────────────────────────
  const renderVoiceBar = () => {
    const isSpeaking = voiceState === "speaking";
    const isStopped = voiceState === "stopped";
    const isIdle = voiceState === "idle";

    const progressLabel = isSpeaking && chunkProgress.total > 0
      ? ` (${chunkProgress.current}/${chunkProgress.total})`
      : "";

    const speakingLine = {
      en: `Speaking in ${langConfig.displayName}${progressLabel}`,
      ta: `${langConfig.nativeName} இல் பேசுகிறது${progressLabel}`,
      hi: `${langConfig.nativeName} में बोल रहा है${progressLabel}`,
      te: `${langConfig.nativeName} లో మాట్లాడుతోంది${progressLabel}`,
      ml: `${langConfig.nativeName} ൽ സംസാരിക്കുന്നു${progressLabel}`,
      kn: `${langConfig.nativeName} ನಲ್ಲಿ ಮಾತನಾಡುತ್ತಿದೆ${progressLabel}`,
    }[lang];

    const stoppedLine = {
      en: "Narration stopped",
      ta: "குரல் விளக்கம் நிறுத்தப்பட்டது",
      hi: "आवाज़ रुकी हुई है",
      te: "వర్ణన ఆగిపోయింది",
      ml: "നറേഷൻ നിർത്തി",
      kn: "ನಿರೂಪಣೆ ನಿಲ್ಲಿಸಲಾಗಿದೆ",
    }[lang];

    const idleLine = {
      en: "Heritage Guide ready",
      ta: "பாரம்பரிய வழிகாட்டி தயார்",
      hi: "हेरिटेज गाइड तैयार",
      te: "హెరిటేజ్ గైడ్ సిద్ధంగా ఉంది",
      ml: "ഹെരിറ്റേജ് ഗൈഡ് തയ്യാറാണ്",
      kn: "ಹೆರಿಟೇಜ್ ಗೈಡ್ ಸಿದ್ಧ",
    }[lang];

    const playLabel = {
      en: "PLAY GUIDE",
      ta: "தொடக்கு",
      hi: "शुरू करें",
      te: "ప్లే",
      ml: "ആരംഭിക്കുക",
      kn: "ಪ್ಲೇ",
    }[lang];

    const replayLabel = {
      en: "REPLAY",
      ta: "மீண்டும்",
      hi: "दोहराएं",
      te: "రీప్లే",
      ml: "വീണ്ടും",
      kn: "ಮರುಪ್ಲೇ",
    }[lang];

    const stopLabel = {
      en: "STOP",
      ta: "நிறுத்து",
      hi: "रोकें",
      te: "ఆపండి",
      ml: "നിർത്തുക",
      kn: "ನಿಲ್ಲಿಸಿ",
    }[lang];

    return (
      <View style={styles.voiceCard}>
        <View style={styles.voiceCardHeader}>
          <Animated.View style={[styles.voiceIcon, { transform: [{ scale: isSpeaking ? speakingAnim : 1 }] }]}>
            <Ionicons
              name={isSpeaking ? "volume-high" : "volume-medium-outline"}
              size={20}
              color={isSpeaking ? COLORS.gold : COLORS.textSecondary}
            />
          </Animated.View>
          <View style={styles.voiceCardInfo}>
            <Text style={styles.voiceCardTitle}>HERIXA Heritage Guide</Text>
            <Text style={[styles.voiceCardStatus, isSpeaking && styles.voiceCardStatusActive]} numberOfLines={1}>
              {isSpeaking ? speakingLine : isStopped ? stoppedLine : idleLine}
            </Text>
            {durationLabel && isSpeaking && (
              <Text style={styles.voiceDuration}>⏱ {durationLabel}</Text>
            )}
          </View>
        </View>

        <View style={styles.voiceControls}>
          {isSpeaking ? (
            <TouchableOpacity style={[styles.voiceBtn, styles.voiceBtnStop]} onPress={handleStop} activeOpacity={0.8}>
              <Feather name="square" size={13} color={COLORS.textPrimary} />
              <Text style={styles.voiceBtnText}>{stopLabel}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.voiceBtn, styles.voiceBtnPlay]} onPress={isStopped ? handleReplay : handlePlay} activeOpacity={0.8}>
                <Feather name={isStopped ? "refresh-cw" : "play"} size={13} color={COLORS.background} />
                <Text style={[styles.voiceBtnText, { color: COLORS.background }]}>{isStopped ? replayLabel : playLabel}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ── Confidence badge ───────────────────────────────────────────────────
  const renderBadge = () => (
    <View style={[styles.badge, isHighConfidence ? styles.badgeHigh : styles.badgeMedium]}>
      <Feather name={isHighConfidence ? "check-circle" : "help-circle"} size={15} color={isHighConfidence ? COLORS.background : COLORS.gold} />
      <Text style={[styles.badgeText, isHighConfidence ? styles.badgeTextHigh : styles.badgeTextMedium]}>
        {isHighConfidence ? "Monument Recognized" : "Possible Match"}
      </Text>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateAway(() => navigation.navigate("Main", { screen: "SmartScan" }))} activeOpacity={0.8}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SCAN RESULTS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Confidence badge */}
        <View style={styles.center}>{renderBadge()}</View>

        {/* Monument image */}
        <View style={styles.imgCard}>
          <SafeImage source={getImageUrl(result.imageUrl || result.monumentName)} style={styles.img} resizeMode="cover" />
          <View style={styles.confidenceOverlay}>
            <Text style={styles.pct}>{confidencePercent}</Text>
            <Text style={styles.pctLabel}>MATCH</Text>
          </View>
        </View>

        {/* Voice control card */}
        {renderVoiceBar()}

        {/* Monument details card */}
        <View style={styles.detailCard}>
          <Text style={styles.monumentName}>{result.monumentName}</Text>

          {(result.dynasty || richCtx?.period) && (
            <View style={styles.metaRow}>
              {result.dynasty ? (
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>{result.dynasty}</Text>
                </View>
              ) : null}
              {richCtx?.period ? (
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>{richCtx.period}</Text>
                </View>
              ) : null}
              {(richCtx?.unescoStatus || richCtx?.heritageStatus) ? (
                <View style={[styles.metaPill, styles.metaPillGold]}>
                  <Text style={[styles.metaText, { color: COLORS.gold }]}>UNESCO</Text>
                </View>
              ) : null}
            </View>
          )}

          {richCtx?.description && (
            <Text style={styles.description}>{richCtx.description}</Text>
          )}

          {isMediumConfidence && (
            <View style={styles.disclaimer}>
              <Feather name="info" size={14} color={COLORS.gold} />
              <Text style={styles.disclaimerText}>Tentative match. Scan again from another angle for a better result.</Text>
            </View>
          )}

          {(result.architecturalHighlights || richCtx?.architecturalHighlights)?.length ? (
            <View style={styles.highlightContainer}>
              <Text style={styles.highlightTitle}>Architectural Highlights</Text>
              {(richCtx?.architecturalHighlights || result.architecturalHighlights || []).slice(0, 5).map((h, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{h}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {richCtx?.bestTimeToVisit && (
            <View style={styles.infoRow}>
              <Feather name="calendar" size={14} color={COLORS.gold} />
              <Text style={styles.infoText}>Best time to visit: {richCtx.bestTimeToVisit}</Text>
            </View>
          )}

          {richCtx?.nearbyPlaces && richCtx.nearbyPlaces.length > 0 && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color={COLORS.gold} />
              <Text style={styles.infoText}>Nearby: {richCtx.nearbyPlaces.slice(0, 2).join(", ")}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer CTAs */}
      <View style={styles.footer}>
        {hasPreviews ? (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnGold]} onPress={() => navigateAway(() => navigation.navigate("HeritageVisuals", { monumentId: result.monumentId }))} activeOpacity={0.8}>
              <Feather name="image" size={18} color={COLORS.background} />
              <Text style={styles.btnGoldText}>EXPLORE HERITAGE VISUALS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigateAway(() => navigation.navigate("MonumentDetails", { monumentId: result.monumentId }))} activeOpacity={0.8}>
              <Feather name="book-open" size={18} color={COLORS.gold} />
              <Text style={styles.btnOutlineText}>HERITAGE INFORMATION</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnGold]} onPress={() => navigateAway(() => navigation.navigate("MonumentDetails", { monumentId: result.monumentId }))} activeOpacity={0.8}>
            <Feather name="book-open" size={18} color={COLORS.background} />
            <Text style={styles.btnGoldText}>VIEW HERITAGE INFORMATION</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btnScan} onPress={() => navigateAway(() => navigation.navigate("Main", { screen: "SmartScan" }))} activeOpacity={0.8}>
          <Feather name="refresh-cw" size={14} color={COLORS.textSecondary} />
          <Text style={styles.btnScanText}>SCAN AGAIN</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: "700", letterSpacing: 1.5 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  center: { alignItems: "center", marginBottom: SPACING.md },
  // Badge
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: 7, borderRadius: BORDER_RADIUS.lg, gap: SPACING.xs },
  badgeHigh: { backgroundColor: COLORS.gold },
  badgeMedium: { borderWidth: 1, borderColor: COLORS.gold, backgroundColor: "rgba(212,175,55,0.12)" },
  badgeText: { ...TYPOGRAPHY.bodySmall, fontWeight: "700", letterSpacing: 0.5 },
  badgeTextHigh: { color: COLORS.background },
  badgeTextMedium: { color: COLORS.gold },
  // Image
  imgCard: { height: 220, borderRadius: BORDER_RADIUS.md, overflow: "hidden", marginBottom: SPACING.md, backgroundColor: "#000", position: "relative" },
  img: { width: "100%", height: "100%" },
  confidenceOverlay: { position: "absolute", bottom: SPACING.sm, right: SPACING.md, backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: BORDER_RADIUS.sm, alignItems: "center" },
  pct: { color: COLORS.gold, ...TYPOGRAPHY.h2, fontWeight: "800", lineHeight: 30 },
  pctLabel: { color: COLORS.textSecondary, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  // Voice card
  voiceCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  voiceCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm, marginBottom: SPACING.sm },
  voiceIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(212,175,55,0.1)", justifyContent: "center", alignItems: "center", marginTop: 2 },
  voiceCardInfo: { flex: 1 },
  voiceCardTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: "700", marginBottom: 2 },
  voiceCardStatus: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall },
  voiceCardStatusActive: { color: COLORS.gold },
  voiceDuration: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  voiceControls: { flexDirection: "row", gap: SPACING.sm },
  voiceBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: BORDER_RADIUS.sm },
  voiceBtnStop: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  voiceBtnPlay: { backgroundColor: COLORS.gold },
  voiceBtnText: { color: COLORS.textPrimary, ...TYPOGRAPHY.caption, fontWeight: "700" },
  // Detail card
  detailCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.lg },
  monumentName: { color: COLORS.textPrimary, ...TYPOGRAPHY.h2, fontWeight: "700", marginBottom: SPACING.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.md },
  metaPill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: COLORS.border },
  metaPillGold: { borderColor: COLORS.gold, backgroundColor: "rgba(212,175,55,0.08)" },
  metaText: { color: COLORS.textSecondary, ...TYPOGRAPHY.caption, fontWeight: "600" },
  description: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, lineHeight: 20, marginBottom: SPACING.md },
  disclaimer: { flexDirection: "row", gap: SPACING.xs, backgroundColor: "rgba(212,175,55,0.08)", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md, alignItems: "flex-start" },
  disclaimerText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, flex: 1, lineHeight: 17 },
  highlightContainer: { marginTop: SPACING.sm },
  highlightTitle: { color: COLORS.textPrimary, ...TYPOGRAPHY.bodyMedium, fontWeight: "700", marginBottom: SPACING.sm },
  bullet: { flexDirection: "row", gap: SPACING.xs, marginBottom: 5 },
  bulletDot: { color: COLORS.gold, fontWeight: "700" },
  bulletText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, flex: 1, lineHeight: 17 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.xs, marginTop: SPACING.sm },
  infoText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, flex: 1, lineHeight: 17 },
  // Footer
  footer: { padding: SPACING.lg, gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  btn: { height: 48, borderRadius: BORDER_RADIUS.md, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.xs },
  btnGold: { backgroundColor: COLORS.gold },
  btnGoldText: { color: COLORS.background, ...TYPOGRAPHY.button, fontWeight: "700" },
  btnOutline: { borderWidth: 1, borderColor: COLORS.gold },
  btnOutlineText: { color: COLORS.gold, ...TYPOGRAPHY.button, fontWeight: "700" },
  btnScan: { height: 36, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.xs },
  btnScanText: { color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, fontWeight: "700" },
});

export default RecognitionResultScreen;
