import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useAccountStore } from '../store/accountStore';
import { useCategoryStore } from '../store/categoryStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { ExpenseItem } from '../components/ExpenseItem';
import { formatDateDisplay } from '../utils/dateUtils';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
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

interface DateGroup {
  date: string;
  total: number;
  expenses: Expense[];
}

export const MonthlyScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    monthlyExpenses,
    currentMonthlyKey,
    newEntryVersion,
    monthlySyncedEntryVersion,
    reminderExpenses,
    isLoading,
    fetchMonthlyExpenses,
    fetchReminderExpenses,
  } = useExpenseStore();

  const { accounts, fetchAccounts } = useAccountStore();
  const { categories, fetchCategories } = useCategoryStore();
  const {
    currentBudget: budgetCap,
    isCustomBudget,
    isSaving: isSavingBudget,
    loadBudgetForMonth,
    setBudgetForMonth,
  } = useBudgetStore();
  const { user } = useAuthStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  // Budget modal state
  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [tempBudgetInput, setTempBudgetInput] = useState(String(budgetCap));

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'category' | 'account'>('category');
  const [tempCategory, setTempCategory] = useState<string | null>(null);
  const [tempAccount, setTempAccount] = useState<string | null>(null);

  // Load monthly budget for the selected month/year
  useEffect(() => {
    loadBudgetForMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadBudgetForMonth]);

  const handleOpenBudgetModal = () => {
    setTempBudgetInput(String(budgetCap));
    setIsBudgetModalVisible(true);
  };

  const saveBudgetCap = async () => {
    const parsed = Number(tempBudgetInput);
    if (!isNaN(parsed) && parsed > 0) {
      try {
        await setBudgetForMonth(selectedYear, selectedMonth, parsed);
        setIsBudgetModalVisible(false);
      } catch (err) {
        console.warn('Failed to save monthly budget:', err);
      }
    }
  };

  // Build a lookup map: account_id -> account_name
  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach(a => {
      map[a.id] = a.name;
    });
    return map;
  }, [accounts]);

  // Fetch data on mount
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchReminderExpenses();
  }, [fetchAccounts, fetchCategories, fetchReminderExpenses]);

  // Fetch once for the selected month, and refetch only if a new entry was added since the last monthly sync.
  useFocusEffect(
    useCallback(() => {
      const monthKey = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        '0',
      )}`;
      const shouldFetch =
        currentMonthlyKey !== monthKey ||
        monthlySyncedEntryVersion !== newEntryVersion;

      if (shouldFetch) {
        fetchMonthlyExpenses(selectedYear, selectedMonth);
      }
      loadBudgetForMonth(selectedYear, selectedMonth);
    }, [
      currentMonthlyKey,
      fetchMonthlyExpenses,
      loadBudgetForMonth,
      monthlySyncedEntryVersion,
      newEntryVersion,
      selectedMonth,
      selectedYear,
    ]),
  );

  // Filtered expenses based on category and account
  const filteredExpenses = useMemo(() => {
    return monthlyExpenses.filter(expense => {
      const categoryMatch = selectedCategory
        ? (expense.category || '').toLowerCase() === selectedCategory.toLowerCase()
        : true;
      const accountMatch = selectedAccount
        ? expense.account_id === selectedAccount
        : true;
      return categoryMatch && accountMatch;
    });
  }, [monthlyExpenses, selectedCategory, selectedAccount]);

  // Total spent this month
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [filteredExpenses]);

  // Calculate Daily Average & Projected Run-Rate
  const { dailyAverage, projectedRunRate } = useMemo(() => {
    const dInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      selectedYear === today.getFullYear() &&
      selectedMonth === today.getMonth() + 1;

    const dPassed = isCurrentMonth
      ? Math.max(1, today.getDate())
      : dInMonth;

    const avg = Math.round(totalSpent / dPassed);
    const runRate = Math.round(avg * dInMonth);

    return {
      dailyAverage: avg,
      projectedRunRate: runRate,
    };
  }, [selectedYear, selectedMonth, totalSpent]);

  // Group filtered expenses by date
  const dateGroups = useMemo<DateGroup[]>(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(expense => {
      const d = expense.spent_on;
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(expense);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(date => {
      const expenses = groups[date];
      const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        date,
        total,
        expenses,
      };
    });
  }, [filteredExpenses]);

  // Budget calculations
  const utilizationPercent = budgetCap > 0 ? (totalSpent / budgetCap) * 100 : 0;
  const remainingBudget = budgetCap - totalSpent;
  const isOnTrack = totalSpent <= budgetCap;

  const selectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex + 1);
    setSelectedYear(pickerYear);
    setIsPickerVisible(false);
  };

  const resetToCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
    setPickerYear(today.getFullYear());
    setIsPickerVisible(false);
  };

  const openFilterModal = () => {
    setTempCategory(selectedCategory);
    setTempAccount(selectedAccount);
    setActiveFilterTab('category');
    setIsFilterModalOpen(true);
  };

  const applyFilters = () => {
    setSelectedCategory(tempCategory);
    setSelectedAccount(tempAccount);
    setIsFilterModalOpen(false);
  };

  // Distinct category chips for horizontal filter row
  const categoryChips = useMemo(() => {
    const chipSet = new Set<string>();
    categories.forEach(c => chipSet.add(c.name));
    // Also include default common categories if none present
    if (chipSet.size === 0) {
      chipSet.add('Food');
      chipSet.add('Shopping');
      chipSet.add('Transport');
      chipSet.add('Bills');
    }
    return Array.from(chipSet);
  }, [categories]);

  // User avatar display
  const userAvatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.name || user?.email || 'U';
  const userInitial = userName.charAt(0).toUpperCase();

  const hasReminders = reminderExpenses.length > 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header Row */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          {/* Avatar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settings' as any)}
            style={styles.avatarWrapper}
          >
            {userAvatarUrl ? (
              <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Month/Year selector dropdown pill */}
          <TouchableOpacity
            style={styles.monthPill}
            activeOpacity={0.7}
            onPress={() => {
              setPickerYear(selectedYear);
              setIsPickerVisible(true);
            }}
          >
            <Text style={styles.monthPillText}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </Text>
            <Icon name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.topHeaderRight}>
          {/* Filter Tune Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={openFilterModal}
          >
            <Icon
              name="tune-variant"
              size={22}
              color={selectedCategory || selectedAccount ? '#18181B' : '#4B5563'}
            />
            {(selectedCategory || selectedAccount) && (
              <View style={styles.activeFilterDot} />
            )}
          </TouchableOpacity>

          {/* Notification Bell Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Reminders')}
          >
            <Icon name="bell-outline" size={22} color="#4B5563" />
            {hasReminders && <View style={styles.bellBadgeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List with Header */}
      <FlatList
        data={dateGroups}
        keyExtractor={item => item.date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
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
                activeOpacity={0.8}
                onPress={handleOpenBudgetModal}
                style={styles.amountRow}
              >
                <Text style={styles.mainAmountText}>
                  ₹{totalSpent.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.capAmountText}>
                  {' '}
                  / ₹{budgetCap.toLocaleString('en-IN')}
                </Text>
                <View style={styles.budgetEditPill}>
                  <Icon name="pencil-outline" size={13} color="#4B5563" />
                  <Text style={styles.budgetEditPillText}>Edit</Text>
                </View>
              </TouchableOpacity>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, utilizationPercent))}%`,
                      backgroundColor: isOnTrack ? '#18181B' : '#DC2626',
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
                    { color: remainingBudget >= 0 ? '#15803D' : '#DC2626' },
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

            {/* Horizontal Category Chips Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              {/* All Chip */}
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === null
                    ? styles.categoryChipActive
                    : styles.categoryChipInactive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === null
                      ? styles.categoryChipTextActive
                      : styles.categoryChipTextInactive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Categories */}
              {categoryChips.map(cat => {
                const isActive =
                  selectedCategory?.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isActive
                        ? styles.categoryChipActive
                        : styles.categoryChipInactive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (isActive) {
                        setSelectedCategory(null);
                      } else {
                        setSelectedCategory(cat);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isActive
                          ? styles.categoryChipTextActive
                          : styles.categoryChipTextInactive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={styles.dateGroupContainer}>
            {/* Date Header */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>
                {formatDateDisplay(group.date)}
              </Text>
              <Text style={styles.dayHeaderAmount}>
                ₹{group.total.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Date Card enclosing items */}
            <View style={styles.dateCard}>
              {group.expenses.map((expense, idx) => (
                <View key={expense.id}>
                  {idx > 0 && <View style={styles.itemDivider} />}
                  <ExpenseItem
                    id={expense.id}
                    amount={expense.amount}
                    category={expense.category}
                    note={expense.note}
                    accountId={expense.account_id ?? undefined}
                    accountName={
                      expense.account_id
                        ? accountMap[expense.account_id]
                        : undefined
                    }
                    isReminder={expense.is_reminder}
                    createdAt={expense.created_at}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color="#18181B"
              style={styles.loader}
            />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No expenses found</Text>
              <Text style={styles.emptySubText}>
                {selectedCategory
                  ? `No expenses in "${selectedCategory}" category.`
                  : 'Try selecting a different month.'}
              </Text>
            </View>
          )
        }
      />

      {/* Month/Year Picker Modal */}
      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setPickerYear(y => y - 1)}
                style={styles.pickerIconBtn}
              >
                <Icon name="chevron-left" size={28} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => setPickerYear(y => y + 1)}
                style={styles.pickerIconBtn}
              >
                <Icon name="chevron-right" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {MONTHS.map((month, index) => {
                const isSelected =
                  selectedMonth === index + 1 && selectedYear === pickerYear;
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthChip,
                      isSelected && styles.monthChipSelected,
                    ]}
                    onPress={() => selectMonth(index)}
                  >
                    <Text
                      style={[
                        styles.monthChipText,
                        isSelected && styles.monthChipTextSelected,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetToCurrentMonth}
              activeOpacity={0.7}
            >
              <Icon name="calendar-today" size={18} color="#18181B" />
              <Text style={styles.resetBtnText}>Jump to Current Month</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Category / Account Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View
          style={[
            styles.fullScreenFilterContainer,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
        >
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filters</Text>
            <TouchableOpacity
              onPress={() => setIsFilterModalOpen(false)}
              style={styles.filterCloseBtn}
            >
              <Icon name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterModalBody}>
            {/* Left Tabs */}
            <View style={styles.filterTabsCol}>
              <TouchableOpacity
                style={[
                  styles.filterTabBtn,
                  activeFilterTab === 'category' && styles.filterTabBtnActive,
                ]}
                onPress={() => setActiveFilterTab('category')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilterTab === 'category' && styles.filterTabTextActive,
                  ]}
                >
                  Category
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTabBtn,
                  activeFilterTab === 'account' && styles.filterTabBtnActive,
                ]}
                onPress={() => setActiveFilterTab('account')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilterTab === 'account' && styles.filterTabTextActive,
                  ]}
                >
                  Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Right Options */}
            <View style={styles.filterOptionsCol}>
              <ScrollView contentContainerStyle={styles.filterOptionsList}>
                <TouchableOpacity
                  style={styles.filterOptionItem}
                  onPress={() => {
                    if (activeFilterTab === 'category') setTempCategory(null);
                    if (activeFilterTab === 'account') setTempAccount(null);
                  }}
                >
                  <Icon
                    name={
                      (activeFilterTab === 'category'
                        ? !tempCategory
                        : !tempAccount)
                        ? 'radiobox-marked'
                        : 'radiobox-blank'
                    }
                    size={22}
                    color={
                      (activeFilterTab === 'category'
                        ? !tempCategory
                        : !tempAccount)
                        ? '#18181B'
                        : '#9CA3AF'
                    }
                  />
                  <Text style={styles.filterOptionItemText}>
                    All{' '}
                    {activeFilterTab === 'category' ? 'Categories' : 'Accounts'}
                  </Text>
                </TouchableOpacity>

                {activeFilterTab === 'category' &&
                  categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.filterOptionItem}
                      onPress={() => setTempCategory(cat.name)}
                    >
                      <Icon
                        name={
                          tempCategory === cat.name
                            ? 'radiobox-marked'
                            : 'radiobox-blank'
                        }
                        size={22}
                        color={
                          tempCategory === cat.name ? '#18181B' : '#9CA3AF'
                        }
                      />
                      <Text style={styles.filterOptionItemText}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                {activeFilterTab === 'account' &&
                  accounts.map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      style={styles.filterOptionItem}
                      onPress={() => setTempAccount(acc.id)}
                    >
                      <Icon
                        name={
                          tempAccount === acc.id
                            ? 'radiobox-marked'
                            : 'radiobox-blank'
                        }
                        size={22}
                        color={tempAccount === acc.id ? '#18181B' : '#9CA3AF'}
                      />
                      <Text style={styles.filterOptionItemText}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>

          <View
            style={[
              styles.filterModalFooter,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <TouchableOpacity
              style={styles.filterCancelBtn}
              onPress={() => setIsFilterModalOpen(false)}
            >
              <Text style={styles.filterCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyBtn}
              onPress={applyFilters}
            >
              <Text style={styles.filterApplyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Budget Cap Customization Modal */}
      <Modal
        visible={isBudgetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBudgetModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsBudgetModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.budgetModalCard}>
            <View style={styles.budgetModalHeaderRow}>
              <View style={styles.budgetModalHeaderTexts}>
                <Text style={styles.budgetModalTitle}>Monthly Budget</Text>
                <Text style={styles.budgetModalSub}>
                  {MONTHS[selectedMonth - 1]} {selectedYear} spending target
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBudgetModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.budgetModalCloseBtn}
              >
                <Icon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Carry-forward info banner */}
            <View
              style={[
                styles.budgetBadgeRow,
                isCustomBudget
                  ? styles.budgetBadgeRowCustom
                  : styles.budgetBadgeRowCarried,
              ]}
            >
              <Icon
                name={isCustomBudget ? 'check-circle-outline' : 'repeat'}
                size={16}
                color={isCustomBudget ? '#15803D' : '#4B5563'}
              />
              <Text
                style={[
                  styles.budgetBadgeText,
                  isCustomBudget
                    ? styles.budgetBadgeTextCustom
                    : styles.budgetBadgeTextCarried,
                ]}
              >
                {isCustomBudget
                  ? `Custom budget set for ${MONTHS[selectedMonth - 1]} ${selectedYear}`
                  : `Carried forward from previous month. Customizing will apply from this month onward.`}
              </Text>
            </View>

            <View style={styles.budgetInputContainer}>
              <Text style={styles.budgetInputCurrency}>₹</Text>
              <TextInput
                style={styles.budgetInput}
                keyboardType="numeric"
                value={tempBudgetInput}
                onChangeText={setTempBudgetInput}
                placeholder="20000"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            {/* Quick Presets */}
            <View style={styles.budgetPresetsRow}>
              {[15000, 20000, 25000, 30000, 50000].map(val => {
                const isSelected = tempBudgetInput === String(val);
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.budgetPresetChip,
                      isSelected && styles.budgetPresetChipActive,
                    ]}
                    onPress={() => setTempBudgetInput(String(val))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.budgetPresetText,
                        isSelected && styles.budgetPresetTextActive,
                      ]}
                    >
                      ₹{(val / 1000).toFixed(0)}k
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.budgetModalActions}>
              <TouchableOpacity
                style={styles.budgetCancelBtn}
                onPress={() => setIsBudgetModalVisible(false)}
                disabled={isSavingBudget}
              >
                <Text style={styles.budgetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.budgetSaveBtn}
                onPress={saveBudgetCap}
                disabled={isSavingBudget}
                activeOpacity={0.8}
              >
                {isSavingBudget ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.budgetSaveText}>
                    Save for {MONTHS[selectedMonth - 1]}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Top Header Row
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
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 4,
  },
  monthPillText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#18181B',
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

  // Main List
  listContent: {
    paddingBottom: 40,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F1F3',
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
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: '#374151',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeOnTrack: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeOver: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  statusBadgeTextOnTrack: {
    color: '#15803D',
  },
  statusBadgeTextOver: {
    color: '#DC2626',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  mainAmountText: {
    fontSize: 32,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  capAmountText: {
    fontSize: 20,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
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
    color: '#4B5563',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 12,
  },
  statBoxLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
    marginBottom: 4,
  },
  statBoxValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statBoxValue: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  statBoxSub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },

  // Category Chips
  categoryChipsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: '#18181B',
  },
  categoryChipInactive: {
    backgroundColor: '#F3F4F6',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  categoryChipTextInactive: {
    color: '#374151',
  },

  // Date Groups
  dateGroupContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  dayHeaderText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },
  dayHeaderAmount: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  // Empty State & Loader
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Month Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  pickerIconBtn: {
    padding: 4,
  },
  pickerYearText: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  monthChip: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  monthChipSelected: {
    backgroundColor: '#18181B',
  },
  monthChipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  monthChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
    gap: 8,
  },
  resetBtnText: {
    fontSize: 14,
    color: '#18181B',
    fontFamily: theme.fonts.medium,
  },

  // Filter Modal
  fullScreenFilterContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterModalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  filterCloseBtn: {
    padding: 4,
  },
  filterModalBody: {
    flex: 1,
    flexDirection: 'row',
  },
  filterTabsCol: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  filterTabBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  filterTabBtnActive: {
    borderLeftColor: '#18181B',
    backgroundColor: '#FFFFFF',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#18181B',
    fontFamily: theme.fonts.semiBold,
  },
  filterOptionsCol: {
    width: '65%',
  },
  filterOptionsList: {
    padding: 16,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  filterOptionItemText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#1F2937',
  },
  filterModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'flex-end',
    gap: 12,
  },
  filterCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  filterCancelBtnText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
  },
  filterApplyBtn: {
    backgroundColor: '#18181B',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  filterApplyBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: theme.fonts.semiBold,
  },

  // Budget Modal
  budgetEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
    gap: 4,
  },
  budgetEditPillText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  budgetModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#F0F1F3',
  },
  budgetModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetModalHeaderTexts: {
    flex: 1,
  },
  budgetModalCloseBtn: {
    padding: 4,
  },
  budgetModalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginBottom: 2,
  },
  budgetModalSub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },
  budgetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  budgetBadgeRowCustom: {
    backgroundColor: '#ECFDF5',
  },
  budgetBadgeRowCarried: {
    backgroundColor: '#F3F4F6',
  },
  budgetBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    flex: 1,
    lineHeight: 16,
  },
  budgetBadgeTextCustom: {
    color: '#15803D',
  },
  budgetBadgeTextCarried: {
    color: '#4B5563',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
  },
  budgetInputCurrency: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    padding: 0,
  },
  budgetPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  budgetPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  budgetPresetChipActive: {
    backgroundColor: '#18181B',
    borderColor: '#18181B',
  },
  budgetPresetText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  budgetPresetTextActive: {
    color: '#FFFFFF',
  },
  budgetModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  budgetCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  budgetCancelText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
  },
  budgetSaveBtn: {
    backgroundColor: '#18181B',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  budgetSaveText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
});
