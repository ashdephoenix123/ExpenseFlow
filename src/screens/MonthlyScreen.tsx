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
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useAccountStore } from '../store/accountStore';
import { useCategoryStore } from '../store/categoryStore';
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
  const {
    monthlyExpenses,
    currentMonthlyKey,
    newEntryVersion,
    monthlySyncedEntryVersion,
    isLoading,
    fetchMonthlyExpenses,
  } = useExpenseStore();

  const { accounts, fetchAccounts } = useAccountStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  // Build a lookup map: account_id -> account_name
  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach(a => { map[a.id] = a.name; });
    return map;
  }, [accounts]);

  const { categories, fetchCategories } = useCategoryStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'category' | 'account'>('category');
  const [tempCategory, setTempCategory] = useState<string | null>(null);
  const [tempAccount, setTempAccount] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, [fetchAccounts, fetchCategories]);

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
    }, [
      currentMonthlyKey,
      fetchMonthlyExpenses,
      monthlySyncedEntryVersion,
      newEntryVersion,
      selectedMonth,
      selectedYear,
    ]),
  );

  const filteredExpenses = useMemo(() => {
    return monthlyExpenses.filter(expense => {
      const categoryMatch = selectedCategory ? expense.category === selectedCategory : true;
      const accountMatch = selectedAccount ? expense.account_id === selectedAccount : true;
      return categoryMatch && accountMatch;
    });
  }, [monthlyExpenses, selectedCategory, selectedAccount]);

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [filteredExpenses]);

  const dayTotals = useMemo(() => {
    return filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      const date = expense.spent_on;
      acc[date] = (acc[date] ?? 0) + Number(expense.amount);
      return acc;
    }, {});
  }, [filteredExpenses]);

  const listItems = useMemo<MonthlyListItem[]>(() => {
    const items: MonthlyListItem[] = [];
    let currentDate = '';

    filteredExpenses.forEach(expense => {
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
  }, [filteredExpenses]);

  const selectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex + 1);
    setSelectedYear(pickerYear);
    setIsPickerVisible(false);
  };

  const resetToCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalAmount}>
              ₹ {totalSpent.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.subText}>Total Spent this Month</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.selectorBtn}
              activeOpacity={0.7}
              onPress={() => {
                setPickerYear(selectedYear);
                setIsPickerVisible(true);
              }}
            >
              <Text style={styles.dateText}>
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </Text>
              <Icon name="chevron-down" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterIconBtn}
              activeOpacity={0.7}
              onPress={openFilterModal}
            >
              <Icon name="filter-variant" size={24} color={(selectedCategory || selectedAccount) ? theme.colors.primary : theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
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
                  accountId={item.expense.account_id ?? undefined}
                  accountName={item.expense.account_id ? accountMap[item.expense.account_id] : undefined}
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
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={styles.pickerIconBtn}>
                <Icon name="chevron-left" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={styles.pickerIconBtn}>
                <Icon name="chevron-right" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {MONTHS.map((month, index) => {
                const isSelected = selectedMonth === index + 1 && selectedYear === pickerYear;
                return (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthChip, isSelected && styles.monthChipSelected]}
                    onPress={() => selectMonth(index)}
                  >
                    <Text style={[styles.monthChipText, isSelected && styles.monthChipTextSelected]}>
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
              <Icon name="calendar-today" size={20} color={theme.colors.primary} />
              <Text style={styles.resetBtnText}>Jump to Current Month</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Category/Account Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <SafeAreaView style={styles.fullScreenFilterContainer}>
          <View style={[styles.filterModalHeader, { borderBottomWidth: 1 }]}>
            <Text style={styles.pickerYearText}>Filters</Text>
          </View>

            <View style={styles.filterModalBody}>
              {/* Left Column: Tabs */}
              <View style={styles.filterTabsCol}>
                <TouchableOpacity
                  style={[styles.filterTabBtn, activeFilterTab === 'category' && styles.filterTabBtnActive]}
                  onPress={() => setActiveFilterTab('category')}
                >
                  <Text style={[styles.filterTabText, activeFilterTab === 'category' && styles.filterTabTextActive]}>Category</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTabBtn, activeFilterTab === 'account' && styles.filterTabBtnActive]}
                  onPress={() => setActiveFilterTab('account')}
                >
                  <Text style={[styles.filterTabText, activeFilterTab === 'account' && styles.filterTabTextActive]}>Account</Text>
                </TouchableOpacity>
              </View>

              {/* Right Column: Options */}
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
                        (activeFilterTab === 'category' ? !tempCategory : !tempAccount)
                          ? "radiobox-marked"
                          : "radiobox-blank"
                      }
                      size={20}
                      color={(activeFilterTab === 'category' ? !tempCategory : !tempAccount) ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={styles.filterOptionItemText}>
                      All {activeFilterTab === 'category' ? 'Categories' : 'Accounts'}
                    </Text>
                  </TouchableOpacity>

                  {activeFilterTab === 'category' && categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.filterOptionItem}
                      onPress={() => setTempCategory(cat.name)}
                    >
                      <Icon
                        name={tempCategory === cat.name ? "radiobox-marked" : "radiobox-blank"}
                        size={20}
                        color={tempCategory === cat.name ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <Text style={styles.filterOptionItemText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}

                  {activeFilterTab === 'account' && accounts.map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      style={styles.filterOptionItem}
                      onPress={() => setTempAccount(acc.id)}
                    >
                      <Icon
                        name={tempAccount === acc.id ? "radiobox-marked" : "radiobox-blank"}
                        size={20}
                        color={tempAccount === acc.id ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <Text style={styles.filterOptionItemText}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity style={styles.filterCancelBtn} onPress={() => setIsFilterModalOpen(false)}>
                <Text style={styles.filterCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyBtn} onPress={applyFilters}>
                <Text style={styles.filterApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
        </SafeAreaView>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  totalBlock: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateText: {
    ...theme.typography.h3,
    fontSize: 16,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  loader: {
    marginTop: theme.spacing.xl,
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
  // Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  pickerIconBtn: {
    padding: theme.spacing.xs,
  },
  pickerYearText: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthChip: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  monthChipText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  monthChipTextSelected: {
    color: '#000000',
    fontFamily: theme.fonts.semiBold,
  },
  filterModalHeader: {
    padding: theme.spacing.lg,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  filterModalBody: {
    flex: 1,
    flexDirection: 'row',
  },
  fullScreenFilterContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterTabsCol: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  filterTabBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  filterTabBtnActive: {
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  filterTabText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold,
  },
  filterOptionsCol: {
    width: '65%',
  },
  filterOptionsList: {
    padding: theme.spacing.md,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: 12,
  },
  filterOptionItemText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    justifyContent: 'flex-end',
    gap: 12,
  },
  filterCancelBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  filterCancelBtnText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  filterApplyBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  filterApplyBtnText: {
    ...theme.typography.body,
    color: '#000000',
    fontFamily: theme.fonts.semiBold,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    gap: 8,
  },
  resetBtnText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
});
