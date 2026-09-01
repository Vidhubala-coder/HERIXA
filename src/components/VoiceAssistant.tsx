import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { LanguageSelector } from './LanguageSelector';
import { askVoiceAssistant } from '../services/voiceAssistantService';
import { textToSpeechService } from '../services/textToSpeechService';
import { speechRecognitionService } from '../services/speechRecognitionService';
import { useFavorites } from '../context/FavoritesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  monumentId: string;
  monumentName: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  isVisible,
  onClose,
  monumentId,
  monumentName,
}) => {
  const { addHistory, selectedLanguage, changeLanguage } = useFavorites();
  const language = (selectedLanguage && ['en', 'ta', 'hi', 'te', 'ml', 'kn'].includes(selectedLanguage)
    ? selectedLanguage
    : 'en') as 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';
  const [explainSimply, setExplainSimply] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mounted guard ref
  const isMountedRef = useRef<boolean>(true);
  const voiceSessionIdRef = useRef<string | null>(null);
  const lastModelMessageRef = useRef<string | null>(null);

  // Chat Memory and TTS States
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [speakingMessageText, setSpeakingMessageText] = useState<string | null>(null);

  const modelMessages = chatHistory.filter((m) => m.role === 'model');
  const lastModelMessage = modelMessages[modelMessages.length - 1];
  const lastModelMessageText = lastModelMessage ? lastModelMessage.text : null;

  useEffect(() => {
    if (lastModelMessageText && lastModelMessageText !== lastModelMessageRef.current) {
      console.log('[HERIXA-AI] RESPONSE_RENDERED');
      lastModelMessageRef.current = lastModelMessageText;
    }
  }, [lastModelMessageText]);

  // Voice Input States
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');

  const chatScrollRef = useRef<ScrollView>(null);

  // Mounted tracker effect
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      speechRecognitionService.stopListening();
    };
  }, []);

  // Determine speech capability on mount
  useEffect(() => {
    const checkVoiceCapabilities = async () => {
      try {
        const available = await speechRecognitionService.isAvailable();
        if (isMountedRef.current) {
          setSpeechSupported(available);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setSpeechSupported(false);
        }
      }
    };
    checkVoiceCapabilities();
  }, []);

  // Reset states when monument changes
  useEffect(() => {
    if (isMountedRef.current) {
      setChatHistory([]);
      setError(null);
      handleStopSpeech();
    }
  }, [monumentId]);

  // Stop any active speech when assistant is closed
  useEffect(() => {
    if (!isVisible) {
      handleStopSpeech();
      speechRecognitionService.stopListening();
      if (voiceSessionIdRef.current) {
        console.log(`[HERIXA-VOICE] SESSION_RESET SessionID: ${voiceSessionIdRef.current}, Timestamp: ${Date.now()}`);
        voiceSessionIdRef.current = null;
      }
    }
  }, [isVisible]);

  useEffect(() => {
    handleStopSpeech();
    if (isMountedRef.current) {
      setError(null);
    }
  }, [language]);

  const handleStopSpeech = async () => {
    await textToSpeechService.stop();
    if (isMountedRef.current) {
      setSpeakingMessageText(null);
    }
  };

  const toggleSpeechForText = async (text: string) => {
    if (speakingMessageText === text) {
      await handleStopSpeech();
    } else {
      await textToSpeechService.stop();
      if (isMountedRef.current) {
        setSpeakingMessageText(text);
      }
      
      console.log('[HERIXA VOICE] Text-to-speech playing...');
      await textToSpeechService.speak(
        text,
        language,
        () => {
          if (isMountedRef.current) setSpeakingMessageText(text);
        },
        () => {
          if (isMountedRef.current) setSpeakingMessageText(null);
        },
        (err) => {
          console.error('[HERIXA VOICE] TTS Error:', err);
          if (isMountedRef.current) setSpeakingMessageText(null);
        }
      );
    }
  };

  const handleAsk = async (customQuestion?: string) => {
    if (isLoading) return;
    const queryToAsk = (customQuestion || question).trim();
    if (!queryToAsk || queryToAsk.length === 0) return;

    if (voiceSessionIdRef.current) {
      console.log(`[HERIXA-VOICE] MESSAGE_CREATED SessionID: ${voiceSessionIdRef.current}, Transcript: ${queryToAsk}, Timestamp: ${Date.now()}`);
      console.log(`[HERIXA-VOICE] SESSION_RESET SessionID: ${voiceSessionIdRef.current}, Timestamp: ${Date.now()}`);
      voiceSessionIdRef.current = null;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
      setQuestion('');
    }
    await handleStopSpeech();

    // Prepare history to send (backend expects array of turns)
    const historyToSend = [...chatHistory];

    // Optimistically add user turn to conversation history
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', text: queryToAsk }
    ]);

    // Scroll to bottom
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    console.log(`[HERIXA ASSISTANT] Monument: ${monumentName}`);
    console.log(`[HERIXA ASSISTANT] Question received: "${queryToAsk}"`);
    console.log(`[HERIXA ASSISTANT] History messages count: ${historyToSend.length}`);
    console.log('[HERIXA ASSISTANT] Request started');

    const startTime = Date.now();

    try {
      const res = await askVoiceAssistant(monumentId, queryToAsk, language, explainSimply, historyToSend);
      const duration = Date.now() - startTime;
      
      if (!isMountedRef.current) return;

      console.log(`[HERIXA ASSISTANT] Response received in ${duration}ms`);

      if (res.success) {
        // Append model response to chat history
        setChatHistory((prev) => [
          ...prev,
          { role: 'model', text: res.answer }
        ]);
        console.log('[HERIXA-AI] RESPONSE_STORED');
        addHistory('ai_question', monumentId, queryToAsk).catch((err) =>
          console.warn('Failed to save AI question to history:', err)
        );

        // Auto-play the response text via Text-to-Speech
        await toggleSpeechForText(res.answer);
      } else {
        setError(res.answer);
        console.error('[HERIXA ASSISTANT] Safe error message:', res.answer);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error('[HERIXA ASSISTANT] Request failed in', duration, 'ms. Error:', err);
      if (isMountedRef.current) {
        const fetchErrorMsgs: Record<string, string> = {
          ta: 'பதில் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
          hi: 'उत्तर प्राप्त करने में विफल। कृपया पुन: प्रयास करें।',
          te: 'సమాధానం పొందడం విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
          ml: 'ഉത്തരം ലഭിക്കുന്നതിൽ പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.',
          kn: 'ಉತ್ತರ ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
          en: 'Failed to fetch answer. Please try again.',
        };
        setError(fetchErrorMsgs[language] || fetchErrorMsgs.en);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRecordingState('idle');
      }
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Preset chips depending on active language
  const getPresetChips = () => {
    if (language === 'ta') {
      return [
        { label: 'இதை கட்டியது யார்?', query: 'இதை கட்டியது யார்?' },
        { label: 'கட்டிடக்கலை விவரம்', query: 'இதன் கட்டிடக்கலை பற்றி விளக்குக' },
        { label: 'இதன் வரலாறு என்ன?', query: 'இதன் வரலாறு என்ன?' },
        { label: 'சுவாரஸ்யமான தகவல்கள்', query: 'இதன் சுவாரஸ்யமான உண்மைகள் என்னென்ன?' },
      ];
    }
    if (language === 'hi') {
      return [
        { label: 'इसे किसने बनवाया?', query: 'इसे किसने बनवाया था?' },
        { label: 'वास्तुकला समझाएं', query: 'इसकी वास्तुकला कैसी है?' },
        { label: 'इसका इतिहास क्या है?', query: 'इसका इतिहास क्या है?' },
        { label: 'दिलचस्प तथ्य', query: 'इसके बारे में कुछ दिलचस्प तथ्य बताएं' },
      ];
    }
    return [
      { label: 'Who built this?', query: 'Who built this monument?' },
      { label: 'Explain architecture', query: 'Explain the architecture of this monument.' },
      { label: 'Tell me its history', query: 'Tell me the history of this monument.' },
      { label: 'Interesting facts', query: 'Tell me some interesting facts about this.' },
    ];
  };

  const handleMicrophonePress = async () => {
    const isAvailable = await speechRecognitionService.isAvailable();
    console.log('[HERIXA VOICE] Recognition available:', isAvailable);

    if (!isAvailable) {
      Alert.alert(
        language === 'ta' ? 'குரல் உள்ளீடு கிடைக்கவில்லை' : language === 'hi' ? 'ஆवाज इनपुट अनुपलब्ध' : 'Voice Input Unavailable',
        language === 'ta'
          ? 'இந்த பயன்பாட்டு கட்டமைப்பில் குரல் உள்ளீடு கிடைக்கவில்லை. தட்டச்சு வசதியைப் பயன்படுத்தவும்.'
          : language === 'hi'
          ? 'इस ऐप बिल्ड में वॉयस इनपुट अनुपलब्ध है। कृपया टाइप करके पूछें।'
          : 'Voice input is unavailable in this app build. Please use the development build with speech recognition support.'
      );
      return;
    }

    if (recordingState === 'recording' || recordingState === 'processing') {
      if (recordingState === 'recording') {
        console.log('[HERIXA VOICE] Recording stopped');
        speechRecognitionService.stopListening();
        setRecordingState('idle');
        const finalSessionId = voiceSessionIdRef.current;
        console.log(`[HERIXA-VOICE] SESSION_ENDED SessionID: ${finalSessionId}, ListeningState: idle, Timestamp: ${Date.now()}`);
        if (question.trim().length > 0) {
          console.log(`[HERIXA-VOICE] FINAL_TRANSCRIPT SessionID: ${finalSessionId}, Transcript: ${question}, Timestamp: ${Date.now()}`);
          handleAsk(question);
        }
      } else {
        console.log(`[HERIXA-VOICE] DUPLICATE_SESSION_BLOCKED SessionID: ${voiceSessionIdRef.current}, Timestamp: ${Date.now()}`);
      }
      return;
    }

    const hasPermission = await speechRecognitionService.requestPermissions();
    console.log('[HERIXA VOICE] Permission status:', hasPermission ? 'GRANTED' : 'DENIED');

    if (!hasPermission) {
      Alert.alert(
        language === 'ta' ? 'அனுமதி தேவை' : language === 'hi' ? 'अनुमति की आवश्यकता है' : 'Permission Required',
        language === 'ta'
          ? 'குரல் கேள்விகளுக்கு மைக்ரோஃபோன் அனுமதி தேவை. உங்கள் தொலைபேசி அமைப்புகளில் மைக்ரோஃபோன் அணுகலை இயக்கவும்.'
          : language === 'hi'
          ? 'वॉयस प्रश्नों के लिए माइक्रोफ़ोन अनुमति आवश्यक है। कृपया अपने फ़ोन सेटिंग्स में माइक्रोफ़ोन एक्सेस सक्षम करें।'
          : 'Microphone permission is required for voice questions. Please enable microphone access in your phone settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    const sessionId = Math.random().toString(36).substring(7);
    voiceSessionIdRef.current = sessionId;
    console.log(`[HERIXA-VOICE] SESSION_STARTED SessionID: ${sessionId}, ListeningState: recording, Timestamp: ${Date.now()}`);

    setQuestion('');
    setError(null);
    setRecordingState('recording');
    console.log('[HERIXA VOICE] Recording started');
    
    speechRecognitionService.startListening(
      language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ml' ? 'ml-IN' : language === 'kn' ? 'kn-IN' : 'en-US',
      (text, isFinal) => {
        if (isMountedRef.current && voiceSessionIdRef.current === sessionId) {
          if (isFinal) {
            console.log(`[HERIXA-VOICE] FINAL_TRANSCRIPT SessionID: ${sessionId}, Transcript: ${text}, Timestamp: ${Date.now()}`);
            setQuestion(text);
            speechRecognitionService.stopListening();
            setRecordingState('processing');
            console.log(`[HERIXA-VOICE] SESSION_ENDED SessionID: ${sessionId}, ListeningState: processing, Timestamp: ${Date.now()}`);
            handleAsk(text);
          } else {
            console.log(`[HERIXA-VOICE] PARTIAL_TRANSCRIPT SessionID: ${sessionId}, Transcript: ${text}, Timestamp: ${Date.now()}`);
            setQuestion(text);
          }
        }
      },
      (err) => {
        console.warn('[HERIXA VOICE] Error:', err);
        if (isMountedRef.current && voiceSessionIdRef.current === sessionId) {
          console.log(`[HERIXA-VOICE] ERROR SessionID: ${sessionId}, Error: ${err}, Timestamp: ${Date.now()}`);
          console.log(`[HERIXA-VOICE] SESSION_ENDED SessionID: ${sessionId}, ListeningState: error, Timestamp: ${Date.now()}`);
          setRecordingState('error');
          const voiceErrorMsgs: Record<string, string> = {
            ta: 'என்னால் குரலை அடையாளம் காண முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
            hi: 'आवाज पहचानी नहीं जा सकी। कृपया पुन: प्रयास करें।',
            te: 'గొంతు గుర్తించబడలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
            ml: 'ശബ്ദം തിരിച്ചറിയാനായില്ല. വീണ്ടും ശ്രമിക്കുക.',
            kn: 'ಧ್ವನಿ ಗುರುತಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
            en: 'I couldn\'t understand the voice. Please try again.',
          };
          setError(voiceErrorMsgs[language] || voiceErrorMsgs.en);
          setTimeout(() => {
            if (isMountedRef.current && voiceSessionIdRef.current === sessionId) {
              setRecordingState('idle');
              setError(null);
              console.log(`[HERIXA-VOICE] SESSION_RESET SessionID: ${sessionId}, Timestamp: ${Date.now()}`);
              voiceSessionIdRef.current = null;
            }
          }, 4000);
        }
      }
    );
  };

  const getRecordingStateLabel = () => {
    const labels: Record<string, Record<string, string>> = {
      recording: {
        en: '🔴 Listening...',
        ta: '🔴 கேட்டுக்கொண்டிருக்கிறது...',
        hi: '🔴 सुन रहा है...',
        te: '🔴 వింటోంది...',
        ml: '🔴 കേൾക്കുന്നു...',
        kn: '🔴 ಕೇಳುತ್ತಿದೆ...',
      },
      processing: {
        en: '⏳ Processing...',
        ta: '⏳ பதிலை செயலாக்குகிறது...',
        hi: '⏳ संसाधित कर रहा है...',
        te: '⏳ ప్రాసెస్ చేస్తోంది...',
        ml: '⏳ പ്രോസസ്സ് ചെയ്യുന്നു...',
        kn: '⏳ ಪ್ರಕ್ರಿಯೆ ಮಾಡುತ್ತಿದೆ...',
      },
      error: {
        en: '⚠️ Could not understand',
        ta: '⚠️ குரல் புரியவில்லை',
        hi: '⚠️ आवाज समझ नहीं आई',
        te: '⚠️ అర్థం కాలేదు',
        ml: '⚠️ മനസ്സിലായില്ല',
        kn: '⚠️ ಅರ್ಥವಾಗಲಿಲ್ಲ',
      },
      idle: {
        en: '🎤 Ask by voice',
        ta: '🎤 குரல் மூலம் கேளுங்கள்',
        hi: '🎤 वॉयस इनपुट',
        te: '🎤 గొంతుతో అడగండి',
        ml: '🎤 ശബ്ദത്തിലൂടെ ചോദിക്കൂ',
        kn: '🎤 ಧ್ವನಿ ಮೂಲಕ ಕೇಳಿ',
      },
    };
    return labels[recordingState]?.[language] || labels[recordingState]?.en || labels.idle.en;
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.assistantCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.brandContainer}>
                <Ionicons name="sparkles" size={18} color={COLORS.gold} />
                <Text style={styles.brandText}>HERIXA AI GUIDE</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Target Monument Banner */}
            <View style={styles.monumentBanner}>
              <Feather name="compass" size={14} color={COLORS.goldMuted} />
              <Text style={styles.monumentName} numberOfLines={1}>
                {monumentName}
              </Text>
            </View>

            {/* Suggested Preset Chips */}
            <View style={styles.presetsWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContainer}
              >
                {getPresetChips().map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chip}
                    onPress={() => handleAsk(chip.query)}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chat Log (Scrollable Conversation) */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContentContainer}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {/* Language and Simplification Options */}
              <View style={styles.controlsRow}>
                 <LanguageSelector
                  selectedLanguage={language}
                  onLanguageChange={async (lang) => {
                    try {
                      await changeLanguage(lang);
                    } catch (err) {
                      console.warn('Failed to save language in VoiceAssistant:', err);
                    }
                  }}
                />

                <View style={styles.explainSimplyToggle}>
                  <Text style={styles.toggleTitle}>
                    {language === 'ta' ? 'எளிமை' : language === 'hi' ? 'सरल' : 'Simple'}
                  </Text>
                  <Switch
                    value={explainSimply}
                    onValueChange={(val) => setExplainSimply(val)}
                    trackColor={{ false: COLORS.surfaceLight, true: COLORS.goldMuted }}
                    thumbColor={explainSimply ? COLORS.gold : COLORS.textSecondary}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              </View>

              {chatHistory.length === 0 ? (
                <View style={styles.emptyResponse}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.borderLight} />
                  <Text style={styles.emptyText}>
                    {language === 'ta'
                      ? 'கீழே உள்ள கேள்விகளில் ஒன்றை அழுத்தவும் அல்லது உங்கள் சொந்தக் கேள்வியைத் தட்டச்சு செய்யவும்.'
                      : language === 'hi'
                      ? 'पूछने के लिए ऊपर एक विषय चुनें या नीचे अपना प्रश्न लिखें।'
                      : 'Ask HERIXA anything about this monument. Tap a quick question chip or type in your custom query below.'}
                  </Text>
                </View>
              ) : (
                chatHistory.map((message, idx) => {
                  const isUser = message.role === 'user';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.chatBubbleContainer,
                        isUser ? styles.userBubbleContainer : styles.modelBubbleContainer,
                      ]}
                    >
                      {!isUser && (
                        <View style={styles.avatarContainer}>
                          <Ionicons name="sparkles" size={10} color={COLORS.background} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.chatBubble,
                          isUser ? styles.userBubble : styles.modelBubble,
                        ]}
                      >
                        <Text style={[styles.chatBubbleText, isUser ? styles.userBubbleText : styles.modelBubbleText]}>
                          {message.text}
                        </Text>
                        
                        {!isUser && (
                          <View style={styles.bubbleActionRow}>
                            <TouchableOpacity
                              style={styles.bubbleVolumeButton}
                              onPress={() => toggleSpeechForText(message.text)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={speakingMessageText === message.text ? 'square' : 'volume-high'}
                                size={14}
                                color={COLORS.gold}
                              />
                              <Text style={styles.bubbleVolumeText}>
                                {speakingMessageText === message.text
                                  ? (language === 'ta' ? 'நிறுத்து' : language === 'hi' ? 'रोकें' : 'STOP')
                                  : (language === 'ta' ? 'கேள்' : language === 'hi' ? 'सुनें' : 'LISTEN')}
                              </Text>
                            </TouchableOpacity>
                            {speakingMessageText === message.text && (
                              <View style={styles.speakingIndicatorInline}>
                                <View style={[styles.speakingBarInline, { height: 10 }]} />
                                <View style={[styles.speakingBarInline, { height: 5 }]} />
                                <View style={[styles.speakingBarInline, { height: 12 }]} />
                                <View style={[styles.speakingBarInline, { height: 7 }]} />
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {isLoading && (
                <View style={styles.chatLoadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.gold} />
                  <Text style={styles.chatLoadingText}>
                    {language === 'ta' ? 'HERIXA பதில் தேடுகிறது...' : language === 'hi' ? 'HERIXA खोज रहा है...' : 'HERIXA is thinking...'}
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.chatErrorContainer}>
                  <Feather name="alert-circle" size={16} color={COLORS.danger} />
                  <Text style={styles.chatErrorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            {/* Recording State Overlay Indicator */}
            {recordingState !== 'idle' && (
              <View style={[
                styles.recordingStatusBanner,
                recordingState === 'error' && styles.recordingStatusBannerError,
                recordingState === 'recording' && styles.recordingStatusBannerActive
              ]}>
                <Text style={styles.recordingStatusText}>{getRecordingStateLabel()}</Text>
              </View>
            )}

            {/* Input Footer */}
            <View style={styles.footerInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={
                  language === 'ta'
                    ? 'கேள்விகளைத் தட்டச்சு செய்க...'
                    : language === 'hi'
                    ? 'प्रश्न टाइप करें...'
                    : 'Type your question...'
                }
                placeholderTextColor={COLORS.textSecondary}
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={() => handleAsk()}
                editable={!isLoading}
              />

              {/* Speech Recognition Mic Icon Trigger */}
              <TouchableOpacity
                style={[
                  styles.micButton, 
                  recordingState === 'recording' && styles.micButtonActive
                ]}
                onPress={handleMicrophonePress}
                activeOpacity={0.8}
                disabled={isLoading && recordingState !== 'recording'}
              >
                <Ionicons
                  name={recordingState === 'recording' ? 'stop' : 'mic'}
                  size={18}
                  color={COLORS.background}
                />
              </TouchableOpacity>

              {/* Text Send Trigger */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  question.trim().length > 0 && !isLoading && styles.sendButtonActive
                ]}
                onPress={() => handleAsk()}
                disabled={!question || question.trim().length === 0 || isLoading}
                activeOpacity={0.8}
              >
                <Feather
                  name="arrow-up"
                  size={20}
                  color={question.trim().length > 0 && !isLoading ? COLORS.background : COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {!speechSupported && (
              <View style={{ paddingHorizontal: SPACING.xl, paddingTop: 6, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.caption, fontSize: 9, textAlign: 'center' }}>
                  * Voice input is unavailable in this app build. Please use the development build.
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  assistantCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: Platform.OS === 'ios' ? '88%' : '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    letterSpacing: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monumentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
    borderColor: COLORS.border,
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  monumentName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  presetsWrapper: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chipsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.xl,
  },
  chipText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
  },
  chatScroll: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  chatContentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
  },
  explainSimplyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: SPACING.sm,
  },
  toggleTitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  emptyResponse: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.xl,
  },
  chatBubbleContainer: {
    flexDirection: 'row',
    marginVertical: SPACING.xs,
    width: '100%',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  modelBubbleContainer: {
    justifyContent: 'flex-start',
    gap: SPACING.xs,
  },
  avatarContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  userBubble: {
    backgroundColor: COLORS.gold,
    borderTopRightRadius: BORDER_RADIUS.sm,
  },
  modelBubble: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.sm,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  chatBubbleText: {
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 18,
  },
  userBubbleText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  modelBubbleText: {
    color: COLORS.textPrimary,
  },
  bubbleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 6,
  },
  bubbleVolumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bubbleVolumeText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  speakingIndicatorInline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
    height: 12,
  },
  speakingBarInline: {
    width: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 0.5,
  },
  chatLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  chatLoadingText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
  },
  chatErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  chatErrorText: {
    color: COLORS.danger,
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
  },
  recordingStatusBanner: {
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  recordingStatusBannerActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  recordingStatusBannerError: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  recordingStatusText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  footerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    height: 52,
    gap: SPACING.xs,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodyMedium,
    paddingHorizontal: SPACING.sm,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.danger,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButtonActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
});

export default VoiceAssistant;
