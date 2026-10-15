import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Modal,
  ScrollView,
  PanResponder,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { useExpenseStore } from '../store/expenseStore';
import { formatTimeDisplay } from '../utils/dateUtils';

interface ExpenseItemProps {
  id: string;
  amount: number;
  category: string;
  note?: string;
  date?: string;
  accountName?: string;
  accountId?: string;
  isReminder?: boolean;
  createdAt?: string;
}

const ACTION_WIDTH = 144; // Width of the 2 action buttons (72px each)

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  id,
  amount,
  category,
  note,
  date,
  accountName,
  accountId,
  isReminder,
  createdAt,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deleteExpense = useExpenseStore(state => state.deleteExpense);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openActions = () => {
    Animated.spring(slideAnim, {
      toValue: -ACTION_WIDTH,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
    setActionsVisible(true);
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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          // Swiping left
          const newX = Math.max(-ACTION_WIDTH, gestureState.dx);
          slideAnim.setValue(newX);
        } else if (actionsVisible && gestureState.dx > 0) {
          // Swiping right to close
          const newX = Math.min(0, -ACTION_WIDTH + gestureState.dx);
          slideAnim.setValue(newX);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -35 || gestureState.vx < -0.4) {
          openActions();
        } else {
          closeActions();
        }
      },
    }),
  ).current;

  const handleEdit = () => {
    closeActions();
    navigation.navigate('AddExpense', {
      editId: id,
      editAmount: amount,
      editCategory: category,
      editNote: note,
      editAccountId: accountId,
      editIsReminder: isReminder,
      editSpentOn: date,
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

  // Category & Note based icon mapper to closely match prototype
  const getCategoryIcon = (
    cat: string,
    noteStr?: string,
  ): React.ComponentProps<typeof Icon>['name'] => {
    const c = (cat || '').toLowerCase();
    const n = (noteStr || '').toLowerCase();

    if (
      n.includes('mouse') ||
      c.includes('electron') ||
      n.includes('laptop') ||
      n.includes('keyboard') ||
      n.includes('gadget')
    ) {
      return 'mouse';
    }
    if (
      c.includes('travel') ||
      c.includes('transport') ||
      n.includes('uber') ||
      n.includes('ola') ||
      n.includes('flight') ||
      n.includes('cab') ||
      n.includes('airport')
    ) {
      return 'car';
    }
    if (
      c.includes('shop') ||
      n.includes('amazon') ||
      n.includes('flipkart') ||
      n.includes('swiggy') ||
      n.includes('zomato')
    ) {
      return 'shopping-outline';
    }
    if (c.includes('food') || c.includes('dining')) {
      return 'silverware-fork-knife';
    }
    if (
      c.includes('bill') ||
      c.includes('utilit') ||
      c.includes('recharge') ||
      c.includes('rent')
    ) {
      return 'file-document-outline';
    }
    if (c.includes('health') || c.includes('med')) {
      return 'medical-bag';
    }
    if (c.includes('entert') || n.includes('movie') || n.includes('netflix')) {
      return 'movie-outline';
    }
    return 'tag-outline';
  };

  // Main display title: Note if available, else Category
  const hasNote = Boolean(note && note.trim().length > 0);
  const displayTitle = hasNote ? (note as string).trim() : category;
  const displayCategory = hasNote ? category : 'Expense';

  // Time formatted display
  const formattedTime = formatTimeDisplay(createdAt || date);

  return (
    <View style={styles.wrapper}>
      {/* Revealed action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <Icon name="pencil-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Icon name="trash-can-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Main sliding row */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.touchableContent}
          onPress={() => {
            if (actionsVisible) {
              closeActions();
            } else {
              setModalVisible(true);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.leftContent}>
            <View style={styles.iconContainer}>
              <Icon
                name={getCategoryIcon(category, note)}
                size={22}
                color={colors.textSecondary}
              />
            </View>

            <View style={styles.details}>
              <Text style={styles.title} numberOfLines={1}>
                {displayTitle}
              </Text>

              <View style={styles.subtitleRow}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {displayCategory}
                </Text>

                {accountName ? (
                  <>
                    <Text style={styles.dotSeparator}>•</Text>
                    <View style={styles.accountBadge}>
                      <Text style={styles.accountBadgeText}>{accountName}</Text>
                    </View>
                  </>
                ) : null}

                {isReminder ? (
                  <Icon
                    name="bell"
                    size={13}
                    color={colors.primary}
                    style={styles.reminderBell}
                  />
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>
              -₹{Number(amount).toLocaleString('en-IN')}
            </Text>
            {actionsVisible ? (
              <Text style={styles.swipedHint}>&lt; swiped</Text>
            ) : formattedTime ? (
              <Text style={styles.timeText}>{formattedTime}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon
                  name={getCategoryIcon(category, note)}
                  size={28}
                  color={colors.textPrimary}
                />
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalAmount}>
                -₹{Number(amount).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.modalTitle}>{displayTitle}</Text>

              <View style={styles.modalMetaRow}>
                <View style={styles.modalCategoryChip}>
                  <Text style={styles.modalCategoryText}>{category}</Text>
                </View>
                {accountName && (
                  <View style={styles.modalAccountBadge}>
                    <Icon name="wallet-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.modalAccountText}>{accountName}</Text>
                  </View>
                )}
              </View>

              {formattedTime || date ? (
                <Text style={styles.modalDate}>
                  {formattedTime ? `${formattedTime} • ` : ''}
                  {date || ''}
                </Text>
              ) : null}

              {note && hasNote && (
                <View style={styles.modalNoteContainer}>
                  <Text style={styles.modalNoteLabel}>Description</Text>
                  <Text style={styles.modalNoteText}>{note}</Text>
                </View>
              )}

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalEditBtn}
                  onPress={() => {
                    setModalVisible(false);
                    handleEdit();
                  }}
                >
                  <Icon name="pencil" size={18} color={isDark ? colors.canvasBase : '#FFFFFF'} />
                  <Text style={styles.modalEditBtnText}>Edit Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => {
                    setModalVisible(false);
                    handleDelete();
                  }}
                >
                  <Icon name="trash-can-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.surfaceContainer,
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
      width: 72,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    editText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    deleteBtn: {
      width: 72,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    deleteText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: '#FFFFFF',
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    touchableContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    details: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 15,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
      marginBottom: 3,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
    },
    categoryText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      maxWidth: 140,
    },
    dotSeparator: {
      fontSize: 12,
      color: colors.textMuted,
      marginHorizontal: 6,
    },
    accountBadge: {
      backgroundColor: colors.surfaceLow,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    accountBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
    },
    reminderBell: {
      marginLeft: 6,
    },
    amountContainer: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    amountText: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    timeText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 3,
    },
    swipedHint: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 3,
    },

    // Details Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseBtn: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: colors.surfaceLow,
    },
    modalBody: {
      maxHeight: 400,
    },
    modalAmount: {
      fontSize: 32,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: theme.fonts.semiBold,
      color: colors.textPrimary,
      marginBottom: 10,
    },
    modalMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    modalCategoryChip: {
      backgroundColor: colors.surfaceLow,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    modalCategoryText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    modalAccountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLow,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
    },
    modalAccountText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    modalDate: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginBottom: 14,
    },
    modalNoteContainer: {
      backgroundColor: colors.surfaceLow,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderHairline,
      padding: 12,
      marginBottom: 16,
    },
    modalNoteLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    modalNoteText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    modalActionButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    modalEditBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.primary : '#18181B',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    modalEditBtnText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: isDark ? colors.canvasBase : '#FFFFFF',
    },
    modalDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#DC2626',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    modalDeleteBtnText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: '#FFFFFF',
    },
  });

