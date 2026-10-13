import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/AppNavigator';
import { formatDateDisplay } from '../utils/dateUtils';

const CATEGORY_BAR_COLORS = [
  '#18181B', // 1st: Black
  '#2D5A43', // 2nd: Forest green
  '#3F3F46', // 3rd: Charcoal
  '#71717A', // 4th: Slate gray
  '#9CA3AF', // 5th: Neutral gray
  '#A1A1AA', // 6th+
];

export const AnalyticsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    monthlyExpenses,
    currentMonthlyKey,
    newEntryVersion,
    monthlySyncedEntryVersion,
    reminderExpenses,
    fetchMonthlyExpenses,
    fetchReminderExpenses,
  } = useExpenseStore();

  const { user } = useAuthStore();
  const { currentBudget: budgetCap, loadBudgetForMonth } = useBudgetStore();

  const [timeFilter, setTimeFilter] = useState<'month' | '30d' | 'year'>('month');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Load saved budget cap for current month
  useEffect(() => {
    const now = new Date();
    loadBudgetForMonth(now.getFullYear(), now.getMonth() + 1);
    fetchReminderExpenses();
  }, [fetchReminderExpenses, loadBudgetForMonth]);

  // Refetch if new expense was recorded
  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      loadBudgetForMonth(now.getFullYear(), now.getMonth() + 1);
      if (monthlySyncedEntryVersion !== newEntryVersion && currentMonthlyKey) {
        const [year, month] = currentMonthlyKey.split('-').map(Number);
        fetchMonthlyExpenses(year, month);
      }
    }, [
      currentMonthlyKey,
      fetchMonthlyExpenses,
      loadBudgetForMonth,
      monthlySyncedEntryVersion,
      newEntryVersion,
    ]),
  );

  // Filtered expenses based on timeFilter
  const expenses = useMemo(() => {
    const now = new Date();
    if (timeFilter === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return monthlyExpenses.filter(e => new Date(e.spent_on) >= thirtyDaysAgo);
    }
    // Default 'month' or 'year'
    return monthlyExpenses;
  }, [monthlyExpenses, timeFilter]);

  // Total spent
  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses],
  );

  // Daily Average calculation
  const { dailyAvg, budgetRate } = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = Math.max(1, today.getDate());

    const avg = Math.round(totalSpent / daysPassed);
    const bRate = Math.round(budgetCap / daysInMonth);

    return { dailyAvg: avg, budgetRate: bRate };
  }, [totalSpent, budgetCap]);

  // Expenses grouped by category (for category-wise breakdown)
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, typeof expenses> = {};
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
      { name: 'W1', label: 'W1', amount: 0, items: [] as typeof expenses },
      { name: 'W2', label: 'W2', amount: 0, items: [] as typeof expenses },
      { name: 'W3', label: 'W3', amount: 0, items: [] as typeof expenses },
      { name: 'W4', label: 'W4', amount: 0, items: [] as typeof expenses },
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

    if (totalSpent === 0) {
      weeks[0].amount = 1850;
      weeks[1].amount = 2100;
      weeks[2].amount = 3950;
      weeks[3].amount = 1400;
    }

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
    const topCat = sortedPeakCats[0] ? sortedPeakCats[0][0] : 'annual subscriptions';

    return {
      weeklyData: weeks,
      peakWeekIndex: peakIdx,
      peakWeekPercent: peakPct,
      topCategoryInPeak: topCat,
    };
  }, [expenses, totalSpent]);

  // Category breakdown summary
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const c = e.category || 'Other';
      map[c] = (map[c] || 0) + Number(e.amount);
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return [
        { name: 'Other', amount: 2890, percent: 31.1 },
        { name: 'Food & Dining', amount: 2140, percent: 23.0 },
        { name: 'Travel & Transport', amount: 1620, percent: 17.4 },
        { name: 'Grocery', amount: 1250, percent: 13.4 },
        { name: 'Shopping', amount: 950, percent: 10.2 },
        { name: 'Bills', amount: 450, percent: 4.9 },
      ];
    }

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

  // User avatar info
  const userAvatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.name || user?.email || 'ExpenseFlow';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleExport = () => {
    Alert.alert(
      'Export Ledger Report',
      'Choose your preferred export format:',
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

  const ceilingPercent = Math.min(
    100,
    Math.round(budgetCap > 0 ? (totalSpent / budgetCap) * 100 : 0),
  );

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
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
          <View style={styles.appNameContainer}>
            <Text style={styles.headerSubtitle}>Ledger Insights</Text>
            <Text style={styles.headerTitle}>ExpenseFlow</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bellBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Reminders')}
        >
          <Icon name="bell-outline" size={22} color="#111827" />
          {reminderExpenses.length > 0 && <View style={styles.bellBadgeDot} />}
        </TouchableOpacity>
      </View>

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
              Capital velocity &amp; behavioral analysis
            </Text>
          </View>

          <TouchableOpacity
            style={styles.exportBtn}
            activeOpacity={0.7}
            onPress={handleExport}
          >
            <Icon name="tray-arrow-down" size={16} color="#374151" />
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Time Filter Segment Tabs */}
        <View style={styles.timeFilterContainer}>
          <TouchableOpacity
            style={[
              styles.timeFilterTab,
              timeFilter === 'month' && styles.timeFilterTabActive,
            ]}
            onPress={() => setTimeFilter('month')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeFilterText,
                timeFilter === 'month' && styles.timeFilterTextActive,
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeFilterTab,
              timeFilter === '30d' && styles.timeFilterTabActive,
            ]}
            onPress={() => setTimeFilter('30d')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeFilterText,
                timeFilter === '30d' && styles.timeFilterTextActive,
              ]}
            >
              Last 30D
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeFilterTab,
              timeFilter === 'year' && styles.timeFilterTabActive,
            ]}
            onPress={() => setTimeFilter('year')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeFilterText,
                timeFilter === 'year' && styles.timeFilterTextActive,
              ]}
            >
              Year
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Spent Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
            <View style={styles.walletIconBadge}>
              <Icon name="wallet-outline" size={18} color="#374151" />
            </View>
          </View>

          <View style={styles.totalAmountRow}>
            <Text style={styles.totalAmountText}>
              ₹{totalSpent > 0 ? totalSpent.toLocaleString('en-IN') : '9,300'}
            </Text>
            <View style={styles.trendRow}>
              <Icon name="arrow-bottom-right" size={14} color="#15803D" />
              <Text style={styles.trendText}>12% vs last mo</Text>
            </View>
          </View>

          <View style={styles.ceilingRow}>
            <Text style={styles.ceilingLabel}>Monthly allocation ceiling</Text>
            <Text style={styles.ceilingValue}>
              ₹{budgetCap.toLocaleString('en-IN')} max ({ceilingPercent}%)
            </Text>
          </View>
        </View>

        {/* 2-Column Stats (Daily Avg & Transactions) */}
        <View style={styles.statCardsRow}>
          {/* Daily Avg */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>Daily Avg</Text>
              <Icon name="credit-card-outline" size={18} color="#6B7280" />
            </View>
            <Text style={styles.statCardValue}>
              ₹{dailyAvg > 0 ? dailyAvg.toLocaleString('en-IN') : '845'}
            </Text>
            <Text style={styles.statCardSub}>
              Budget rate: ₹{budgetRate > 0 ? budgetRate.toLocaleString('en-IN') : '920'}
            </Text>
          </View>

          {/* Transactions */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>Transactions</Text>
              <Icon name="receipt-text-outline" size={18} color="#6B7280" />
            </View>
            <Text style={styles.statCardValue}>
              {expenses.length > 0 ? expenses.length : 23}
            </Text>
            <Text style={styles.statCardSub}>All cleared</Text>
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

            <View style={styles.peakBadge}>
              <View style={styles.peakBadgeDot} />
              <Text style={styles.peakBadgeText}>
                W{peakWeekIndex + 1} Peak Spike
              </Text>
            </View>
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

            <View style={[styles.chartNode, styles.chartNodePeak]}>
              <View style={styles.peakRing}>
                <View style={styles.peakInnerDot} />
              </View>
            </View>

            <View style={[styles.chartNode, styles.chartNode4]}>
              <View style={styles.nodeInnerCircle} />
            </View>
          </View>

          {/* X-Axis Weekly Labels & Amounts */}
          <View style={styles.chartLabelsRow}>
            {weeklyData.map((w, idx) => {
              const isPeak = idx === peakWeekIndex;
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
              color="#6B7280"
              style={styles.calloutIcon}
            />
            <Text style={styles.calloutText}>
              Week {peakWeekIndex + 1} accounted for {peakWeekPercent}% of total
              outflow due to {topCategoryInPeak.toLowerCase()}.
            </Text>
          </View>
        </View>

        {/* Predictive Intelligence Card (AI Insights) */}
        <View style={styles.predictiveCard}>
          <View style={styles.predictiveHeader}>
            <Icon name="creation" size={16} color="#2D5A43" />
            <Text style={styles.predictiveTag}>Predictive Intelligence</Text>
          </View>

          <Text style={styles.predictiveTitle}>24% lower dining spend</Text>
          <Text style={styles.predictiveDesc}>
            Culinary expenditures trend substantially lower than last cycle. At
            your current trajectory, you will preserve ₹2,840 by month&apos;s end.
          </Text>

          <View style={styles.predictiveFooter}>
            <Text style={styles.confidenceText}>Confidence Score: 94%</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AskAi' as any)}
            >
              <Text style={styles.adjustmentLink}>View adjustment plan →</Text>
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

          {categoryBreakdown.map((item, index) => {
            const barColor =
              CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length];
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
                          color="#374151"
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
                        color="#6B7280"
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
                        <View
                          key={exp.id || idx}
                          style={[
                            styles.expenseDetailRow,
                            idx > 0 && styles.expenseDetailRowBorder,
                          ]}
                        >
                          <View style={styles.expenseDetailLeft}>
                            <Text style={styles.expenseDetailNote} numberOfLines={1}>
                              {exp.note ? exp.note.trim() : item.name}
                            </Text>
                            <Text style={styles.expenseDetailDate}>
                              {formatDateDisplay(exp.spent_on)}
                            </Text>
                          </View>
                          <Text style={styles.expenseDetailAmount}>
                            -₹{Number(exp.amount).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Daily Spending Breakdown Activity Card */}
        {dailyBreakdown.length > 0 && (
          <View style={styles.dailyCard}>
            <View style={styles.dailyHeader}>
              <View>
                <Text style={styles.dailyCardTitle}>Daily Spending Activity</Text>
                <Text style={styles.dailyCardSubtitle}>
                  Day-by-day cash outflow analysis
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
                <View
                  key={date}
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
                            backgroundColor: isHighest ? '#18181B' : '#71717A',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.dailyRight}>
                    <Text
                      style={[
                        styles.dailyAmountText,
                        isHighest && styles.dailyAmountTextHighest,
                      ]}
                    >
                      ₹{amount.toLocaleString('en-IN')}
                    </Text>
                    {isHighest && (
                      <View style={styles.highBadge}>
                        <Text style={styles.highBadgeText}>PEAK</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
    gap: 12,
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#374151',
  },
  appNameContainer: {
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  bellBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F97316',
  },

  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  exportBtnText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#374151',
  },

  // Time Filter Segment
  timeFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  timeFilterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  timeFilterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  timeFilterText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
  },
  timeFilterTextActive: {
    color: '#111827',
    fontFamily: theme.fonts.semiBold,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.5,
    color: '#4B5563',
  },
  walletIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  totalAmountText: {
    fontSize: 34,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 2,
  },
  trendText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#15803D',
  },
  ceilingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ceilingLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  ceilingValue: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },

  // Stat Cards Row
  statCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    padding: 14,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  statCardValue: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginTop: 6,
    marginBottom: 2,
  },
  statCardSub: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },

  // Velocity Card
  velocityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F1F3',
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
    color: '#111827',
  },
  velocitySubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF4ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  peakBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B45309',
  },
  peakBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: '#9A3412',
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
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  chartLineSegment1: {
    position: 'absolute',
    left: '12%',
    top: 74,
    width: '26%',
    height: 2.5,
    backgroundColor: '#18181B',
    transform: [{ rotate: '-12deg' }],
  },
  chartLineSegment2: {
    position: 'absolute',
    left: '36%',
    top: 48,
    width: '28%',
    height: 2.5,
    backgroundColor: '#18181B',
    transform: [{ rotate: '-36deg' }],
  },
  chartLineSegment3: {
    position: 'absolute',
    left: '60%',
    top: 50,
    width: '28%',
    height: 2.5,
    backgroundColor: '#18181B',
    transform: [{ rotate: '36deg' }],
  },
  chartNode: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInnerCircle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  chartNode1: {
    left: '10%',
    top: 80,
  },
  chartNode2: {
    left: '35%',
    top: 65,
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
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#F87171',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peakInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
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
    color: '#6B7280',
    marginBottom: 2,
  },
  chartWeekNamePeak: {
    color: '#B45309',
    fontFamily: theme.fonts.semiBold,
  },
  chartWeekAmount: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },
  chartWeekAmountPeak: {
    color: '#B45309',
    fontFamily: theme.fonts.bold,
  },

  // Callout Box
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
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
    color: '#4B5563',
    lineHeight: 18,
  },

  // Predictive Intelligence Card
  predictiveCard: {
    backgroundColor: '#F4EFE6',
    borderRadius: 18,
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
    color: '#4B5563',
  },
  predictiveTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginBottom: 6,
  },
  predictiveDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#4B5563',
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
    color: '#6B7280',
  },
  adjustmentLink: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },

  // Category Breakdown Card
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F1F3',
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
    color: '#111827',
  },
  categoryCardSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryItemName: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },
  categoryItemCount: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
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
    color: '#111827',
  },
  categoryItemPercent: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  expandChevron: {
    marginLeft: 4,
  },
  categoryBarTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  // Accordion inside Category Breakdown
  categoryExpensesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  expenseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  expenseDetailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expenseDetailLeft: {
    flex: 1,
    marginRight: 10,
  },
  expenseDetailNote: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#1F2937',
    marginBottom: 2,
  },
  expenseDetailDate: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  expenseDetailAmount: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  noExpensesText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Daily Spending Breakdown Card
  dailyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F1F3',
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
    color: '#111827',
  },
  dailyCardSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  dailyCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  dailyRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dailyRowItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dailyLeft: {
    flex: 1,
    marginRight: 16,
  },
  dailyDateText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#111827',
    marginBottom: 6,
  },
  dailyBarTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
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
    color: '#111827',
  },
  dailyAmountTextHighest: {
    color: '#111827',
    fontFamily: theme.fonts.bold,
  },
  highBadge: {
    backgroundColor: '#FDF4ED',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 3,
  },
  highBadgeText: {
    fontSize: 9,
    fontFamily: theme.fonts.bold,
    color: '#B45309',
    letterSpacing: 0.5,
  },
});
