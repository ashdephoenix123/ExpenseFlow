import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useExpenseStore } from '../store/expenseStore';
import { useCategoryStore } from '../store/categoryStore';
import { getTodayFormatted } from '../utils/dateUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;

export const AddExpenseScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddExpense'>>();
  const addExpense = useExpenseStore(state => state.addExpense);
  const updateExpense = useExpenseStore(state => state.updateExpense);

  const { categories, isLoading: categoriesLoading, fetchCategories, lastAddedCategoryName, clearLastAddedCategory } = useCategoryStore();

  const editId = route.params?.editId;
  const isEditing = !!editId;

  const [amount, setAmount] = useState(
    isEditing && route.params?.editAmount ? String(route.params.editAmount) : ''
  );
  const [category, setCategory] = useState(
    isEditing && route.params?.editCategory ? route.params.editCategory : ''
  );
  const [note, setNote] = useState(
    isEditing && route.params?.editNote ? route.params.editNote : ''
  );
  const [loading, setLoading] = useState(false);

  // Fetch categories once (skips if already cached in store)
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // If returning from AddCategory, preselect the newly created category
  useEffect(() => {
    if (lastAddedCategoryName) {
      setCategory(lastAddedCategoryName);
      clearLastAddedCategory();
    }
  }, [lastAddedCategoryName, clearLastAddedCategory]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Expense' : 'Add Expense',
    });
  }, [navigation, isEditing]);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid amount greater than 0.',
      );
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editId) {
        await updateExpense(editId, {
          amount: Number(amount),
          category,
          note,
        });
      } else {
        await addExpense({
          amount: Number(amount),
          category,
          note,
          spent_on: getTodayFormatted(),
        });
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isEditing ? 'update' : 'add'} expense.`);
    } finally {
      setLoading(false);
    }
  };

  const categoryNames = categories.map(c => c.name);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Amount (₹)"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          autoFocus
          style={styles.amountInput}
        />

        <View style={styles.categoryContainer}>
          <Input
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Food, Travel"
            style={styles.categoryInput}
          />

          {categoriesLoading ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loader}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
            >
              {categoryNames.map(cat => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.chipText, isActive && styles.chipTextActive]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* "+ Custom" chip at the end */}
              <TouchableOpacity
                style={styles.addChip}
                onPress={() => navigation.navigate('AddCategory')}
                activeOpacity={0.8}
              >
                <Icon name="plus" size={16} color={theme.colors.primary} />
                <Text style={styles.addChipText}>Custom</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        <Input
          label="Note (Optional)"
          placeholder="What was this for?"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          style={styles.notesInput}
        />

        <Button
          disabled={!category || !amount}
          title={isEditing ? 'Update Expense' : 'Save Expense'}
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  amountInput: {
    ...theme.typography.h3,
    fontSize: 32,
    height: 64,
    paddingVertical: 8,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  categoryContainer: {
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  categoryInput: {
    fontSize: 16,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
    fontSize: 16,
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: theme.spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  chipTextActive: {
    ...theme.typography.caption,
    color: '#000000',
  },
  addChip: {
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
  addChipText: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.primary,
    lineHeight: 24,
  },
  saveBtn: {
    marginTop: theme.spacing.xl,
  },
});
