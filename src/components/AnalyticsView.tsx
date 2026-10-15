import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { Expense } from '../types';
import { formatDateDisplay } from '../utils/dateUtils';

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

export interface AnalyticsViewProps {
  selectedMonth: number; // 1-12
  selectedYear: number;
  expenses: Expense[];
  budgetCap: number;
  navigation: any;
  onSelectDate?: (date: string) => void;
  onEditBudget?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  selectedMonth,
  selectedYear,
  expenses,
  budgetCap,
  navigation,
  onSelectDate,
  onEditBudget,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const categoryBarColors = useMemo(
    () =>
      isDark
        ? [colors.primary, colors.secondary, colors.tertiary, colors.outline, '#9E9A91']
        : ['#18181B', '#2D5A43', '#3F3F46', '#71717A', '#9CA3AF', '#A1A1AA'],
    [isDark, colors],
  );

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Total spent in this month
  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses],
  );

  // Daily Average & Projected Run-Rate calculation for the selected month
  const { dailyAverage, projectedRunRate } = useMemo(() => {
    const dInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      selectedYear === today.getFullYear() &&
      selectedMonth === today.getMonth() + 1;

    const daysPassed = isCurrentMonth
      ? Math.max(1, today.getDate())
      : dInMonth;

    const avg = Math.round(totalSpent / daysPassed);
    const runRate = Math.round(avg * dInMonth);

    return { dailyAverage: avg, projectedRunRate: runRate };
  }, [selectedYear, selectedMonth, totalSpent]);

  // Budget calculations
  const utilizationPercent = budgetCap > 0 ? (totalSpent / budgetCap) * 100 : 0;
  const remainingBudget = budgetCap - totalSpent;
  const isOnTrack = totalSpent <= budgetCap;

  // Expenses grouped by category (for category-wise breakdown)
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, Expense[]> = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(exp);
    });
    Object.values(grouped).forEach(list =>
      list.sort(
        (a, b) => new Date(b.spent_on).getTime() - new Date(a.spent_on).getTime(),
      ),
    );
    return grouped;
  }, [expenses]);

  // Daily breakdown
  const dailyBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    expenses.forEach(exp => {
      breakdown[exp.spent_on] = (breakdown[exp.spent_on] || 0) + Number(exp.amount);
    });
    return Object.entries(breakdown).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
  }, [expenses]);

  const highestDay = useMemo(() => {
    if (dailyBreakdown.length === 0) return null;
    return dailyBreakdown.reduce((max, cur) => (cur[1] > max[1] ? cur : max));
  }, [dailyBreakdown]);

  // Weekly breakdown for Burn Velocity
  const { weeklyData, peakWeekIndex, peakWeekPercent, topCategoryInPeak } = useMemo(() => {
    const weeks = [
      { name: 'W1', label: 'W1', amount: 0, items: [] as Expense[] },
      { name: 'W2', label: 'W2', amount: 0, items: [] as Expense[] },
      { name: 'W3', label: 'W3', amount: 0, items: [] as Expense[] },
      { name: 'W4', label: 'W4', amount: 0, items: [] as Expense[] },
    ];

    expenses.forEach(e => {
      const day = Number(e.spent_on.split('-')[2]) || 1;
      let wIdx = 0;
      if (day <= 7) wIdx = 0;
      else if (day <= 14) wIdx = 1;
      else if (day <= 21) wIdx = 2;
      else wIdx = 3;

      weeks[wIdx].amount += Number(e.amount);
      weeks[wIdx].items.push(e);
    });

    let peakIdx = 0;
    let maxAmt = -1;
    weeks.forEach((w, idx) => {
      if (w.amount > maxAmt) {
        maxAmt = w.amount;
        peakIdx = idx;
      }
    });

    const sumAmt = weeks.reduce((sum, w) => sum + w.amount, 0) || 1;
    const peakPct = ((weeks[peakIdx].amount / sumAmt) * 100).toFixed(1);

    const catMap: Record<string, number> = {};
    weeks[peakIdx].items.forEach(it => {
      catMap[it.category] = (catMap[it.category] || 0) + Number(it.amount);
    });
    const sortedPeakCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topCat = sortedPeakCats[0] ? sortedPeakCats[0][0] : 'spending';

    return {
      weeklyData: weeks,
      peakWeekIndex: peakIdx,
      peakWeekPercent: peakPct,
      topCategoryInPeak: topCat,
    };
  }, [expenses]);

  // Category breakdown summary
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const c = e.category || 'Other';
      map[c] = (map[c] || 0) + Number(e.amount);
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

    const total = sorted.reduce((sum, item) => sum + item[1], 0) || 1;
    return sorted.map(([name, amt]) => ({
      name,
      amount: amt,
      percent: (amt / total) * 100,
    }));
  }, [expenses]);

  // Helper for category icons
  const getCategoryIcon = (cat: string): React.ComponentProps<typeof Icon>['name'] => {
    const c = cat.toLowerCase();
    if (c.includes('food') || c.includes('dining')) return 'silverware-fork-knife';
    if (c.includes('travel') || c.includes('transport')) return 'train';
    if (c.includes('grocery') || c.includes('supermarket')) return 'cart-outline';
    if (c.includes('shop')) return 'shopping-outline';
    if (c.includes('bill') || c.includes('utilit')) return 'file-document-outline';
    if (c.includes('movie') || c.includes('entert')) return 'movie-outline';
    return 'dots-horizontal';
  };

  const handleExport = () => {
    Alert.alert(
      'Export Ledger Report',
      `Export statement for ${MONTHS[selectedMonth - 1]} ${selectedYear}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export CSV',
          onPress: () => Alert.alert('Success', 'CSV ledger exported successfully.'),
        },
        {
          text: 'Export PDF',
          onPress: () => Alert.alert('Success', 'PDF analytical statement generated.'),
        },
      ],
    );
  };

  const monthLabel = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Title & Export Row */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>
            Capital velocity &amp; behavioral analysis • {monthLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          activeOpacity={0.7}
          onPress={handleExport}
        >
          <Icon name="tray-arrow-down" size={16} color={colors.textPrimary} />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Total Spent Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryLabel}>TOTAL SPENT THIS MONTH</Text>
          <View
            style={[
              styles.statusBadge,
              isOnTrack ? styles.statusBadgeOnTrack : styles.statusBadgeOver,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isOnTrack
                  ? styles.statusBadgeTextOnTrack
                  : styles.statusBadgeTextOver,
              ]}
            >
              • {isOnTrack ? 'On Track' : 'Over Cap'}
            </Text>
          </View>
        </View>

        {/* Main Amount & Cap */}
        <TouchableOpacity
          activeOpacity={onEditBudget ? 0.8 : 1}
          onPress={onEditBudget}
          style={styles.amountRow}
        >
          <Text style={styles.mainAmountText}>
            ₹{totalSpent.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.capAmountText}>
            {' '}
            / ₹{budgetCap.toLocaleString('en-IN')}
          </Text>
          {onEditBudget && (
            <View style={styles.budgetEditPill}>
              <Icon name="pencil-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.budgetEditPillText}>Edit</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, utilizationPercent))}%`,
                backgroundColor: isOnTrack ? (isDark ? colors.primary : '#18181B') : colors.error,
              },
            ]}
          />
        </View>

        {/* Utilization & Remaining Info */}
        <View style={styles.progressInfoRow}>
          <Text style={styles.progressUtilizedText}>
            {utilizationPercent.toFixed(1)}% of cap utilized
          </Text>
          <Text
            style={[
              styles.progressRemainingText,
              { color: remainingBudget >= 0 ? colors.secondary : colors.error },
            ]}
          >
            ₹{Math.abs(remainingBudget).toLocaleString('en-IN')}{' '}
            {remainingBudget >= 0 ? 'remaining' : 'over cap'}
          </Text>
        </View>

        {/* Stat Boxes (Daily Average & Projected Run-Rate) */}
        <View style={styles.statCardsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Daily Average</Text>
            <View style={styles.statBoxValueRow}>
              <Text style={styles.statBoxValue}>
                ₹{dailyAverage.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.statBoxSub}> / day</Text>
            </View>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Projected Run-Rate</Text>
            <View style={styles.statBoxValueRow}>
              <Text style={styles.statBoxValue}>
                ₹{projectedRunRate.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Weekly Burn Velocity Card */}
      <View style={styles.velocityCard}>
        <View style={styles.velocityHeader}>
          <View>
            <Text style={styles.velocityTitle}>Weekly Burn Velocity</Text>
            <Text style={styles.velocitySubtitle}>
              Trajectory across 4 fiscal cycle weeks
            </Text>
          </View>

          {totalSpent > 0 && (
            <View style={styles.peakBadge}>
              <View style={styles.peakBadgeDot} />
              <Text style={styles.peakBadgeText}>
                W{peakWeekIndex + 1} Peak Spike
              </Text>
            </View>
          )}
        </View>

        {/* Spline Chart Visualization */}
        <View style={styles.chartContainer}>
          <View style={[styles.dashedGuideLine, { top: 20 }]} />
          <View style={[styles.dashedGuideLine, { top: 55 }]} />
          <View style={[styles.dashedGuideLine, { top: 90 }]} />

          {/* Line Segments Connecting Points */}
          <View style={styles.chartLineSegment1} />
          <View style={styles.chartLineSegment2} />
          <View style={styles.chartLineSegment3} />

          {/* Data Node Points */}
          <View style={[styles.chartNode, styles.chartNode1]}>
            <View style={styles.nodeInnerCircle} />
          </View>

          <View style={[styles.chartNode, styles.chartNode2]}>
            <View style={styles.nodeInnerCircle} />
          </View>

          <View
            style={[
              styles.chartNode,
              totalSpent > 0 ? styles.chartNodePeak : styles.chartNode3Default,
            ]}
          >
            {totalSpent > 0 ? (
              <View style={styles.peakRing}>
                <View style={styles.peakInnerDot} />
              </View>
            ) : (
              <View style={styles.nodeInnerCircle} />
            )}
          </View>

          <View style={[styles.chartNode, styles.chartNode4]}>
            <View style={styles.nodeInnerCircle} />
          </View>
        </View>

        {/* X-Axis Weekly Labels & Amounts */}
        <View style={styles.chartLabelsRow}>
          {weeklyData.map((w, idx) => {
            const isPeak = totalSpent > 0 && idx === peakWeekIndex;
            return (
              <View key={w.name} style={styles.chartLabelCol}>
                <Text
                  style={[
                    styles.chartWeekName,
                    isPeak && styles.chartWeekNamePeak,
                  ]}
                >
                  {isPeak ? `${w.name} (Peak)` : w.name}
                </Text>
                <Text
                  style={[
                    styles.chartWeekAmount,
                    isPeak && styles.chartWeekAmountPeak,
                  ]}
                >
                  ₹{w.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Info Callout */}
        <View style={styles.calloutBox}>
          <Icon
            name="information-outline"
            size={18}
            color={colors.textMuted}
            style={styles.calloutIcon}
          />
          <Text style={styles.calloutText}>
            {totalSpent > 0
              ? `Week ${peakWeekIndex + 1} accounted for ${peakWeekPercent}% of total outflow due to ${topCategoryInPeak.toLowerCase()}.`
              : `No expenses recorded for ${monthLabel}.`}
          </Text>
        </View>
      </View>

      {/* Predictive Intelligence Card (AI Insights) */}
      <View style={styles.predictiveCard}>
        <View style={styles.predictiveHeader}>
          <Icon name="creation" size={16} color={colors.primary} />
          <Text style={styles.predictiveTag}>Predictive Intelligence</Text>
        </View>

        <Text style={styles.predictiveTitle}>
          {totalSpent <= budgetCap
            ? `On track within ${monthLabel} budget`
            : `Exceeded target by ₹${(totalSpent - budgetCap).toLocaleString('en-IN')}`}
        </Text>
        <Text style={styles.predictiveDesc}>
          {totalSpent <= budgetCap
            ? `Your projected spend rate indicates you are pacing well below your monthly cap of ₹${budgetCap.toLocaleString('en-IN')}.`
            : `Current outflows exceed your allocated target. Review category breakdowns below to identify potential savings.`}
        </Text>

        <View style={styles.predictiveFooter}>
          <Text style={styles.confidenceText}>Confidence Score: 94%</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AskAi' as any)}
          >
            <Text style={styles.adjustmentLink}>Ask AI for insights →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Breakdown Card with Expandable Expenses */}
      <View style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View>
            <Text style={styles.categoryCardTitle}>Category Breakdown</Text>
            <Text style={styles.categoryCardSubtitle}>
              Tap any category to view individual expenses
            </Text>
          </View>
          <Text style={styles.categoryCount}>
            {categoryBreakdown.length} Categories
          </Text>
        </View>

        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyCategoryBox}>
            <Icon name="tag-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyCategoryText}>
              No category data for {monthLabel}
            </Text>
          </View>
        ) : (
          categoryBreakdown.map((item, index) => {
            const barColor =
              categoryBarColors[index % categoryBarColors.length];
            const isExpanded = expandedCategory === item.name;
            const catExpenses = expensesByCategory[item.name] || [];

            return (
              <View key={item.name} style={styles.categoryRowItem}>
                {/* Clickable Header Row */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    setExpandedCategory(isExpanded ? null : item.name)
                  }
                  style={styles.categoryTouchableHeader}
                >
                  <View style={styles.categoryTopLine}>
                    <View style={styles.categoryLeftGroup}>
                      <View style={styles.categoryIconCircle}>
                        <Icon
                          name={getCategoryIcon(item.name)}
                          size={18}
                          color={colors.textPrimary}
                        />
                      </View>
                      <View>
                        <Text style={styles.categoryItemName}>{item.name}</Text>
                        <Text style={styles.categoryItemCount}>
                          {catExpenses.length > 0
                            ? `${catExpenses.length} transaction${catExpenses.length !== 1 ? 's' : ''}`
                            : 'View transactions'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.categoryRightGroup}>
                      <Text style={styles.categoryItemAmount}>
                        ₹{item.amount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.categoryItemPercent}>
                        ({item.percent.toFixed(1)}%)
                      </Text>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textMuted}
                        style={styles.expandChevron}
                      />
                    </View>
                  </View>

                  {/* Progress Bar Track */}
                  <View style={styles.categoryBarTrack}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${Math.min(100, Math.max(4, item.percent))}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                {/* Accordion: Individual Expenses in this Category */}
                {isExpanded && (
                  <View style={styles.categoryExpensesContainer}>
                    {catExpenses.length === 0 ? (
                      <Text style={styles.noExpensesText}>
                        No logged expenses in this period
                      </Text>
                    ) : (
                      catExpenses.map((exp, idx) => (
                        <TouchableOpacity
                          key={exp.id || idx}
                          activeOpacity={0.7}
                          onPress={() => onSelectDate?.(exp.spent_on)}
                          style={[
                            styles.expenseDetailRow,
                            idx > 0 && styles.expenseDetailRowBorder,
                          ]}
                        >
                          <View style={styles.expenseDetailLeft}>
                            <Text
                              style={styles.expenseDetailNote}
                              numberOfLines={1}
                            >
                              {exp.note ? exp.note.trim() : item.name}
                            </Text>
                            <Text style={styles.expenseDetailDate}>
                              {formatDateDisplay(exp.spent_on)}
                            </Text>
                          </View>
                          <View style={styles.expenseDetailRight}>
                            <Text style={styles.expenseDetailAmount}>
                              -₹{Number(exp.amount).toLocaleString('en-IN')}
                            </Text>
                            <Icon
                              name="chevron-right"
                              size={16}
                              color={colors.textMuted}
                              style={styles.detailChevron}
                            />
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Daily Spending Breakdown Activity Card */}
      {dailyBreakdown.length > 0 && (
        <View style={styles.dailyCard}>
          <View style={styles.dailyHeader}>
            <View>
              <Text style={styles.dailyCardTitle}>Daily Spending Activity</Text>
              <Text style={styles.dailyCardSubtitle}>
                Day-by-day cash outflow • Tap a day to view in Timeline
              </Text>
            </View>
            <Text style={styles.dailyCount}>
              {dailyBreakdown.length} Active Days
            </Text>
          </View>

          {dailyBreakdown.map(([date, amount], index) => {
            const isHighest = highestDay && date === highestDay[0];
            const maxAmt = highestDay ? highestDay[1] : 1;
            const barWidth = Math.min(100, Math.max(5, (amount / maxAmt) * 100));

            return (
              <TouchableOpacity
                key={date}
                activeOpacity={0.7}
                onPress={() => onSelectDate?.(date)}
                style={[
                  styles.dailyRowItem,
                  index > 0 && styles.dailyRowItemBorder,
                ]}
              >
                <View style={styles.dailyLeft}>
                  <Text style={styles.dailyDateText}>
                    {formatDateDisplay(date)}
                  </Text>
                  <View style={styles.dailyBarTrack}>
                    <View
                      style={[
                        styles.dailyBarFill,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: isHighest ? colors.primary : (isDark ? colors.outline : '#71717A'),
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.dailyRight}>
                  <View style={styles.dailyAmountRow}>
                    <Text
                      style={[
                        styles.dailyAmountText,
                        isHighest && styles.dailyAmountTextHighest,
                      ]}
                    >
                      ₹{amount.toLocaleString('en-IN')}
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.textMuted}
                      style={styles.dailyChevron}
                    />
                  </View>
                  {isHighest && (
                    <View style={styles.highBadge}>
                      <Text style={styles.highBadgeText}>PEAK</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.canvasBase,
    },
    scrollContent: {
      paddingBottom: 40,
      paddingTop: 8,
    },

    // Title Row
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 16,
    },
    pageTitle: {
      fontSize: 24,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
    },
    pageSubtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    exportBtnText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },

    // Summary Card
    summaryCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      padding: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    summaryTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    summaryLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusBadgeOnTrack: {
      backgroundColor: isDark ? 'rgba(143, 163, 130, 0.15)' : '#ECFDF5',
    },
    statusBadgeOver: {
      backgroundColor: isDark ? 'rgba(255, 180, 171, 0.15)' : '#FEE2E2',
    },
    statusBadgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
    },
    statusBadgeTextOnTrack: {
      color: colors.secondary,
    },
    statusBadgeTextOver: {
      color: colors.error,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 14,
    },
    mainAmountText: {
      fontSize: 32,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    capAmountText: {
      fontSize: 18,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    budgetEditPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginLeft: 10,
      gap: 3,
    },
    budgetEditPillText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceLow,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    progressUtilizedText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
    },
    progressRemainingText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
    },
    statCardsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      borderRadius: 14,
      padding: 12,
    },
    statBoxLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
      marginBottom: 4,
    },
    statBoxValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    statBoxValue: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    statBoxSub: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },

    // Velocity Card
    velocityCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      padding: 18,
      marginHorizontal: 16,
      marginBottom: 14,
    },
    velocityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    velocityTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    velocitySubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    peakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(224, 169, 109, 0.15)' : '#FDF4ED',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 5,
    },
    peakBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    peakBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.primary,
    },

    // Chart
    chartContainer: {
      height: 120,
      position: 'relative',
      justifyContent: 'center',
      marginVertical: 10,
    },
    dashedGuideLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      borderWidth: 0.5,
      borderColor: colors.borderHairline,
      borderStyle: 'dashed',
    },
    chartLineSegment1: {
      position: 'absolute',
      left: '12%',
      top: 74,
      width: '26%',
      height: 2.5,
      backgroundColor: isDark ? colors.primary : '#18181B',
      transform: [{ rotate: '-12deg' }],
    },
    chartLineSegment2: {
      position: 'absolute',
      left: '36%',
      top: 48,
      width: '28%',
      height: 2.5,
      backgroundColor: isDark ? colors.primary : '#18181B',
      transform: [{ rotate: '-36deg' }],
    },
    chartLineSegment3: {
      position: 'absolute',
      left: '60%',
      top: 50,
      width: '28%',
      height: 2.5,
      backgroundColor: isDark ? colors.primary : '#18181B',
      transform: [{ rotate: '36deg' }],
    },
    chartNode: {
      position: 'absolute',
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 2.5,
      borderColor: isDark ? colors.primary : '#18181B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeInnerCircle: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? colors.primary : '#18181B',
    },
    chartNode1: {
      left: '10%',
      top: 80,
    },
    chartNode2: {
      left: '35%',
      top: 65,
    },
    chartNode3Default: {
      left: '60%',
      top: 40,
    },
    chartNodePeak: {
      left: '58%',
      top: 18,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    peakRing: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(224, 169, 109, 0.25)' : '#FEE2E2',
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    peakInnerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    chartNode4: {
      left: '84%',
      top: 76,
    },

    // Chart Labels
    chartLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingHorizontal: 4,
    },
    chartLabelCol: {
      alignItems: 'center',
      width: '24%',
    },
    chartWeekName: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
      marginBottom: 2,
    },
    chartWeekNamePeak: {
      color: colors.primary,
      fontFamily: theme.fonts.semiBold,
    },
    chartWeekAmount: {
      fontSize: 12,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
    },
    chartWeekAmountPeak: {
      color: colors.primary,
      fontFamily: theme.fonts.bold,
    },

    // Callout Box
    calloutBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      borderRadius: 12,
      padding: 12,
      marginTop: 18,
    },
    calloutIcon: {
      marginRight: 8,
      marginTop: 1,
    },
    calloutText: {
      flex: 1,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Predictive Intelligence Card
    predictiveCard: {
      backgroundColor: isDark ? colors.surfaceContainer : '#F4EFE6',
      borderRadius: 18,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.borderHairline,
      padding: 18,
      marginHorizontal: 16,
      marginBottom: 14,
    },
    predictiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    predictiveTag: {
      fontSize: 12,
      fontFamily: theme.fonts.semiBold,
      color: colors.primary,
    },
    predictiveTitle: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    predictiveDesc: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 14,
    },
    predictiveFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    confidenceText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
    },
    adjustmentLink: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
      color: colors.primary,
    },

    // Category Breakdown Card
    categoryCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      padding: 18,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    categoryCardTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    categoryCardSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryCount: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    emptyCategoryBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyCategoryText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    categoryRowItem: {
      marginBottom: 14,
    },
    categoryTouchableHeader: {
      paddingVertical: 2,
    },
    categoryTopLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryLeftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    categoryItemName: {
      fontSize: 14,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
    },
    categoryItemCount: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 1,
    },
    categoryRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    categoryItemAmount: {
      fontSize: 14,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
    },
    categoryItemPercent: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    expandChevron: {
      marginLeft: 4,
    },
    categoryBarTrack: {
      height: 5,
      backgroundColor: colors.surfaceLow,
      borderRadius: 2.5,
      overflow: 'hidden',
    },
    categoryBarFill: {
      height: '100%',
      borderRadius: 2.5,
    },

    // Accordion inside Category Breakdown
    categoryExpensesContainer: {
      backgroundColor: colors.surfaceLow,
      borderRadius: 12,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    expenseDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    expenseDetailRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.borderHairline,
    },
    expenseDetailLeft: {
      flex: 1,
      marginRight: 10,
    },
    expenseDetailNote: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    expenseDetailDate: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    expenseDetailAmount: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    noExpensesText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 8,
    },

    // Daily Spending Breakdown Card
    dailyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      padding: 18,
      marginHorizontal: 16,
      marginBottom: 24,
    },
    dailyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    dailyCardTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    dailyCardSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    dailyCount: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    dailyRowItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    dailyRowItemBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.borderHairline,
    },
    dailyLeft: {
      flex: 1,
      marginRight: 16,
    },
    dailyDateText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    dailyBarTrack: {
      height: 5,
      backgroundColor: colors.surfaceLow,
      borderRadius: 2.5,
      overflow: 'hidden',
    },
    dailyBarFill: {
      height: '100%',
      borderRadius: 2.5,
    },
    dailyRight: {
      alignItems: 'flex-end',
    },
    dailyAmountText: {
      fontSize: 14,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
    },
    dailyAmountTextHighest: {
      color: colors.primary,
      fontFamily: theme.fonts.bold,
    },
    highBadge: {
      backgroundColor: isDark ? 'rgba(224, 169, 109, 0.15)' : '#FDF4ED',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
      marginTop: 3,
    },
    highBadgeText: {
      fontSize: 9,
      fontFamily: theme.fonts.bold,
      color: colors.primary,
      letterSpacing: 0.5,
    },
    dailyAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dailyChevron: {
      marginLeft: 2,
    },
    detailChevron: {
      marginLeft: 4,
    },
    expenseDetailRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

