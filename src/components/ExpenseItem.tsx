import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';

interface ExpenseItemProps {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date?: string;
}

const ACTION_WIDTH = 180; // Width of the actions panel (two buttons)

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  id,
  amount,
  category,
  note,
  date,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteExpense = useExpenseStore(state => state.deleteExpense);
  const [actionsVisible, setActionsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const toggleActions = () => {
    const toValue = actionsVisible ? 0 : -ACTION_WIDTH;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
    setActionsVisible(!actionsVisible);
  };

  const closeActions = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
    setActionsVisible(false);
  };

  const handleEdit = () => {
    closeActions();
    navigation.navigate('AddExpense', {
      editId: id,
      editAmount: amount,
      editCategory: category,
      editNote: note,
    });
  };

  const handleDelete = () => {
    closeActions();
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
              Alert.alert(
                'Error',
                'Failed to delete expense: ' + error.message,
              );
            }
          },
        },
      ],
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
    <View style={styles.wrapper}>
      {/* Action buttons revealed behind the card */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={handleEdit}
          activeOpacity={0.7}
        >
          <Icon name="pencil-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Icon name="delete-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Sliding card */}
      <Animated.View
        style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.leftContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: getCategoryColor(category) + '20' },
            ]}
          >
            <Icon
              name={getCategoryIcon(category)}
              size={24}
              color={getCategoryColor(category)}
            />
          </View>
          <View style={styles.details}>
            <Text style={styles.category}>{category}</Text>
            {note ? (
              <Text style={styles.note} numberOfLines={1}>
                {note}
              </Text>
            ) : null}
            {date ? <Text style={styles.date}>{date}</Text> : null}
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>
              ₹ {amount.toLocaleString('en-IN')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleActions}
            style={styles.moreBtn}
            activeOpacity={0.6}
          >
            <Icon
              name={actionsVisible ? 'close' : 'dots-vertical'}
              size={22}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    flexDirection: 'row',
  },
  editBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    ...theme.typography.small,
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: theme.fonts.medium,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    gap: 10,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: -5,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginRight: theme.spacing.sm,
  },
  moreBtn: {
    padding: theme.spacing.sm,
  },
  amount: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  date: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: -10,
  },
});
