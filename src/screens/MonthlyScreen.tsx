import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { ExpenseItem } from '../components/ExpenseItem';
import { formatDateDisplay } from '../utils/dateUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Expense } from '../types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type MonthlyListItem =
  | { type: 'date_header'; id: string; date: string }
  | { type: 'expense'; id: string; expense: Expense };

export const MonthlyScreen = () => {
  const { monthlyExpenses, isLoading, fetchMonthlyExpenses } =
    useExpenseStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Refetch whenever the tab gains focus OR month/year changes
  useFocusEffect(
    useCallback(() => {
      fetchMonthlyExpenses(selectedYear, selectedMonth);
    }, [fetchMonthlyExpenses, selectedYear, selectedMonth]),
  );

  const totalSpent = useMemo(() => {
    return monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [monthlyExpenses]);

  const dayTotals = useMemo(() => {
    return monthlyExpenses.reduce<Record<string, number>>((acc, expense) => {
      const date = expense.spent_on;
      acc[date] = (acc[date] ?? 0) + Number(expense.amount);
      return acc;
    }, {});
  }, [monthlyExpenses]);

  const listItems = useMemo<MonthlyListItem[]>(() => {
    const items: MonthlyListItem[] = [];
    let currentDate = '';

    monthlyExpenses.forEach(expense => {
      if (expense.spent_on !== currentDate) {
        currentDate = expense.spent_on;
        items.push({
          type: 'date_header',
          id: `date-${currentDate}`,
          date: currentDate,
        });
      }

      items.push({
        type: 'expense',
        id: expense.id,
        expense,
      });
    });

    return items;
  }, [monthlyExpenses]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.selector}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.iconBtn}>
            <Icon name="chevron-left" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.dateText}>
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.iconBtn}>
            <Icon name="chevron-right" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.totalAmount}>
          ₹ {totalSpent.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.subText}>Total Spent this Month</Text>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              if (item.type === 'date_header') {
                return (
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>
                      {formatDateDisplay(item.date)}
                    </Text>
                    <Text style={styles.dayHeaderAmount}>
                      ₹ {(dayTotals[item.date] ?? 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                );
              }

              return (
                <ExpenseItem
                  id={item.expense.id}
                  amount={item.expense.amount}
                  category={item.expense.category}
                  note={item.expense.note}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No expenses found.</Text>
                <Text style={styles.emptySubText}>
                  Try selecting a different month.
                </Text>
              </View>
            }
          />
        )}
      </View>
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
    paddingTop: theme.spacing.lg,
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconBtn: {
    padding: theme.spacing.sm,
  },
  dateText: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    width: 120,
    textAlign: 'center',
  },
  totalAmount: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontSize: 36,
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
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  dayHeaderText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  dayHeaderAmount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
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
