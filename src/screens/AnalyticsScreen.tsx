import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { formatDateDisplay } from '../utils/dateUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CATEGORY_COLORS = [
  '#8b5cf6', // purple
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#22c55e', // green
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
];

export const AnalyticsScreen = () => {
  const {
    monthlyExpenses,
    currentMonthlyKey,
    newEntryVersion,
    monthlySyncedEntryVersion,
    fetchMonthlyExpenses,
  } = useExpenseStore();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Refetch monthly data if a new expense was added since last sync
  useFocusEffect(
    useCallback(() => {
      if (monthlySyncedEntryVersion !== newEntryVersion && currentMonthlyKey) {
        const [year, month] = currentMonthlyKey.split('-').map(Number);
        fetchMonthlyExpenses(year, month);
      }
    }, [
      currentMonthlyKey,
      fetchMonthlyExpenses,
      monthlySyncedEntryVersion,
      newEntryVersion,
    ]),
  );

  const totalMonthly = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [monthlyExpenses],
  );

  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    monthlyExpenses.forEach(exp => {
      summary[exp.category] = (summary[exp.category] || 0) + Number(exp.amount);
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [monthlyExpenses]);

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, typeof monthlyExpenses> = {};
    monthlyExpenses.forEach(exp => {
      if (!grouped[exp.category]) grouped[exp.category] = [];
      grouped[exp.category].push(exp);
    });
    Object.values(grouped).forEach(list =>
      list.sort((a, b) => new Date(b.spent_on).getTime() - new Date(a.spent_on).getTime()),
    );
    return grouped;
  }, [monthlyExpenses]);

  const dailyBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    monthlyExpenses.forEach(exp => {
      breakdown[exp.spent_on] = (breakdown[exp.spent_on] || 0) + Number(exp.amount);
    });
    return Object.entries(breakdown).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
  }, [monthlyExpenses]);

  const highestDay = useMemo(() => {
    if (dailyBreakdown.length === 0) return null;
    return dailyBreakdown.reduce((max, cur) => (cur[1] > max[1] ? cur : max));
  }, [dailyBreakdown]);

  const avgPerDay = useMemo(() => {
    if (dailyBreakdown.length === 0) return 0;
    return totalMonthly / dailyBreakdown.length;
  }, [totalMonthly, dailyBreakdown]);

  const isEmpty = monthlyExpenses.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
            <Icon name="cash-multiple" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>
            ₹ {totalMonthly.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
            <Icon name="calculator-variant" size={20} color={theme.colors.success} />
          </View>
          <Text style={styles.statValue}>
            ₹ {Math.round(avgPerDay).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.statLabel}>Avg / Day</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
            <Icon name="receipt" size={20} color="#f97316" />
          </View>
          <Text style={styles.statValue}>{monthlyExpenses.length}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
      </View>

      {/* Category Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="shape" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
        </View>

        <View style={styles.card}>
          {isEmpty ? (
            <View style={styles.emptyContainer}>
              <Icon name="chart-pie" size={40} color={theme.colors.border} />
              <Text style={styles.emptyText}>No data for this month</Text>
            </View>
          ) : (
            <>
              {categorySummary.map(([category, amount], index) => {
                const percentage = totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0;
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                const isExpanded = expandedCategory === category;
                const categoryExpenses = expensesByCategory[category] || [];
                return (
                  <View key={category}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        setExpandedCategory(isExpanded ? null : category)
                      }
                      style={styles.barRow}
                    >
                      <View style={styles.barLabelRow}>
                        <View style={styles.barLabelLeft}>
                          <View style={[styles.colorDot, { backgroundColor: color }]} />
                          <Text style={styles.barCategory} numberOfLines={1}>
                            {category}
                          </Text>
                        </View>
                        <View style={styles.barRightGroup}>
                          <Text style={styles.barAmount}>
                            ₹ {amount.toLocaleString('en-IN')}
                          </Text>
                          <Icon
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={theme.colors.textSecondary}
                          />
                        </View>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${percentage}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <Text style={styles.barPercent}>
                        {percentage.toFixed(1)}% · {categoryExpenses.length} item{categoryExpenses.length !== 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>

                    {/* Accordion content */}
                    {isExpanded && (
                      <View style={[styles.accordionBody, { borderLeftColor: color }]}>
                        {categoryExpenses.map((exp, i) => (
                          <View
                            key={exp.id}
                            style={[
                              styles.accordionItem,
                              i < categoryExpenses.length - 1 && styles.accordionItemBorder,
                            ]}
                          >
                            <View style={styles.accordionItemLeft}>
                              <Text style={styles.accordionNote} numberOfLines={1}>
                                {exp.note || 'No note'}
                              </Text>
                              <Text style={styles.accordionDate}>
                                {formatDateDisplay(exp.spent_on)}
                              </Text>
                            </View>
                            <Text style={styles.accordionAmount}>
                              ₹ {Number(exp.amount).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* Daily Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-text" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Daily Spending</Text>
        </View>

        <View style={styles.card}>
          {isEmpty ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-blank" size={40} color={theme.colors.border} />
              <Text style={styles.emptyText}>No data for this month</Text>
            </View>
          ) : (
            dailyBreakdown.map(([date, amount], index) => {
              const isHighest = highestDay && date === highestDay[0];
              const barWidth = highestDay
                ? (amount / highestDay[1]) * 100
                : 0;
              return (
                <View
                  key={date}
                  style={[
                    styles.dailyRow,
                    index < dailyBreakdown.length - 1 && styles.dailyRowBorder,
                  ]}
                >
                  <View style={styles.dailyLeft}>
                    <Text style={styles.dailyDate}>{formatDateDisplay(date)}</Text>
                    <View style={styles.dailyBarTrack}>
                      <View
                        style={[
                          styles.dailyBarFill,
                          {
                            width: `${barWidth}%`,
                            backgroundColor: isHighest
                              ? '#f97316'
                              : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.dailyRight}>
                    <Text
                      style={[
                        styles.dailyAmount,
                        isHighest && styles.dailyAmountHighest,
                      ]}
                    >
                      ₹ {amount.toLocaleString('en-IN')}
                    </Text>
                    {isHighest && (
                      <View style={styles.highBadge}>
                        <Text style={styles.highBadgeText}>HIGHEST</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 2,
  },
  statLabel: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    color: theme.colors.text,
  },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Category bars
  barRow: {
    marginBottom: 16,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  barCategory: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  barAmount: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
  },
  barRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barPercent: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  // Accordion
  accordionBody: {
    marginLeft: 5,
    marginBottom: 16,
    paddingLeft: 14,
    borderLeftWidth: 2,
  },
  accordionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  accordionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  accordionItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  accordionNote: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.text,
  },
  accordionDate: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  accordionAmount: {
    ...theme.typography.body,
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
  },

  // Daily rows
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dailyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dailyLeft: {
    flex: 1,
    marginRight: 12,
  },
  dailyDate: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 6,
  },
  dailyBarTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  dailyBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  dailyRight: {
    alignItems: 'flex-end',
  },
  dailyAmount: {
    ...theme.typography.body,
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text,
  },
  dailyAmountHighest: {
    color: '#f97316',
  },
  highBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  highBadgeText: {
    ...theme.typography.small,
    fontSize: 9,
    color: '#f97316',
    fontFamily: theme.fonts.semiBold,
    letterSpacing: 0.8,
  },
});
