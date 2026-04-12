import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { getTodayFormatted } from '../utils/dateUtils';
import { ExpenseItem } from '../components/ExpenseItem';
import { FloatingActionButton } from '../components/FloatingActionButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { dailyExpenses, currentDailyDate, isLoading, fetchDailyExpenses } =
    useExpenseStore();

  const refreshTodayExpenses = useCallback(() => {
    const today = getTodayFormatted();
    if (currentDailyDate !== today) {
      fetchDailyExpenses(today);
    }
  }, [currentDailyDate, fetchDailyExpenses]);

  useFocusEffect(
    useCallback(() => {
      refreshTodayExpenses();

      const subscription = AppState.addEventListener('change', nextState => {
        if (nextState === 'active') {
          refreshTodayExpenses();
        }
      });

      return () => {
        subscription.remove();
      };
    }, [refreshTodayExpenses]),
  );

  const totalSpent = useMemo(() => {
    return dailyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [dailyExpenses]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>Today</Text>
        <Text style={styles.totalAmount}>₹ {totalSpent.toLocaleString('en-IN')}</Text>
        <Text style={styles.subText}>Total Spent</Text>
      </View>

      <View style={styles.listContainer}>
        {isLoading && dailyExpenses.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={dailyExpenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ExpenseItem
                id={item.id}
                amount={item.amount}
                category={item.category}
                note={item.note}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No expenses for today yet.</Text>
                <Text style={styles.emptySubText}>Tap + to add one.</Text>
              </View>
            }
          />
        )}
      </View>

      <FloatingActionButton onPress={() => navigation.navigate('AddExpense')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  totalAmount: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontSize: 40,
    marginBottom: theme.spacing.xs,
  },
  subText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100, // For FAB
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
