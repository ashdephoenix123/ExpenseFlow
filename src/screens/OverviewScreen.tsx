import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useAccountStore } from '../store/accountStore';
import { useCategoryStore } from '../store/categoryStore';
import { useBudgetStore } from '../store/budgetStore';
import { useAuthStore } from '../store/authStore';
import { ExpenseItem } from '../components/ExpenseItem';
import { AnalyticsView } from '../components/AnalyticsView';
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

export interface OverviewScreenProps {
  initialTab?: 'timeline' | 'analytics';
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  initialTab = 'timeline',
}) => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Active top tab state: Timeline is selected by default, beside it Analytics
  const [activeTab, setActiveTab] = useState<'timeline' | 'analytics'>(initialTab);

  const flatListRef = useRef<FlatList<DateGroup>>(null);
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

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

  // Shared Month & Year state for both Timeline & Analytics
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

  // Fetch accounts, categories, reminders on mount
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

  // Group filtered expenses by date for Timeline
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

  const selectMonth = (monthIndex: number) => {
    const newMonth = monthIndex + 1;
    setSelectedMonth(newMonth);
    setSelectedYear(pickerYear);
    setIsPickerVisible(false);
    // Fetch data for the newly selected month & year immediately
    fetchMonthlyExpenses(pickerYear, newMonth);
    loadBudgetForMonth(pickerYear, newMonth);
  };

  const resetToCurrentMonth = () => {
    const today = new Date();
    const curMonth = today.getMonth() + 1;
    const curYear = today.getFullYear();
    setSelectedMonth(curMonth);
    setSelectedYear(curYear);
    setPickerYear(curYear);
    setIsPickerVisible(false);
    fetchMonthlyExpenses(curYear, curMonth);
    loadBudgetForMonth(curYear, curMonth);
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

  // Scroll to selected date when tapped from Analytics
  const handleSelectDate = useCallback(
    (date: string) => {
      setActiveTab('timeline');
      setHighlightedDate(date);

      const targetIndex = dateGroups.findIndex(g => g.date === date);
      if (targetIndex !== -1) {
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index: targetIndex,
              animated: true,
              viewPosition: 0.15,
            });
          } catch {
            flatListRef.current?.scrollToOffset({
              offset: Math.max(0, targetIndex * 120 + 50),
              animated: true,
            });
          }
        }, 100);
      }

      // Auto-clear highlight after 2.5 seconds
      setTimeout(() => {
        setHighlightedDate(null);
      }, 2500);
    },
    [dateGroups],
  );

  // Distinct category chips for horizontal filter row
  const categoryChips = useMemo(() => {
    const chipSet = new Set<string>();
    categories.forEach(c => chipSet.add(c.name));
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
      {/* Top Header Row (Timeline Screen Header) */}
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
            <Icon name="chevron-down" size={18} color={colors.textSecondary} />
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
              color={selectedCategory || selectedAccount ? colors.primary : colors.textSecondary}
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
            <Icon name="bell-outline" size={22} color={colors.textSecondary} />
            {hasReminders && <View style={styles.bellBadgeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Tab Switcher underneath Header: [ Timeline ] [ Analytics ] */}
      <View style={styles.tabSwitcherContainer}>
        <View style={styles.tabSwitcherTrack}>
          <TouchableOpacity
            style={[
              styles.tabSwitchButton,
              activeTab === 'timeline' && styles.tabSwitchButtonActive,
            ]}
            onPress={() => setActiveTab('timeline')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'timeline' ? 'calendar-month' : 'calendar-month-outline'}
              size={18}
              color={activeTab === 'timeline' ? colors.textPrimary : colors.textMuted}
              style={styles.tabSwitchIcon}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === 'timeline' && styles.tabSwitchTextActive,
              ]}
            >
              Timeline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSwitchButton,
              activeTab === 'analytics' && styles.tabSwitchButtonActive,
            ]}
            onPress={() => setActiveTab('analytics')}
            activeOpacity={0.8}
          >
            <Icon
              name={activeTab === 'analytics' ? 'chart-box' : 'chart-box-outline'}
              size={18}
              color={activeTab === 'analytics' ? colors.textPrimary : colors.textMuted}
              style={styles.tabSwitchIcon}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === 'analytics' && styles.tabSwitchTextActive,
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area: Timeline View & Analytics View */}
      <View
        style={[
          styles.tabContentWrapper,
          activeTab !== 'timeline' && styles.tabContentHidden,
        ]}
      >
        <FlatList<DateGroup>
          ref={flatListRef}
          data={dateGroups}
          keyExtractor={item => item.date}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={info => {
            flatListRef.current?.scrollToOffset({
              offset: Math.max(
                0,
                info.highestMeasuredFrameIndex > 0
                  ? info.averageItemLength * info.index
                  : info.index * 120 + 350,
              ),
              animated: true,
            });
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.15,
                });
              }
            }, 100);
          }}
          ListHeaderComponent={
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
          }
          renderItem={({ item: group }: { item: DateGroup }) => {
            const isHighlighted = highlightedDate === group.date;
            return (
              <View
                style={[
                  styles.dateGroupContainer,
                  isHighlighted && styles.dateGroupHighlighted,
                ]}
              >
                {/* Date Header */}
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderTitleGroup}>
                    {isHighlighted && (
                      <View style={styles.highlightBadge}>
                        <Icon name="arrow-right" size={13} color={isDark ? colors.canvasBase : '#FFFFFF'} />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.dayHeaderText,
                        isHighlighted && styles.dayHeaderTextHighlighted,
                      ]}
                    >
                      {formatDateDisplay(group.date)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dayHeaderAmount,
                      isHighlighted && styles.dayHeaderAmountHighlighted,
                    ]}
                  >
                    ₹{group.total.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Date Card enclosing items */}
                <View
                  style={[
                    styles.dateCard,
                    isHighlighted && styles.dateCardHighlighted,
                  ]}
                >
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
            );
          }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={styles.loader}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="receipt" size={48} color={colors.textMuted} />
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
      </View>

      <View
        style={[
          styles.tabContentWrapper,
          activeTab !== 'analytics' && styles.tabContentHidden,
        ]}
      >
        <AnalyticsView
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          expenses={filteredExpenses}
          budgetCap={budgetCap}
          navigation={navigation}
          onSelectDate={handleSelectDate}
          onEditBudget={handleOpenBudgetModal}
        />
      </View>

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
                <Icon name="chevron-left" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => setPickerYear(y => y + 1)}
                style={styles.pickerIconBtn}
              >
                <Icon name="chevron-right" size={28} color={colors.textPrimary} />
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
              <Icon name="calendar-today" size={18} color={colors.primary} />
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
              <Icon name="close" size={22} color={colors.textPrimary} />
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
                        ? colors.primary
                        : colors.textMuted
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
                          tempCategory === cat.name ? colors.primary : colors.textMuted
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
                        color={tempAccount === acc.id ? colors.primary : colors.textMuted}
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
                <Icon name="close" size={20} color={colors.textSecondary} />
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
                color={isCustomBudget ? colors.secondary : colors.textSecondary}
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
                placeholderTextColor={colors.textMuted}
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
                  <ActivityIndicator size="small" color={isDark ? colors.canvasBase : '#FFFFFF'} />
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

export const MonthlyScreen = OverviewScreen;

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.canvasBase,
    },
    // Top Header Row
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.canvasBase,
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
      backgroundColor: colors.surfaceLow,
      borderWidth: 1.5,
      borderColor: colors.borderHairline,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.primary,
    },
    monthPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    monthPillText: {
      fontSize: 15,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
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
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    activeFilterDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    bellBadgeDot: {
      position: 'absolute',
      top: 6,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
    },

    // Sub-header Tab Switcher
    tabSwitcherContainer: {
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 8,
      backgroundColor: colors.canvasBase,
    },
    tabSwitcherTrack: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLow,
      borderRadius: 14,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    tabSwitchButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 11,
    },
    tabSwitchButtonActive: {
      backgroundColor: colors.surfaceElevated,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    tabSwitchIcon: {
      marginRight: 6,
    },
    tabSwitchText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
    },
    tabSwitchTextActive: {
      color: colors.textPrimary,
      fontFamily: theme.fonts.semiBold,
    },

    // Main List
    listContent: {
      paddingBottom: 40,
    },

    // Category Chips
    categoryChipsScroll: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    categoryChipActive: {
      backgroundColor: isDark ? colors.primary : '#18181B',
    },
    categoryChipInactive: {
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    categoryChipText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
    },
    categoryChipTextActive: {
      color: isDark ? colors.canvasBase : '#FFFFFF',
      fontFamily: theme.fonts.semiBold,
    },
    categoryChipTextInactive: {
      color: colors.textSecondary,
    },

    // Tab Content Visibility Wrappers
    tabContentWrapper: {
      flex: 1,
    },
    tabContentHidden: {
      display: 'none',
    },

    // Date Groups
    dateGroupContainer: {
      marginHorizontal: 16,
      marginBottom: 14,
    },
    dateGroupHighlighted: {
      // slightly emphasized
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 2,
    },
    dayHeaderTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    highlightBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayHeaderText: {
      fontSize: 14,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.semiBold,
      color: colors.textSecondary,
      letterSpacing: isDark ? 0.4 : 0,
    },
    dayHeaderTextHighlighted: {
      color: colors.primary,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
    },
    dayHeaderAmount: {
      fontSize: 14,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
    },
    dayHeaderAmountHighlighted: {
      color: colors.primary,
      fontFamily: theme.fonts.bold,
    },
    dateCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    dateCardHighlighted: {
      borderColor: colors.primary,
      borderWidth: 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    itemDivider: {
      height: 1,
      backgroundColor: colors.borderHairline,
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
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.semiBold,
      color: colors.textPrimary,
      marginTop: 12,
      marginBottom: 4,
    },
    emptySubText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      textAlign: 'center',
    },

    // Month Picker Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    pickerContainer: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 340,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
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
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
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
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    monthChipSelected: {
      backgroundColor: isDark ? colors.primary : '#18181B',
      borderColor: colors.primary,
    },
    monthChipText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    monthChipTextSelected: {
      color: isDark ? colors.canvasBase : '#FFFFFF',
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
      color: colors.primary,
      fontFamily: theme.fonts.medium,
    },

    // Filter Modal
    fullScreenFilterContainer: {
      flex: 1,
      backgroundColor: colors.canvasBase,
    },
    filterModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderHairline,
    },
    filterModalTitle: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
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
      borderRightColor: colors.borderHairline,
      backgroundColor: colors.surfaceLow,
    },
    filterTabBtn: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    filterTabBtnActive: {
      borderLeftColor: colors.primary,
      backgroundColor: colors.surfaceContainer,
    },
    filterTabText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },
    filterTabTextActive: {
      color: colors.textPrimary,
      fontFamily: theme.fonts.semiBold,
    },
    filterOptionsCol: {
      width: '65%',
      backgroundColor: colors.canvasBase,
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
      color: colors.textPrimary,
    },
    filterModalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderHairline,
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
      color: colors.textSecondary,
    },
    filterApplyBtn: {
      backgroundColor: isDark ? colors.primary : '#18181B',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 10,
    },
    filterApplyBtnText: {
      fontSize: 14,
      color: isDark ? colors.canvasBase : '#FFFFFF',
      fontFamily: theme.fonts.semiBold,
    },

    // Budget Modal
    budgetModalCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 20,
      padding: 22,
      width: '100%',
      maxWidth: 340,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
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
    budgetModalTitle: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
    },
    budgetModalSub: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    budgetModalCloseBtn: {
      padding: 4,
      marginLeft: 8,
    },
    budgetBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 16,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    budgetBadgeRowCustom: {
      backgroundColor: isDark ? 'rgba(143, 163, 130, 0.15)' : '#F0FDF4',
    },
    budgetBadgeRowCarried: {
      backgroundColor: colors.surfaceLow,
    },
    budgetBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      flex: 1,
    },
    budgetBadgeTextCustom: {
      color: colors.secondary,
    },
    budgetBadgeTextCarried: {
      color: colors.textSecondary,
    },
    budgetInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.borderHairline,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
      backgroundColor: colors.surfaceLow,
    },
    budgetInputCurrency: {
      fontSize: 22,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      marginRight: 6,
    },
    budgetInput: {
      flex: 1,
      fontSize: 22,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      padding: 0,
    },
    budgetPresetsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      gap: 6,
    },
    budgetPresetChip: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.borderHairline,
    },
    budgetPresetChipActive: {
      backgroundColor: isDark ? colors.primary : '#18181B',
      borderColor: colors.primary,
    },
    budgetPresetText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    budgetPresetTextActive: {
      color: isDark ? colors.canvasBase : '#FFFFFF',
      fontFamily: theme.fonts.semiBold,
    },
    budgetModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    budgetCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    budgetCancelText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    budgetSaveBtn: {
      backgroundColor: isDark ? colors.primary : '#18181B',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      minWidth: 140,
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetSaveText: {
      fontSize: 14,
      fontFamily: theme.fonts.semiBold,
      color: isDark ? colors.canvasBase : '#FFFFFF',
    },
  });

