import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import { format } from 'date-fns';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { useAiChatStore } from '../store/aiChatStore';
import { useAuthStore } from '../store/authStore';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { ChatMessage } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

// ─────────────────────────────────────────────────────────────
// Markdown styles generator
// ─────────────────────────────────────────────────────────────
const getMarkdownStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    body: {
      color: colors.onSurface,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: theme.fonts.regular,
    },
    strong: {
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    em: {
      fontFamily: theme.fonts.regular,
      fontStyle: 'italic',
      color: colors.onSurfaceVariant,
    },
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
    },
    list_item: {
      flexDirection: 'row',
      marginVertical: 3,
    },
    bullet_list_icon: {
      color: colors.primary,
      fontSize: 14,
      lineHeight: 22,
      marginRight: 8,
    },
    ordered_list_icon: {
      color: colors.primary,
      fontSize: 14,
      lineHeight: 22,
      marginRight: 8,
      fontFamily: theme.fonts.medium,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 6,
    },
    heading1: {
      fontSize: 20,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
      marginBottom: 8,
    },
    heading2: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 15,
      fontFamily: theme.fonts.semiBold,
      color: colors.onSurface,
      marginBottom: 4,
    },
    code_inline: {
      backgroundColor: colors.surfaceContainerHigh,
      color: colors.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: colors.surfaceContainerLowest,
      borderColor: colors.outlineVariant,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginVertical: 6,
    },
    code_block: {
      color: colors.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
    },
    hr: {
      backgroundColor: colors.outlineVariant,
      height: 1,
      marginVertical: 8,
    },
    blockquote: {
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingLeft: 12,
      marginVertical: 6,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 4,
      paddingVertical: 4,
    },
  });

// ─────────────────────────────────────────────────────────────
// Typing Indicator — 3 Animated jumping dots
// ─────────────────────────────────────────────────────────────
const TypingIndicator = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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
        ]),
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
    <View style={styles.typingRow}>
      <View style={styles.aiAvatarCircle}>
        <Icon name="creation" size={16} color={colors.primary} />
      </View>
      <View style={styles.typingCard}>
        <View style={styles.typingDotsContainer}>
          <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
          <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
          <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Message Bubble Component (User bubble & AI card)
// ─────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage;
  onAdjustCap?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onAdjustCap }) => {
  const isUser = message.role === 'user';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const markdownStyles = useMemo(() => getMarkdownStyles(colors, isDark), [colors, isDark]);

  const timeFormatted = useMemo(() => {
    try {
      return format(new Date(message.timestamp), 'HH:mm');
    } catch {
      return '';
    }
  }, [message.timestamp]);

  const currentMonthName = useMemo(() => {
    return format(new Date(), 'MMMM');
  }, []);

  if (isUser) {
    return (
      <View style={styles.userMessageContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userMessageText}>{message.content}</Text>
          <View style={styles.userMetaRow}>
            <Text style={styles.userTimeText}>{timeFormatted}</Text>
            <Icon name="check-all" size={14} color={colors.onSurfaceVariant} style={{ marginLeft: 4 }} />
          </View>
        </View>
      </View>
    );
  }

  // Detect card metadata from message content
  const lower = message.content.toLowerCase();
  const hasDining = lower.includes('dining') || lower.includes('food') || lower.includes('restaurant');
  const hasBudgetOrCap =
    lower.includes('budget') ||
    lower.includes('cap') ||
    lower.includes('spent') ||
    lower.includes('burn rate');

  const topicTitle = hasDining
    ? 'Dining & Hospitality'
    : lower.includes('travel')
    ? 'Travel & Commute'
    : lower.includes('shop')
    ? 'Shopping & Retail'
    : 'Spending Insights';

  const { monthlyExpenses } = useExpenseStore();
  const { currentBudget } = useBudgetStore();

  const totalSpent = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [monthlyExpenses]);

  const budgetCap = currentBudget || 20000;
  const utilizationPercent =
    budgetCap > 0 ? Math.min(Math.round((totalSpent / budgetCap) * 100), 100) : 0;
  const currentDay = new Date().getDate();
  const pacedBurn = currentDay > 0 ? Math.round(totalSpent / currentDay) : 0;
  const surplus = budgetCap - totalSpent;
  const isOnTarget = surplus >= 0;

  return (
    <View style={styles.aiMessageContainer}>
      <View style={styles.aiAvatarCircle}>
        <Icon name="creation" size={16} color={colors.primary} />
      </View>

      <View style={styles.aiCard}>
        {/* Card Header */}
        <View style={styles.aiCardHeader}>
          <View>
            <Text style={styles.aiCardTitle}>{topicTitle}</Text>
            <Text style={styles.aiCardSubtitle}>{currentMonthName} Cycle</Text>
          </View>

          <View
            style={[
              styles.targetBadge,
              !isOnTarget && styles.targetBadgeOver,
            ]}
          >
            <Text
              style={[
                styles.targetBadgeText,
                !isOnTarget && styles.targetBadgeTextOver,
              ]}
            >
              {isOnTarget ? '• On Target' : '• Over Cap'}
            </Text>
          </View>
        </View>

        {/* Markdown Response Text */}
        <Markdown style={markdownStyles}>{message.content}</Markdown>

        {/* Budget Utilization bar if relevant to spending/dining */}
        {hasBudgetOrCap && (
          <View style={styles.utilizationSection}>
            <View style={styles.utilizationLabelsRow}>
              <Text style={styles.utilizationLabel}>Monthly Budget Utilization</Text>
              <Text style={styles.utilizationPercent}>{utilizationPercent}% of Cap</Text>
            </View>

            <View style={styles.utilizationBarTrack}>
              <View
                style={[
                  styles.utilizationBarFill,
                  { width: `${utilizationPercent}%` },
                  !isOnTarget && { backgroundColor: colors.tertiary },
                ]}
              />
            </View>

            <View style={styles.utilizationBoundsRow}>
              <Text style={styles.utilizationBoundText}>₹0</Text>
              <Text style={styles.utilizationBoundText}>
                Cap: ₹{budgetCap.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* 3 Stat Boxes */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Spent</Text>
                <Text style={styles.statBoxValue}>
                  ₹{totalSpent.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Paced Burn</Text>
                <View style={styles.burnValueRow}>
                  <Text style={styles.statBoxValue}>
                    ₹{pacedBurn.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.burnUnit}>/day</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Forecast Surplus</Text>
                <Text
                  style={[
                    styles.statBoxValue,
                    styles.surplusValue,
                    !isOnTarget && { color: colors.tertiary },
                  ]}
                >
                  {surplus >= 0 ? '+' : '-'}₹{Math.abs(surplus).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Action button: Adjust Cap */}
            <TouchableOpacity
              style={styles.adjustCapBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (onAdjustCap) {
                  onAdjustCap();
                } else {
                  navigation.navigate('Overview' as any);
                }
              }}
            >
              <Icon name="tune-variant" size={16} color={colors.onSurface} />
              <Text style={styles.adjustCapText}>Adjust Cap</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Suggested Inquiry Sets
// ─────────────────────────────────────────────────────────────
const SUGGESTION_SETS = [
  [
    'How much did I spend this month?',
    'What was my biggest expense last week?',
    'Show my spending by category',
    "What's my average daily expense?",
  ],
  [
    'Am I on track with Dining out this month?',
    'Forecast my total burn rate by month end',
    'Which account has the highest outflow?',
    'Show my upcoming recurring reminders',
  ],
  [
    'How can I save ₹2,000 this month?',
    'Show grocery and utility comparison',
    'What is my projected surplus for this cycle?',
    'Where did I spend the most this week?',
  ],
];

// ─────────────────────────────────────────────────────────────
// Main Screen Component
// ─────────────────────────────────────────────────────────────
export const AskAiScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const { messages, isLoading, sendMessage, clearChat } = useAiChatStore();
  const { user } = useAuthStore();
  const {
    reminderExpenses,
    fetchReminderExpenses,
    fetchMonthlyExpenses,
  } = useExpenseStore();
  const { loadBudgetForMonth } = useBudgetStore();

  const [inputText, setInputText] = useState('');
  const [suggestionSetIndex, setSuggestionSetIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchReminderExpenses();
    const now = new Date();
    fetchMonthlyExpenses(now.getFullYear(), now.getMonth() + 1);
    loadBudgetForMonth(now.getFullYear(), now.getMonth() + 1);
  }, [fetchReminderExpenses, fetchMonthlyExpenses, loadBudgetForMonth]);

  const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.name || user?.email || 'ExpenseFlow';
  const userInitial = userName.charAt(0).toUpperCase();

  const currentSuggestions = SUGGESTION_SETS[suggestionSetIndex % SUGGESTION_SETS.length];

  const handleCycleSuggestions = () => {
    setSuggestionSetIndex(i => i + 1);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    Keyboard.dismiss();
    sendMessage(text);
  };

  const handleSelectSuggestion = (text: string) => {
    setInputText('');
    Keyboard.dismiss();
    sendMessage(text);
  };

  // Scroll to bottom when message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length, isLoading]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.avatarWrapper}>
            {userAvatarUrl ? (
              <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerTitle}>ExpenseFlow</Text>
          <View style={styles.advisorBadge}>
            <Icon name="creation" size={13} color={isDark ? colors.primary : '#B45309'} />
            <Text style={styles.advisorBadgeText}>AI Advisor</Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          {messages.length > 0 && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              onPress={clearChat}
            >
              <Icon name="refresh" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Reminders')}
          >
            <Icon name="bell-outline" size={22} color={colors.onSurface} />
            {reminderExpenses.length > 0 && <View style={styles.bellBadgeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List: Welcome + Inquiries Header + Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.welcomeSection}>
            {/* Center Sparkle Badge */}
            <View style={styles.welcomeIconCircle}>
              <Icon name="creation" size={26} color={colors.primary} />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.welcomeTitle}>Ask AI anything</Text>
            <Text style={styles.welcomeSubtitle}>
              I can help you understand your spending patterns, forecast burn rate, and
              optimize budget caps with quiet precision.
            </Text>

            {/* Suggested Inquiries Section */}
            <View style={styles.suggestionsHeaderRow}>
              <Text style={styles.suggestionsLabel}>SUGGESTED INQUIRIES</Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                activeOpacity={0.7}
                onPress={handleCycleSuggestions}
              >
                <Icon name="refresh" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Question Cards */}
            {currentSuggestions.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.questionCard}
                activeOpacity={0.7}
                onPress={() => handleSelectSuggestion(q)}
              >
                <View style={styles.questionArrowCircle}>
                  <Icon name="arrow-top-right" size={16} color={colors.onSurfaceVariant} />
                </View>
                <Text style={styles.questionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListFooterComponent={isLoading ? <TypingIndicator /> : null}
      />

      {/* Bottom Floating Input Bar */}
      <View
        style={[
          styles.inputContainer,
          { marginBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.micBtn}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert('Voice Input', 'Smart voice logging is coming in an upcoming update!');
          }}
        >
          <Icon name="microphone-outline" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TextInput
          style={styles.inputField}
          placeholder="Ask about your expenses..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isDark ? colors.onPrimary : '#FFFFFF'} />
          ) : (
            <Icon name="arrow-up" size={20} color={isDark ? colors.onPrimary : '#FFFFFF'} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

function getStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Top Header
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    topHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarWrapper: {
      width: 38,
      height: 38,
      borderRadius: 19,
      overflow: 'hidden',
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1.5,
      borderColor: colors.outlineVariant,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    headerTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    advisorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(224, 169, 109, 0.15)' : '#FEF3C7',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      gap: 4,
    },
    advisorBadgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: isDark ? colors.primary : '#92400E',
    },
    topHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    bellBadgeDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.tertiary,
    },

    listContent: {
      paddingBottom: 24,
    },

    // Welcome Section
    welcomeSection: {
      paddingTop: 12,
      marginBottom: 8,
    },
    welcomeIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    welcomeTitle: {
      fontSize: 26,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
      textAlign: 'center',
      marginTop: 14,
      marginBottom: 8,
    },
    welcomeSubtitle: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      lineHeight: 21,
      textAlign: 'center',
      paddingHorizontal: 28,
      marginBottom: 24,
    },

    // Suggestions Header
    suggestionsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    suggestionsLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.5,
      color: colors.onSurfaceVariant,
    },
    refreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    refreshBtnText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },

    // Question Cards
    questionCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    questionArrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    questionText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.onSurface,
      flex: 1,
    },

    // User Message
    userMessageContainer: {
      paddingHorizontal: 16,
      marginVertical: 6,
      alignItems: 'flex-end',
    },
    userBubble: {
      backgroundColor: isDark ? colors.surfaceContainerHigh : '#EAEAEF',
      borderRadius: 18,
      borderBottomRightRadius: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.outlineVariant,
      paddingHorizontal: 16,
      paddingVertical: 12,
      maxWidth: '82%',
    },
    userMessageText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurface,
      lineHeight: 20,
    },
    userMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    userTimeText: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },

    // AI Message
    aiMessageContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      marginVertical: 8,
    },
    aiAvatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginTop: 4,
    },
    aiCard: {
      flex: 1,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    aiCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    aiCardTitle: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
    },
    aiCardSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },
    targetBadge: {
      backgroundColor: isDark ? 'rgba(143, 163, 130, 0.15)' : '#D1FAE5',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    targetBadgeOver: {
      backgroundColor: isDark ? 'rgba(201, 122, 99, 0.15)' : '#FEE2E2',
    },
    targetBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: isDark ? colors.secondary : '#15803D',
    },
    targetBadgeTextOver: {
      color: isDark ? colors.tertiary : '#DC2626',
    },

    // Budget Utilization Section inside AI Card
    utilizationSection: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
    },
    utilizationLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    utilizationLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    utilizationPercent: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    utilizationBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceContainerHigh,
      overflow: 'hidden',
    },
    utilizationBarFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.secondary,
    },
    utilizationBoundsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 12,
    },
    utilizationBoundText: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },

    // 3 Stats Boxes inside AI Card
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    statBoxLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    statBoxValue: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
      marginTop: 3,
    },
    burnValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    burnUnit: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },
    surplusValue: {
      color: colors.secondary,
    },
    adjustCapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 12,
      paddingVertical: 10,
      gap: 6,
    },
    adjustCapText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.onSurface,
    },

    // Typing Indicator
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginVertical: 8,
    },
    typingCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    typingDotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    typingDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
    },

    // Bottom Input Bar
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    micBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputField: {
      flex: 1,
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurface,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
  });
}
