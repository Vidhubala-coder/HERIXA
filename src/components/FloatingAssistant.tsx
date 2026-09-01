import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { askHeritageAssistant, ChatTurn, MonumentChatContext } from '../services/assistantService';
import { getConnectivityState } from '../services/api';
import { getCurrentMonumentContext, subscribeToCurrentMonumentContext } from '../services/currentContextService';
import { useFavorites } from '../context/FavoritesContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

const STARTER_QUESTIONS = [
  '🏛️ What is Dravidian architecture?',
  '🏺 Tell me about Brihadeeswarar Temple',
  '📜 Why is cultural heritage important?',
  '🗺️ What heritage sites should I explore?',
];

export const FloatingAssistant: React.FC = () => {
  const { userRole } = useFavorites();

  if (userRole === 'admin') {
    return null;
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const ICON_SIZE = 56;
  const MARGIN = 16;
  const TOP_SAFE_AREA = 60;
  const BOTTOM_SAFE_AREA = 100;

  // Track active context from viewed details page
  const [activeContext, setActiveContext] = useState<MonumentChatContext | undefined>(undefined);

  // Position coordinates
  const [posX, setPosX] = useState(screenWidth - ICON_SIZE - MARGIN);
  const [posY, setPosY] = useState(screenHeight - ICON_SIZE - BOTTOM_SAFE_AREA);

  const pan = useRef(new Animated.ValueXY({ x: posX, y: posY })).current;
  const currentPos = useRef({ x: posX, y: posY });

  // Chat window state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastErrorMsg, setLastErrorMsg] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isSendingRef = useRef(false);

  // 1. Subscribe to active monument details context
  useEffect(() => {
    setActiveContext(getCurrentMonumentContext());
    const unsubscribe = subscribeToCurrentMonumentContext((context) => {
      setActiveContext(context);
    });
    return () => unsubscribe();
  }, []);

  // 2. Track pan coordinates updates
  useEffect(() => {
    const listener = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listener);
    };
  }, [pan]);

  // 3. Load persisted button position on startup
  useEffect(() => {
    const loadPosition = async () => {
      try {
        const stored = await AsyncStorage.getItem('HERIXA_ASSISTANT_POSITION');
        if (stored) {
          const { xPct, yPct } = JSON.parse(stored);
          const targetX = xPct * screenWidth;
          const targetY = yPct * screenHeight;

          // Restrict coordinates inside safe boundaries
          const safeX = Math.max(MARGIN, Math.min(screenWidth - ICON_SIZE - MARGIN, targetX));
          const safeY = Math.max(TOP_SAFE_AREA, Math.min(screenHeight - ICON_SIZE - BOTTOM_SAFE_AREA, targetY));

          pan.setValue({ x: safeX, y: safeY });
          currentPos.current = { x: safeX, y: safeY };
          setPosX(safeX);
          setPosY(safeY);
        }
      } catch (err) {
        console.warn('Failed to load floating assistant position:', err);
      }
    };
    loadPosition();
  }, [screenWidth, screenHeight]);

  // 4. Check API connectivity status when chat opens
  useEffect(() => {
    if (isChatOpen) {
      checkConnectionStatus();
    }
  }, [isChatOpen]);

  const checkConnectionStatus = () => {
    const isAvailable = getConnectivityState() !== 'unavailable';
    setIsOffline(!isAvailable);
  };

  // 5. PanResponder configuration
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only intercept movement gesture if dragged past threshold (3 pixels)
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: async (evt, gestureState) => {
        pan.flattenOffset();
        const releaseX = currentPos.current.x;
        const releaseY = currentPos.current.y;

        // Snapping boundary calculations
        const snapLeftX = MARGIN;
        const snapRightX = screenWidth - ICON_SIZE - MARGIN;
        const midpoint = screenWidth / 2;

        const targetX = releaseX + ICON_SIZE / 2 < midpoint ? snapLeftX : snapRightX;
        const targetY = Math.max(
          TOP_SAFE_AREA,
          Math.min(screenHeight - ICON_SIZE - BOTTOM_SAFE_AREA, releaseY)
        );

        // Smooth spring snapping animation
        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start(async () => {
          currentPos.current = { x: targetX, y: targetY };
          setPosX(targetX);
          setPosY(targetY);

          // Save normalized layout percentages in AsyncStorage
          const xPct = targetX / screenWidth;
          const yPct = targetY / screenHeight;
          await AsyncStorage.setItem(
            'HERIXA_ASSISTANT_POSITION',
            JSON.stringify({ xPct, yPct })
          );
        });
      },
    })
  ).current;

  // 6. Chat Handlers
  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading || isSendingRef.current) return;

    if (getConnectivityState() === 'unavailable') {
      setIsOffline(true);
      return;
    }

    isSendingRef.current = true;
    setLastErrorMsg(null);
    setInputMessage('');

    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    const recentHistory: ChatTurn[] = updatedMessages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    try {
      const response = await askHeritageAssistant(trimmed, recentHistory, activeContext);

      if (response.success) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
          },
        ]);
      } else {
        setLastErrorMsg(response.message);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
            isError: true,
          },
        ]);
      }
    } catch (err) {
      const errMsg = 'An unexpected error occurred. Please try again.';
      setLastErrorMsg(errMsg);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errMsg,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  const handleRetryLastMessage = () => {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      setMessages(prev => prev.filter(m => !m.isError));
      handleSend(lastUserMsg.content);
    }
  };

  const handleQuestionPress = (question: string) => {
    handleSend(question);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Feather name="cpu" size={14} color={COLORS.background} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            item.isError ? styles.errorBubble : null,
          ]}
        >
          <Text style={isUser ? styles.userText : styles.assistantText}>
            {item.content}
          </Text>

          {item.isError && (
            <TouchableOpacity style={styles.retryButtonInline} onPress={handleRetryLastMessage}>
              <Feather name="refresh-cw" size={12} color={COLORS.gold} style={{ marginRight: 4 }} />
              <Text style={styles.retryButtonInlineText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Draggable Icon */}
      <Animated.View
        style={[
          styles.floatingButtonContainer,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsChatOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color={COLORS.background} />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Overlay Panel */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsChatOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsChatOpen(false)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrapper}>
              <Text style={styles.headerTitle}>HERIXA AI</Text>
              <Text style={styles.headerSubtitle}>Heritage Assistant</Text>
            </View>
            <TouchableOpacity
              style={styles.clearHistoryButton}
              onPress={() => setMessages([])}
              activeOpacity={0.8}
              disabled={messages.length === 0}
            >
              <Feather
                name="trash-2"
                size={18}
                color={messages.length === 0 ? COLORS.surfaceLight : COLORS.gold}
              />
            </TouchableOpacity>
          </View>

          {/* MONUMENT CONTEXT BADGE */}
          {activeContext && (
            <View style={styles.contextBadge}>
              <Feather name="bookmark" size={13} color={COLORS.gold} style={{ marginRight: 6 }} />
              <Text style={styles.contextBadgeText} numberOfLines={1}>
                Current Page Context: {activeContext.name}
              </Text>
              <TouchableOpacity
                style={styles.clearContextButton}
                onPress={() => setActiveContext(undefined)}
              >
                <Feather name="x" size={14} color={COLORS.gold} />
              </TouchableOpacity>
            </View>
          )}

          {isOffline ? (
            <View style={styles.offlineContainer}>
              <Feather name="wifi-off" size={48} color={COLORS.gold} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.offlineTitle}>Heritage Assistant Offline</Text>
              <Text style={styles.offlineText}>
                HERIXA Assistant is currently unavailable. Please check your network connection and try again.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  checkConnectionStatus();
                  if (getConnectivityState() !== 'unavailable') {
                    setIsOffline(false);
                  }
                }}
              >
                <Text style={styles.retryButtonText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.keyboardContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
            >
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.welcomeIconContainer}>
                      <Ionicons name="chatbubbles-outline" size={40} color={COLORS.gold} />
                    </View>
                    <Text style={styles.welcomeTitle}>Heritage Chat</Text>
                    <Text style={styles.welcomeText}>
                      Ask me anything about ancient monuments, architecture, dynasties, temples, and Indian history.
                    </Text>

                    <Text style={styles.suggestedHeading}>Suggested Questions:</Text>
                    <View style={styles.suggestionsContainer}>
                      {STARTER_QUESTIONS.map((question, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionCard}
                          onPress={() => handleQuestionPress(question)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.suggestionText}>{question}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                }
              />

              {/* LOADING INDICATOR */}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.gold} style={{ marginRight: 8 }} />
                  <Text style={styles.loadingText}>HERIXA is thinking...</Text>
                </View>
              )}

              {/* INPUT CONTAINER */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask about India's heritage..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputMessage.trim() || isLoading ? styles.sendDisabled : null]}
                  onPress={() => handleSend(inputMessage)}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <Ionicons name="send" size={16} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    zIndex: 9999,
    elevation: 10,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
    borderColor: COLORS.bronze,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeButton: {
    marginRight: SPACING.md,
    padding: 4,
  },
  clearHistoryButton: {
    padding: 6,
  },
  headerTitleWrapper: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.12)',
  },
  contextBadgeText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  clearContextButton: {
    padding: 3,
    marginLeft: SPACING.sm,
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 2,
  },
  errorBubble: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(158, 42, 43, 0.08)',
  },
  userText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
  },
  assistantText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 20,
  },
  retryButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  retryButtonInlineText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: SPACING.lg,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    marginRight: SPACING.md,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 42,
    marginBottom: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  welcomeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h2,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  welcomeText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  suggestedHeading: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  suggestionsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.sm,
  },
  suggestionCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 4,
    marginHorizontal: 4,
  },
  suggestionText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  offlineTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  offlineText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
  },
});
