import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { useCategoryStore } from '../store/categoryStore';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ManageCategories'>;

export const ManageCategoriesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
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

  const customCategories = categories.filter(c => !c.is_default);

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
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Add New */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add New Category</Text>
        <View style={styles.addCard}>
          <View style={styles.addRow}>
            <View style={styles.addInputWrap}>
              <Input
                label="Category Name"
                placeholder="e.g. Groceries, Gym"
                value={newName}
                onChangeText={setNewName}
                maxLength={50}
                style={styles.addInput}
              />
            </View>
            <Button
              title="Add"
              onPress={handleAdd}
              loading={adding}
              disabled={!newName.trim() || adding}
              style={styles.addBtn}
            />
          </View>
        </View>
      </View>

      {/* My Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Categories</Text>
          <Text style={styles.countBadge}>{customCategories.length}</Text>
        </View>

        {isLoading && customCategories.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : customCategories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="tag-off-outline" size={40} color={theme.colors.border} />
            <Text style={styles.emptyText}>No custom categories yet</Text>
            <Text style={styles.emptyHint}>
              Add one above to personalize your expense tracking
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {customCategories.map((cat, index) => (
              <View
                key={cat.id}
                style={[
                  styles.categoryRow,
                  index < customCategories.length - 1 && styles.categoryRowBorder,
                ]}
              >
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryDot} />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </View>

                {deletingId === cat.id ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <TouchableOpacity
                    onPress={() => handleDelete(cat.id, cat.name)}
                    activeOpacity={0.7}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="delete-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  countBadge: {
    ...theme.typography.small,
    color: theme.colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    overflow: 'hidden',
    marginBottom: 10,
  },

  // Add card
  addCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addInputWrap: {
    flex: 1,
  },
  addInput: {
    fontSize: 15,
  },
  addBtn: {
    marginTop: 22,
    paddingHorizontal: 20,
    minHeight: 44,
  },

  // List card
  listCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  categoryName: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
  },

  // Empty & loader
  loaderContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  emptyHint: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
