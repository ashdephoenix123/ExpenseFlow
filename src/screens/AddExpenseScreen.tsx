import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { Button } from '../components/Button';
import { useExpenseStore } from '../store/expenseStore';
import { useCategoryStore } from '../store/categoryStore';
import { useAccountStore } from '../store/accountStore';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { Account } from '../types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;

export const AddExpenseScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddExpense'>>();
  const updateExpense = useExpenseStore(state => state.updateExpense);

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
  } = useAccountStore();

  const editId = route.params?.editId;
  const isEditing = !!editId;

  const [amount, setAmount] = useState(
    isEditing && route.params?.editAmount ? String(route.params.editAmount) : '',
  );
  const [category, setCategory] = useState(
    isEditing && route.params?.editCategory ? route.params.editCategory : '',
  );
  const [note, setNote] = useState(
    isEditing && route.params?.editNote ? route.params.editNote : '',
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    isEditing && route.params?.editAccountId ? route.params.editAccountId : null,
  );
  const [isReminder, setIsReminder] = useState(
    isEditing ? !!route.params?.editIsReminder : false,
  );
  const [loading, setLoading] = useState(false);
  const [showAddAccountInput, setShowAddAccountInput] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  // Fetch categories and accounts once
  useEffect(() => {
    fetchCategories();
    fetchAccounts();
  }, [fetchCategories, fetchAccounts]);

  // If editing and no account was set yet from params, try to match from loaded accounts
  useEffect(() => {
    if (isEditing && route.params?.editAccountId && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(route.params.editAccountId);
    }
  }, [accounts, isEditing, route.params?.editAccountId, selectedAccountId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Edit Expense',
    });
  }, [navigation]);

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
      if (editId) {
        await updateExpense(editId, {
          amount: Number(amount),
          category,
          note,
          account_id: selectedAccountId,
          is_reminder: isReminder,
        });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update expense.');
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

  const isFormValid =
    !!amount && Number(amount) > 0 && !!category.trim() && !!selectedAccountId;

  return (
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
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={theme.colors.border}
            keyboardType="numeric"
            autoFocus
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

              <TouchableOpacity
                style={styles.addAccountChip}
                onPress={() => setShowAddAccountInput(true)}
                activeOpacity={0.8}>
                <Icon name="plus" size={16} color={theme.colors.primary} />
                <Text style={styles.addAccountChipText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

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
                  (!newAccountName.trim() || addingAccount) &&
                    styles.addAccountSaveBtnDisabled,
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
            numberOfLines={3}
          />
        </View>

        {/* Reminder Toggle */}
        <TouchableOpacity
          style={[styles.reminderToggle, isReminder && styles.reminderToggleActive]}
          onPress={() => setIsReminder(v => !v)}
          activeOpacity={0.8}>
          <Icon
            name={isReminder ? 'bell' : 'bell-outline'}
            size={18}
            color={isReminder ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.reminderToggleText,
              isReminder && styles.reminderToggleTextActive,
            ]}>
            Mark as reminder
          </Text>
          <Icon
            name={isReminder ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
            size={22}
            color={isReminder ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>

        <Button
          disabled={!isFormValid}
          title="Update Expense"
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
    </KeyboardAwareScrollView>
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
    fontSize: 40,
    lineHeight: 48,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  amountInput: {
    fontSize: 40,
    lineHeight: 48,
    color: theme.colors.text,
    flex: 1,
    padding: 0,
    margin: 0,
    fontFamily: theme.fonts.regular,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },

  // Save
  saveBtn: {
    marginTop: theme.spacing.xl,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  reminderToggleActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '1A',
  },
  reminderToggleText: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  reminderToggleTextActive: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
  },
});
