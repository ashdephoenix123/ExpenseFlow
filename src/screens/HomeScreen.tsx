import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useCategoryStore } from '../store/categoryStore';
import { useAccountStore } from '../store/accountStore';
import { getTodayFormatted } from '../utils/dateUtils';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Account } from '../types';

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const addExpense = useExpenseStore(state => state.addExpense);

  const {
    categories,
    isLoading: categoriesLoading,
    fetchCategories,
    addCategory,
  } = useCategoryStore();

  const {
    accounts,
    isLoading: accountsLoading,
    fetchAccounts,
    getPrimaryAccount,
  } = useAccountStore();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [note, setNote] = useState('');
  const [spentOn, setSpentOn] = useState(getTodayFormatted());
  const [isReminder, setIsReminder] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const amountRef = useRef<TextInput>(null);

  // Fetch categories and accounts on mount
  useEffect(() => {
    fetchCategories();
    fetchAccounts();
  }, [fetchCategories, fetchAccounts]);

  // Set default account to primary when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const primary = getPrimaryAccount();
      if (primary) {
        setSelectedAccountId(primary.id);
      } else {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [accounts, selectedAccountId, getPrimaryAccount]);

  // Quick Add increment helper
  const handleQuickAdd = (increment: number) => {
    const current = Number(amount) || 0;
    const next = current + increment;
    setAmount(String(next));
  };

  // Fiscal Year text (e.g. FY 24–25 or FY 26–27)
  const fiscalYearText = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    const endYear = (startYear + 1) % 100;
    return `LEDGER ENTRY • FY ${startYear % 100}–${endYear < 10 ? '0' + endYear : endYear}`;
  }, []);

  // Filtered categories for selection
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(c =>
      c.name.toLowerCase().includes(categorySearch.toLowerCase().trim()),
    );
  }, [categories, categorySearch]);

  // Helper for category icons
  const getCategoryIcon = (
    name: string,
  ): React.ComponentProps<typeof Icon>['name'] => {
    const n = name.toLowerCase();
    if (n.includes('food') || n.includes('dining')) return 'silverware-fork-knife';
    if (n.includes('shop')) return 'shopping-outline';
    if (n.includes('travel') || n.includes('trip') || n.includes('flight')) return 'airplane';
    if (n.includes('transport') || n.includes('cab') || n.includes('uber')) return 'car';
    if (n.includes('bill') || n.includes('utilit')) return 'file-document-outline';
    if (n.includes('movie') || n.includes('entert')) return 'movie-outline';
    if (n.includes('tech') || n.includes('electron') || n.includes('gadget')) return 'mouse';
    if (n.includes('health') || n.includes('med')) return 'medical-bag';
    return 'tag-outline';
  };

  // Helper for account icons & subtitle
  const getAccountMeta = (acc: Account) => {
    const n = acc.name.toLowerCase();
    let icon: React.ComponentProps<typeof Icon>['name'] = 'wallet-outline';
    let subtitle = acc.is_primary ? 'Primary' : 'Savings / Current';

    if (acc.is_primary) {
      icon = 'star';
    } else if (n.includes('cash') || n.includes('physical')) {
      icon = 'cash';
      subtitle = 'Physical';
    } else if (n.includes('card') || n.includes('diners') || n.includes('visa')) {
      icon = 'credit-card-outline';
    } else if (n.includes('bank') || n.includes('sbi') || n.includes('hdfc')) {
      icon = 'bank-outline';
    }

    // Try to extract 4 digit number if present in name
    const matchDigits = acc.name.match(/\b\d{4}\b/);
    if (matchDigits) {
      subtitle = `•••• ${matchDigits[0]}`;
    } else if (!acc.is_primary && !n.includes('cash')) {
      subtitle = `•••• ${acc.id.slice(-4)}`;
    }

    return { icon, subtitle };
  };

  // Form submit handler
  const handleSave = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid amount greater than 0.',
      );
      return;
    }

    const finalCategory = category.trim() || categorySearch.trim();
    if (!finalCategory) {
      Alert.alert('Missing Category', 'Please select or enter a category.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Missing Account', 'Please select an account.');
      return;
    }

    setLoading(true);
    try {
      // If user typed a new category, add it
      const existing = categories.find(
        c => c.name.toLowerCase() === finalCategory.toLowerCase(),
      );
      if (!existing) {
        await addCategory(finalCategory);
      }

      await addExpense({
        amount: numAmount,
        category: finalCategory,
        note: note.trim() || undefined,
        account_id: selectedAccountId,
        spent_on: spentOn,
        is_reminder: isReminder,
      });

      // Reset form
      setAmount('');
      setCategory('');
      setCategorySearch('');
      setNote('');
      setIsReminder(false);
      setSpentOn(getTodayFormatted());

      // Navigate to Timeline to see the added expense!
      navigation.navigate('Timeline' as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  // Reset or close form
  const handleClose = () => {
    if (amount || note || category) {
      Alert.alert('Discard Changes?', 'Are you sure you want to clear this entry?', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setAmount('');
            setCategory('');
            setCategorySearch('');
            setNote('');
            setIsReminder(false);
            navigation.navigate('Timeline' as any);
          },
        },
      ]);
    } else {
      navigation.navigate('Timeline' as any);
    }
  };

  // Formatted date string for "Posting Date"
  const formattedPostingDate = useMemo(() => {
    const todayStr = getTodayFormatted();
    try {
      if (spentOn === todayStr) {
        return `Today, ${format(new Date(), 'MMM d, yyyy')}`;
      }
      const parts = spentOn.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return format(d, 'EEE, MMM d, yyyy');
    } catch {
      return spentOn;
    }
  }, [spentOn]);

  const displayAmount = Number(amount) || 0;

  return (
    <View style={[styles.screenContainer, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Icon name="close" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <Text style={styles.headerSubtitle}>{fiscalYearText}</Text>
        </View>

        <TouchableOpacity
          style={styles.scanBtn}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert(
              'Receipt Scanner',
              'Smart AI Receipt Scanner will be available in upcoming update.',
            );
          }}
        >
          <Icon name="line-scan" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 20}
      >
        {/* Outgoing Amount Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>OUTGOING AMOUNT</Text>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>INR ₹</Text>
            </View>
          </View>

          <View style={styles.amountInputRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              ref={amountRef}
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#D1D5DB"
              keyboardType="numeric"
              autoFocus={false}
            />
          </View>

          {/* Quick Increment Pills */}
          <View style={styles.quickPillsRow}>
            <TouchableOpacity
              style={styles.quickPill}
              activeOpacity={0.7}
              onPress={() => handleQuickAdd(50)}
            >
              <Text style={styles.quickPillText}>+₹50</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickPill}
              activeOpacity={0.7}
              onPress={() => handleQuickAdd(100)}
            >
              <Text style={styles.quickPillText}>+₹100</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickPill}
              activeOpacity={0.7}
              onPress={() => handleQuickAdd(500)}
            >
              <Text style={styles.quickPillText}>+₹500</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickPill}
              activeOpacity={0.7}
              onPress={() => handleQuickAdd(1000)}
            >
              <Text style={styles.quickPillText}>+₹1,000</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Classification Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>CATEGORY CLASSIFICATION</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ManageCategories')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLink}>Manage All &gt;</Text>
          </TouchableOpacity>
        </View>

        {/* Category Search Input */}
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. Food, Travel, Shopping..."
            placeholderTextColor="#9CA3AF"
            value={categorySearch || category}
            onChangeText={txt => {
              setCategorySearch(txt);
              setCategory(txt);
            }}
          />
          {(categorySearch || category) ? (
            <TouchableOpacity
              onPress={() => {
                setCategorySearch('');
                setCategory('');
              }}
              style={styles.clearSearchBtn}
            >
              <Icon name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Cards Carousel / Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryCardsRow}
        >
          {filteredCategories.map(cat => {
            const isSelected =
              (category || categorySearch).trim().toLowerCase() ===
              cat.name.trim().toLowerCase();
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setCategory(cat.name);
                  setCategorySearch('');
                }}
              >
                <Icon
                  name={getCategoryIcon(cat.name)}
                  size={20}
                  color={isSelected ? '#111827' : '#4B5563'}
                />
                <Text
                  style={[
                    styles.categoryCardText,
                    isSelected && styles.categoryCardTextSelected,
                  ]}
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Source Account Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>SOURCE ACCOUNT</Text>
          <Text style={styles.sectionMeta}>Primary Wallet: Active</Text>
        </View>

        {/* Account 2-Column Grid */}
        <View style={styles.accountsGrid}>
          {accounts.map(acc => {
            const isSelected = selectedAccountId === acc.id;
            const { icon, subtitle } = getAccountMeta(acc);
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accountCard,
                  isSelected && styles.accountCardSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedAccountId(acc.id)}
              >
                <View style={styles.accountCardIconContainer}>
                  <Icon
                    name={icon}
                    size={18}
                    color={isSelected ? '#111827' : '#6B7280'}
                  />
                </View>

                <View style={styles.accountCardDetails}>
                  <Text style={styles.accountCardTitle} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={styles.accountCardSub} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

                {isSelected ? (
                  <View style={styles.selectedCheckBadge}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Memo & Specifications Section */}
        <Text style={[styles.sectionLabel, styles.memoSectionLabel]}>
          MEMO &amp; SPECIFICATIONS
        </Text>

        <View style={styles.memoCard}>
          {/* Note Input Row */}
          <View style={styles.memoRow}>
            <Icon
              name="format-list-bulleted"
              size={20}
              color="#6B7280"
              style={styles.memoRowIcon}
            />
            <TextInput
              style={styles.memoInput}
              placeholder="Dinner with design team at Olive Bistro"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert('Attachments', 'Receipt and photo attachments coming soon!');
              }}
            >
              <Icon name="paperclip" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.memoDivider} />

          {/* Posting Date Row */}
          <TouchableOpacity
            style={styles.memoRow}
            activeOpacity={0.7}
            onPress={() => setIsDatePickerOpen(true)}
          >
            <View style={styles.memoRowLeft}>
              <Icon
                name="calendar-month-outline"
                size={20}
                color="#6B7280"
                style={styles.memoRowIcon}
              />
              <Text style={styles.memoRowTitle}>Posting Date</Text>
            </View>

            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{formattedPostingDate}</Text>
              <Icon name="chevron-down" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <View style={styles.memoDivider} />

          {/* Reminder Toggle Row */}
          <View style={styles.memoRow}>
            <View style={styles.memoRowLeft}>
              <Icon
                name="bell-outline"
                size={20}
                color="#6B7280"
                style={styles.memoRowIcon}
              />
              <View>
                <Text style={styles.memoRowTitle}>Mark as reminder</Text>
                <Text style={styles.memoRowSubtitle}>
                  Notify before statement balance clears
                </Text>
              </View>
            </View>

            <Switch
              value={isReminder}
              onValueChange={setIsReminder}
              trackColor={{ false: '#E5E7EB', true: '#18181B' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Save Expense Button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              Save Expense {displayAmount > 0 ? `• ₹${displayAmount.toLocaleString('en-IN')}` : ''} →
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* Posting Date Picker Modal */}
      <Modal
        visible={isDatePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDatePickerOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.datePickerModalCard}>
            <Text style={styles.dateModalTitle}>Select Posting Date</Text>

            <TouchableOpacity
              style={styles.dateOptionBtn}
              onPress={() => {
                setSpentOn(getTodayFormatted());
                setIsDatePickerOpen(false);
              }}
            >
              <Icon name="calendar-today" size={20} color="#18181B" />
              <Text style={styles.dateOptionText}>Today ({format(new Date(), 'MMM d')})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateOptionBtn}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setSpentOn(format(y, 'yyyy-MM-dd'));
                setIsDatePickerOpen(false);
              }}
            >
              <Icon name="calendar-arrow-left" size={20} color="#18181B" />
              <Text style={styles.dateOptionText}>Yesterday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateOptionBtn}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 2);
                setSpentOn(format(y, 'yyyy-MM-dd'));
                setIsDatePickerOpen(false);
              }}
            >
              <Icon name="calendar-clock" size={20} color="#18181B" />
              <Text style={styles.dateOptionText}>2 days ago</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateModalCloseBtn}
              onPress={() => setIsDatePickerOpen(false)}
            >
              <Text style={styles.dateModalCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Top Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scanBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Outgoing Amount Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    padding: 18,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: '#4B5563',
    letterSpacing: 0.5,
  },
  currencyBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 34,
    fontFamily: theme.fonts.bold,
    color: '#9CA3AF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 38,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    padding: 0,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickPillText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.5,
    color: '#4B5563',
  },
  sectionLink: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  sectionMeta: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },

  // Category Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: '#111827',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },

  // Category Cards
  categoryCardsRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  categoryCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: '#18181B',
    backgroundColor: '#E5E7EB',
  },
  categoryCardText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#374151',
  },
  categoryCardTextSelected: {
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },

  // Accounts Grid
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 18,
  },
  accountCard: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  accountCardSelected: {
    borderWidth: 2,
    borderColor: '#18181B',
  },
  accountCardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accountCardDetails: {
    flex: 1,
  },
  accountCardTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#111827',
  },
  accountCardSub: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedCheckBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Memo Section
  memoSectionLabel: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  memoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memoRowIcon: {
    marginRight: 12,
  },
  memoInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: '#111827',
    padding: 0,
    marginRight: 10,
  },
  memoRowTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#111827',
  },
  memoRowSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  memoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  datePill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePillText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#1F2937',
  },

  // Save Button
  saveBtn: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },

  // Date Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  dateModalTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginBottom: 16,
  },
  dateOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateOptionText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#1F2937',
  },
  dateModalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  dateModalCloseText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
  },
});
