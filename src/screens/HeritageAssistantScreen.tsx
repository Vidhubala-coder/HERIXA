import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { askHeritageAssistant, ChatTurn, MonumentChatContext } from '../services/assistantService';
import { getConnectivityState } from '../services/api';
import { useFavorites } from '../context/FavoritesContext';

interface HeritageAssistantScreenProps {
  route: any;
  navigation: any;
}

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

export const HeritageAssistantScreen: React.FC<HeritageAssistantScreenProps> = ({ route, navigation }) => {
  const routeContext = route.params?.monumentContext as MonumentChatContext | undefined;
  const [activeContext, setActiveContext] = useState<MonumentChatContext | undefined>(routeContext);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastErrorMsg, setLastErrorMsg] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    setActiveContext(routeContext);
  }, [routeContext]);

  const { activeUserId, userRole } = useFavorites();

  useEffect(() => {
    // Clear chat history if user switches accounts or logs out
    setMessages([]);
  }, [activeUserId]);

  if (userRole === 'admin') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)' }}>
            <Feather name="shield-off" size={32} color={COLORS.gold} />
          </View>
          <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' }}>
            Assistant Restricted
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            The Heritage AI Assistant is reserved for public visitor experiences and is disabled in Admin Mode.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.sm }}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#141412', fontSize: 13, fontWeight: '800' }}>Return to Admin Portal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = () => {
    const isAvailable = getConnectivityState() !== 'unavailable';
    setIsOffline(!isAvailable);
  };

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading || isSendingRef.current) return;

    // Check offline status first
    if (getConnectivityState() === 'unavailable') {
      setIsOffline(true);
      return;
    }

    isSendingRef.current = true;
    setLastErrorMsg(null);
    setInputMessage('');
    
    // Add user message to UI
    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
    };
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Prepare context history for API
    // Limit to last 10 messages (5 turns) to control payload size
    const recentHistory: ChatTurn[] = updatedMessages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    try {
      // Call service
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
        // Add error-styled message indicating request failed
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
    // Find the last user message to retry
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      // Strip error messages from the end of history
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

  if (isOffline) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>HERIXA AI</Text>
            <Text style={styles.headerSubtitle}>Heritage Assistant</Text>
          </View>
        </View>

        <View style={styles.offlineContainer}>
          <Feather name="wifi-off" size={48} color={COLORS.gold} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.offlineTitle}>Heritage Assistant Offline</Text>
          <Text style={styles.offlineText}>
            Heritage Assistant is currently unavailable. Please check your internet connection and try again.
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
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>HERIXA AI</Text>
          <Text style={styles.headerSubtitle}>Heritage Assistant</Text>
        </View>
      </View>

      {/* MONUMENT CONTEXT BADGE */}
      {activeContext && (
        <View style={styles.contextBadge}>
          <Feather name="bookmark" size={14} color={COLORS.gold} style={{ marginRight: 6 }} />
          <Text style={styles.contextBadgeText} numberOfLines={1}>
            Learning Context: {activeContext.name} ({activeContext.location})
          </Text>
          <TouchableOpacity
            style={styles.clearContextButton}
            onPress={() => setActiveContext(undefined)}
          >
            <Feather name="x" size={16} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      )}

      {/* CHAT MESSAGES PANEL */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
                <Ionicons name="chatbubbles-outline" size={42} color={COLORS.gold} />
              </View>
              <Text style={styles.welcomeTitle}>Namaste!</Text>
              <Text style={styles.welcomeText}>
                Ask me any question about ancient Indian temples, architecture, dynasties, historical structures, and cultural heritage.
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
              <Ionicons name="send" size={18} color={COLORS.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    marginRight: SPACING.md,
    padding: 4,
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
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  contextBadgeText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  clearContextButton: {
    padding: 4,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
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
    marginLeft: 46,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
