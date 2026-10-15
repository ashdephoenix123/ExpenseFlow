import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { useCategoryStore } from '../store/categoryStore';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageCategories'
>;

export const ManageCategoriesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const {
    categories,
    isLoading,
    fetchCategories,
    addCategory,
    deleteCategory,
  } = useCategoryStore();

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const customCategories = categories.filter((c) => !c.is_default);
  const defaultCategories = categories.filter((c) => c.is_default);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      await addCategory(trimmed);
      setNewName('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add category.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This won't delete expenses using this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await deleteCategory(id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete category.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Manage Categories</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Title Section ── */}
        <View style={styles.titleSection}>
          <Text style={styles.screenHeading}>Categories</Text>
          <Text style={styles.screenSubheading}>
            Organize expenditure classifications and create custom tags
          </Text>
        </View>

        {/* ── Add Category Card ── */}
        <Text style={styles.sectionHeaderLabel}>ADD NEW CATEGORY</Text>
        <View style={styles.addCard}>
          <Text style={styles.inputLabel}>Category Name</Text>
          <View style={styles.inputWrapper}>
            <Icon
              name="tag-plus-outline"
              size={20}
              color={colors.onSurfaceVariant}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Subscriptions, Hobbies, Gym"
              placeholderTextColor={colors.onSurfaceVariant}
              value={newName}
              onChangeText={setNewName}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn,
              (!newName.trim() || adding) && styles.addBtnDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleAdd}
            disabled={!newName.trim() || adding}
          >
            {adding ? (
              <ActivityIndicator size="small" color={isDark ? colors.onPrimary : '#FFFFFF'} />
            ) : (
              <>
                <Icon name="plus" size={18} color={isDark ? colors.onPrimary : '#FFFFFF'} />
                <Text style={styles.addBtnText}>Add Category</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Custom Categories ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabelNoMargin}>MY CUSTOM CATEGORIES</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {customCategories.length} custom
            </Text>
          </View>
        </View>

        {isLoading && categories.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : customCategories.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Icon name="tag-off-outline" size={28} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.emptyTitle}>No Custom Categories Yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first custom tag above to personalize your expense tracking.
            </Text>
          </View>
        ) : (
          <View style={styles.groupCard}>
            {customCategories.map((cat, index) => (
              <View key={cat.id}>
                <View style={styles.itemRow}>
                  <View style={styles.itemIconContainer}>
                    <Icon name="tag-outline" size={20} color={colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{cat.name}</Text>
                    <Text style={styles.itemSubtitle}>Custom category</Text>
                  </View>
                  {deletingId === cat.id ? (
                    <ActivityIndicator size="small" color={colors.tertiary} />
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleDelete(cat.id, cat.name)}
                      activeOpacity={0.7}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="delete-outline" size={20} color={colors.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
                {index < customCategories.length - 1 && (
                  <View style={styles.itemDivider} />
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Default System Categories ── */}
        {defaultCategories.length > 0 && (
          <>
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
              <Text style={styles.sectionHeaderLabelNoMargin}>
                DEFAULT CATEGORIES
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {defaultCategories.length} preset
                </Text>
              </View>
            </View>
            <View style={styles.groupCard}>
              {defaultCategories.map((cat, index) => (
                <View key={cat.id}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemIconContainer}>
                      <Icon
                        name="check-decagram-outline"
                        size={20}
                        color={isDark ? colors.secondary : '#059669'}
                      />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{cat.name}</Text>
                      <Text style={styles.itemSubtitle}>System standard</Text>
                    </View>
                    <View style={styles.defaultPill}>
                      <Icon name="lock-outline" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.defaultPillText}>Default</Text>
                    </View>
                  </View>
                  {index < defaultCategories.length - 1 && (
                    <View style={styles.itemDivider} />
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

function getStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── Top Bar ──
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    navIconBtn: {
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appTitle: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },

    // ── Scroll Content ──
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },

    // ── Screen Title Section ──
    titleSection: {
      paddingHorizontal: 20,
      marginTop: 4,
      marginBottom: 20,
    },
    screenHeading: {
      fontSize: 26,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
    },
    screenSubheading: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      marginTop: 3,
      lineHeight: 18,
    },

    // ── Add Card ──
    addCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 5,
      elevation: 1,
    },
    inputLabel: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    inputIcon: {
      marginRight: 8,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: theme.fonts.regular,
      color: colors.onSurface,
      padding: 0,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 12,
      gap: 6,
    },
    addBtnDisabled: {
      opacity: 0.4,
    },
    addBtnText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: isDark ? colors.onPrimary : '#FFFFFF',
    },

    // ── Section Headers ──
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: 22,
      marginBottom: 8,
    },
    sectionHeaderLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      letterSpacing: 1,
      marginHorizontal: 22,
      marginBottom: 8,
    },
    sectionHeaderLabelNoMargin: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      letterSpacing: 1,
    },
    countBadge: {
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    countBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },

    // ── Group Cards ──
    groupCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      marginHorizontal: 20,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 5,
      elevation: 1,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    itemIconContainer: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    itemContent: {
      flex: 1,
      paddingRight: 8,
    },
    itemTitle: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    itemSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },
    itemDivider: {
      height: 1,
      backgroundColor: colors.outlineVariant,
      marginLeft: 68,
    },
    deleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(201, 122, 99, 0.15)' : 'rgba(239, 68, 68, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    defaultPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    defaultPillText: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },

    // ── Empty & Loader ──
    loaderContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 20,
    },
    emptyIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
