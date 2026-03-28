import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { Card } from '../components/Card';
import { formatDateDisplay } from '../utils/dateUtils';

export const AnalyticsScreen = () => {
  const { monthlyExpenses } = useExpenseStore();

  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    monthlyExpenses.forEach(exp => {
      summary[exp.category] = (summary[exp.category] || 0) + Number(exp.amount);
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [monthlyExpenses]);

  const dailyBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    monthlyExpenses.forEach(exp => {
      breakdown[exp.spent_on] = (breakdown[exp.spent_on] || 0) + Number(exp.amount);
    });
    return Object.entries(breakdown).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [monthlyExpenses]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Monthly Analytics</Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Category Summary</Text>
        {categorySummary.length === 0 ? (
          <Text style={styles.emptyText}>No data available.</Text>
        ) : (
          categorySummary.map(([category, amount]) => (
            <View key={category} style={styles.row}>
              <Text style={styles.rowLabel}>{category}</Text>
              <Text style={styles.rowValue}>₹ {amount.toLocaleString('en-IN')}</Text>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Daily Breakdown</Text>
        {dailyBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>No data available.</Text>
        ) : (
          dailyBreakdown.map(([date, amount]) => (
            <View key={date} style={styles.row}>
              <Text style={styles.rowLabel}>{formatDateDisplay(date)}</Text>
              <Text style={styles.rowValue}>₹ {amount.toLocaleString('en-IN')}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
    color: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    ...theme.typography.body,
    fontWeight: '500',
  },
  rowValue: {
    ...theme.typography.body,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
