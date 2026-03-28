import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { ExpenseItem } from '../components/ExpenseItem';
import { formatDateDisplay } from '../utils/dateUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MonthlyScreen = () => {
  const { monthlyExpenses, isLoading, fetchMonthlyExpenses } = useExpenseStore();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Refetch whenever the tab gains focus OR month/year changes
  useFocusEffect(
    useCallback(() => {
      fetchMonthlyExpenses(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth])
  );

  const totalSpent = useMemo(() => {
    return monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
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

        <Text style={styles.totalAmount}>₹ {totalSpent.toLocaleString('en-IN')}</Text>
        <Text style={styles.subText}>Total Spent this Month</Text>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={monthlyExpenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ExpenseItem
                id={item.id}
                amount={item.amount}
                category={item.category}
                note={item.note}
                date={formatDateDisplay(item.spent_on)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No expenses found.</Text>
                <Text style={styles.emptySubText}>Try selecting a different month.</Text>
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
