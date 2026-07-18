import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { useCategoryStore } from '../store/categoryStore';
import { useAccountStore } from '../store/accountStore';
import { getTodayFormatted } from '../utils/dateUtils';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { Button } from '../components/Button';
import { Account } from '../types';

export const HomeScreen = () => {
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
    addAccount,
    getPrimaryAccount,
  } = useAccountStore();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddAccountInput, setShowAddAccountInput] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  const successAnim = useRef(new Animated.Value(0)).current;
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
      }
    }
  }, [accounts, selectedAccountId, getPrimaryAccount]);


  const showSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccess(false);
    });
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid amount greater than 0.',
      );
      return;
    }

    if (!category.trim()) {
      Alert.alert('Missing Category', 'Please select or enter a category.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Missing Account', 'Please select an account.');
      return;
    }

    setLoading(true);
    try {
      await addExpense({
        amount: Number(amount),
        category,
        note,
        account_id: selectedAccountId,
        spent_on: getTodayFormatted(),
      });

      // Reset form
      setAmount('');
      setCategory('');
      setNote('');
      // Keep selectedAccountId as is (primary stays selected)

      showSuccessAnimation();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCategory = async (name: string) => {
    await addCategory(name);
  };

  const handleAddNewAccount = async () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) return;

    setAddingAccount(true);
    try {
      const newAcc = await addAccount(trimmed);
      setSelectedAccountId(newAcc.id);
      setNewAccountName('');
      setShowAddAccountInput(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add account.');
    } finally {
      setAddingAccount(false);
    }
  };

  const categoryNames = categories.map(c => c.name);

  const isFormValid = !!amount && Number(amount) > 0 && !!category.trim() && !!selectedAccountId;

  return (
    <>
      <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === 'ios' ? 20 : 20}>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            ref={amountRef}
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={theme.colors.border}
            keyboardType="numeric"
          />
        </View>

        {/* Category Autocomplete */}
        <AutocompleteInput
          label="Category"
          value={category}
          onSelect={setCategory}
          suggestions={categoryNames}
          isLoading={categoriesLoading}
          onAddNew={handleAddNewCategory}
          placeholder="e.g. Food, Travel, Shopping"
        />

        {/* Account Selector */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionLabel}>Account</Text>

          {accountsLoading ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.accountLoader}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.accountChipsContainer}>
              {accounts.map((acc: Account) => {
                const isActive = selectedAccountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountChip, isActive && styles.accountChipActive]}
                    onPress={() => setSelectedAccountId(acc.id)}
                    activeOpacity={0.8}>
                    <Icon
                      name={acc.is_primary ? 'star' : 'wallet-outline'}
                      size={14}
                      color={isActive ? '#000000' : theme.colors.textSecondary}
                      style={styles.chipIcon}
                    />
                    <Text
                      style={[
                        styles.accountChipText,
                        isActive && styles.accountChipTextActive,
                      ]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Account Chip */}
              <TouchableOpacity
                style={styles.addAccountChip}
                onPress={() => setShowAddAccountInput(true)}
                activeOpacity={0.8}>
                <Icon name="plus" size={16} color={theme.colors.primary} />
                <Text style={styles.addAccountChipText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Inline Add Account Input */}
          {showAddAccountInput && (
            <View style={styles.addAccountRow}>
              <TextInput
                style={styles.addAccountInput}
                value={newAccountName}
                onChangeText={setNewAccountName}
                placeholder="Account name"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
                maxLength={50}
              />
              <TouchableOpacity
                onPress={handleAddNewAccount}
                disabled={addingAccount || !newAccountName.trim()}
                style={[
                  styles.addAccountSaveBtn,
                  (!newAccountName.trim() || addingAccount) && styles.addAccountSaveBtnDisabled,
                ]}
                activeOpacity={0.7}>
                {addingAccount ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Icon name="check" size={20} color="#000" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowAddAccountInput(false);
                  setNewAccountName('');
                }}
                style={styles.addAccountCancelBtn}
                activeOpacity={0.7}>
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Note Input */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Save Button */}
        <Button
          disabled={!isFormValid}
          title="Save Expense"
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
    </KeyboardAwareScrollView>

      {/* Success Toast */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successToast,
            {
              opacity: successAnim,
              transform: [
                {
                  translateY: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={styles.successText}>Expense saved!</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    flexGrow: 1,
  },

  // Amount
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  currencySymbol: {
    ...theme.typography.h1,
    fontSize: 36,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  amountInput: {
    ...theme.typography.h1,
    fontSize: 42,
    lineHeight: 48,
    color: theme.colors.text,
    flex: 1,
    padding: 0,
    margin: 0,
    fontFamily: theme.fonts.regular,
    includeFontPadding: false,
  },

  // Account
  accountSection: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  accountLoader: {
    alignSelf: 'flex-start',
    marginVertical: theme.spacing.sm,
  },
  accountChipsContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipIcon: {
    marginRight: 4,
  },
  accountChipText: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  accountChipTextActive: {
    color: '#000000',
    fontFamily: theme.fonts.semiBold,
  },
  addAccountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addAccountChipText: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  addAccountInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    flex: 1,
    fontSize: 14,
  },
  addAccountSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountSaveBtnDisabled: {
    opacity: 0.4,
  },
  addAccountCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Note
  noteSection: {
    marginBottom: theme.spacing.md,
  },
  noteInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 15,
  },

  // Save
  saveBtn: {
    marginTop: theme.spacing.md,
  },

  // Success toast
  successToast: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  successText: {
    ...theme.typography.body,
    color: theme.colors.success,
    fontFamily: theme.fonts.medium,
  },
});
