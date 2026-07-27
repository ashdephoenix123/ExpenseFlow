import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useAccountStore } from '../store/accountStore';
import { ExpenseItem } from '../components/ExpenseItem';
import { formatDateDisplay } from '../utils/dateUtils';

export const ReminderScreen = () => {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.totalAmount}>
          ₹ {total.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.subText}>
          {reminderExpenses.length} reminder
          {reminderExpenses.length === 1 ? '' : 's'}
        </Text>
      </View>

      {isLoading && reminderExpenses.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={reminderExpenses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
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
              <Icon
                name="bell-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>No reminders yet</Text>
              <Text style={styles.emptySubText}>
                Turn on "Mark as reminder" while adding an expense and it will
                show up here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  totalAmount: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 2,
    includeFontPadding: false,
  },
  subText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    includeFontPadding: false,
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  emptySubText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
