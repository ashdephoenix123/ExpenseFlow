import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import { theme } from '../theme/theme';
import { useAiChatStore } from '../store/aiChatStore';
import { ChatMessage } from '../types';

// ─────────────────────────────────────────────────────────────
// Markdown styles for AI responses (dark theme)
// ─────────────────────────────────────────────────────────────
const markdownStyles = StyleSheet.create({
  body: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
  },
  strong: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  em: {
    fontFamily: theme.fonts.regular,
    fontStyle: 'italic',
    color: theme.colors.text,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bullet_list_icon: {
    color: theme.colors.primary,
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: theme.colors.primary,
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
    fontFamily: theme.fonts.medium,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
  heading1: {
    ...theme.typography.h2,
    marginBottom: 8,
  },
  heading2: {
    ...theme.typography.h3,
    marginBottom: 6,
  },
  heading3: {
    ...theme.typography.body,
    fontFamily: theme.fonts.semiBold,
    marginBottom: 4,
  },
  code_inline: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  code_block: {
    color: theme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  hr: {
    backgroundColor: theme.colors.border,
    height: 1,
    marginVertical: 8,
  },
  blockquote: {
    borderLeftColor: theme.colors.primary,
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 4,
    paddingVertical: 4,
  },
});

// ─────────────────────────────────────────────────────────────
// Typing Indicator — Animated dots
// ─────────────────────────────────────────────────────────────
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 200);
    const anim3 = createAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────
const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAi,
      ]}
    >
      {!isUser && (
        <View style={styles.aiAvatarContainer}>
          <Icon name="creation" size={16} color={theme.colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {isUser ? (
          <Text style={[styles.messageText, styles.userMessageText]}>
            {message.content}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>
            {message.content}
          </Markdown>
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Suggestion Chips (Empty State)
// ─────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'How much did I spend this month?',
  'What was my biggest expense last week?',
  'Show my spending by category',
  "What's my average daily expense?",
];

const SuggestionChips = ({ onSelect }: { onSelect: (text: string) => void }) => (
  <View style={styles.emptyStateContainer}>
    <View style={styles.emptyIconContainer}>
      <Icon name="creation" size={48} color={theme.colors.primary} />
    </View>
    <Text style={styles.emptyTitle}>Ask AI anything</Text>
    <Text style={styles.emptySubtitle}>
      I can help you understand your spending patterns. Try one of these:
    </Text>
    <View style={styles.chipsContainer}>
      {SUGGESTIONS.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={styles.chip}
          activeOpacity={0.7}
          onPress={() => onSelect(suggestion)}
        >
          <Icon
            name="arrow-top-right"
            size={14}
            color={theme.colors.primary}
            style={styles.chipIcon}
          />
          <Text style={styles.chipText}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export const AskAiScreen = () => {
  const { messages, isLoading, sendMessage, clearChat } = useAiChatStore();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    Keyboard.dismiss();
    sendMessage(text);
  };

  const handleSuggestionSelect = (text: string) => {
    setInputText('');
    sendMessage(text);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading]);

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} />
  );

  const hasMessages = messages.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'height' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
    >
      {/* Header Actions */}
      {hasMessages && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearChat}
            activeOpacity={0.7}
          >
            <Icon
              name="delete-sweep-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.clearButtonText}>Clear chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message List or Empty State */}
      {hasMessages ? (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />
      ) : (
        <SuggestionChips onSelect={handleSuggestionSelect} />
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your expenses..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.7}
          >
            <Icon
              name="send"
              size={20}
              color={
                inputText.trim() && !isLoading
                  ? '#ffffff'
                  : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header actions
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
  },
  clearButtonText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },

  // Message list
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },

  // Message rows
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAi: {
    alignSelf: 'flex-start',
  },

  // AI avatar
  aiAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },

  // Bubbles
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },

  // Message text
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: theme.colors.text,
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginLeft: 36, // Align with AI bubbles (after avatar)
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },

  // Empty state
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  chipsContainer: {
    width: '100%',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chipIcon: {
    marginRight: 10,
  },
  chipText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 14,
    flex: 1,
  },

  // Input bar
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    maxHeight: 100,
    paddingVertical: 8,
    includeFontPadding: false,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
});
