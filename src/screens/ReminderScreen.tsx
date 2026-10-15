import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useAccountStore } from '../store/accountStore';
import { ExpenseItem } from '../components/ExpenseItem';
import { formatDateDisplay } from '../utils/dateUtils';

export const ReminderScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const {
    reminderExpenses,
    fetchReminderExpenses,
    newEntryVersion,
    reminderSyncedEntryVersion,
    isLoading,
  } = useExpenseStore();

  const { accounts, fetchAccounts } = useAccountStore();

  // account_id -> account_name lookup for the badge on each row
  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach(a => {
      map[a.id] = a.name;
    });
    return map;
  }, [accounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Refetch when a new expense was added/edited since the last reminder sync.
  useFocusEffect(
    useCallback(() => {
      if (reminderSyncedEntryVersion !== newEntryVersion) {
        fetchReminderExpenses();
      }
    }, [fetchReminderExpenses, reminderSyncedEntryVersion, newEntryVersion]),
  );

  const total = useMemo(
    () => reminderExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [reminderExpenses],
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Reminders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{reminderExpenses.length}</Text>
        </View>
      </View>

      {/* ── List / Content ── */}
      {isLoading && reminderExpenses.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reminderExpenses}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              {/* Title Section */}
              <View style={styles.titleSection}>
                <Text style={styles.screenHeading}>Upcoming Payments</Text>
                <Text style={styles.screenSubheading}>
                  Track recurring commitments and upcoming scheduled bills
                </Text>
              </View>

              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <Text style={styles.summaryLabel}>TOTAL REMINDERS VALUE</Text>
                  <View style={styles.bellIconCircle}>
                    <Icon name="bell-ring-outline" size={18} color={isDark ? colors.primary : '#B45309'} />
                  </View>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <Text style={styles.amountText}>
                    {total.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.metaText}>
                    {reminderExpenses.length} active reminder
                    {reminderExpenses.length === 1 ? '' : 's'} recorded
                  </Text>
                </View>
              </View>

              {/* Section Subtitle */}
              {reminderExpenses.length > 0 && (
                <View style={styles.listSectionHeader}>
                  <Text style={styles.listSectionTitle}>All Reminders</Text>
                  <Text style={styles.listSectionCount}>
                    {reminderExpenses.length} items
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ExpenseItem
              id={item.id}
              amount={item.amount}
              category={item.category}
              note={item.note}
              date={formatDateDisplay(item.spent_on)}
              accountId={item.account_id ?? undefined}
              accountName={
                item.account_id ? accountMap[item.account_id] : undefined
              }
              isReminder={item.is_reminder}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Icon name="bell-outline" size={40} color={colors.onSurfaceVariant} />
              </View>
              <Text style={styles.emptyTitle}>No Reminders Yet</Text>
              <Text style={styles.emptySubtitle}>
                When adding an expense, switch on "Mark as reminder" to track
                upcoming payments here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

function getStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    navIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    countBadge: {
      minWidth: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerHigh,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    countBadgeText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      flexGrow: 1,
    },
    headerContainer: {
      marginBottom: 8,
    },
    titleSection: {
      marginTop: 6,
      marginBottom: 16,
    },
    screenHeading: {
      fontSize: 24,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
      marginBottom: 4,
    },
    screenSubheading: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      lineHeight: 20,
    },
    summaryCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    summaryTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      letterSpacing: 0.5,
    },
    bellIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(224, 169, 109, 0.15)' : '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 10,
    },
    currencySymbol: {
      fontSize: 24,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
      marginRight: 4,
    },
    amountText: {
      fontSize: 34,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    metaText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    listSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginBottom: 12,
    },
    listSectionTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    listSectionCount: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      paddingHorizontal: 24,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
