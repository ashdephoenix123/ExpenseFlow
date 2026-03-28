import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useExpenseStore } from '../store/expenseStore';
import { getTodayFormatted } from '../utils/dateUtils';

const CATEGORIES = ['Food & Dining', 'Travel & Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Other'];

export const AddExpenseScreen = () => {
  const navigation = useNavigation();
  const addExpense = useExpenseStore(state => state.addExpense);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await addExpense({
        amount: Number(amount),
        category,
        note,
        spent_on: getTodayFormatted(),
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
            {CATEGORIES.map(cat => {
              const isActive = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Input
          label="Note (Optional)"
          placeholder="What was this for?"
          value={note}
          onChangeText={setNote}
        />

        <Button
          title="Save Expense"
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
  },
  amountInput: {
    ...theme.typography.h1,
    fontSize: 32,
    height: 70,
  },
  categoryContainer: {
    marginBottom: theme.spacing.md,
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
  },
  chipTextActive: {
    ...theme.typography.caption,
    color: '#000000',
  },
  saveBtn: {
    marginTop: theme.spacing.xl,
  },
});
