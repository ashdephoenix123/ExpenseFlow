import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';

interface ExpenseItemProps {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date?: string;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ id, amount, category, note, date }) => {
  const deleteExpense = useExpenseStore(state => state.deleteExpense);

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete expense: ' + error.message);
            }
          }
        },
      ]
    );
  };

  // Simple icon mapper based on category
  const getCategoryIcon = (cat: string) => {
    const C = cat.toLowerCase();
    if (C.includes('food') || C.includes('dining')) return 'food';
    if (C.includes('travel') || C.includes('transport')) return 'car';
    if (C.includes('shop')) return 'shopping';
    if (C.includes('bill') || C.includes('utilit')) return 'file-document';
    if (C.includes('entert')) return 'movie';
    return 'cash';
  };

  const getCategoryColor = (cat: string) => {
    const C = cat.toLowerCase();
    if (C.includes('food') || C.includes('dining')) return '#FF6B6B';
    if (C.includes('travel') || C.includes('transport')) return '#4ECDC4';
    if (C.includes('shop')) return '#FFD93D';
    if (C.includes('bill') || C.includes('utilit')) return '#6A0572';
    if (C.includes('entert')) return '#A78BFA';
    return theme.colors.primary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(category) + '20' }]}>
          <Icon name={getCategoryIcon(category)} size={24} color={getCategoryColor(category)} />
        </View>
        <View style={styles.details}>
          <Text style={styles.category}>{category}</Text>
          {note ? <Text style={styles.note} numberOfLines={1}>{note}</Text> : null}
        </View>
      </View>
      
      <View style={styles.rightContent}>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>₹ {amount.toLocaleString('en-IN')}</Text>
          {date ? <Text style={styles.date}>{date}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Icon name="delete-outline" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  category: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  note: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginRight: theme.spacing.md,
  },
  deleteBtn: {
    padding: theme.spacing.sm,
  },
  amount: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
