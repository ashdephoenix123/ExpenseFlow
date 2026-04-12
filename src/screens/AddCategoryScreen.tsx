import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useCategoryStore } from '../store/categoryStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddCategory'>;

export const AddCategoryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const addCategory = useCategoryStore(state => state.addCategory);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter a category name.');
      return;
    }

    setLoading(true);
    try {
      await addCategory(trimmed);
      // Go back to the existing AddExpense screen;
      // the new category name is communicated via lastAddedCategoryName in the store
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add category.');
    } finally {
      setLoading(false);
    }
  };

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
        <View style={styles.header}>
          <Text style={styles.title}>Create Custom Category</Text>
          <Text style={styles.subtitle}>
            Add a personal category that only you can see and use.
          </Text>
        </View>

        <Input
          label="Category Name"
          placeholder="e.g. Groceries, Gym, Subscriptions"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={50}
          style={styles.nameInput}
        />

        <Text style={styles.hint}>
          Max 50 characters · Must be unique among your categories
        </Text>

        <Button
          title="Add Category"
          onPress={handleSave}
          loading={loading}
          disabled={!name.trim()}
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
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  nameInput: {
    fontSize: 18,
  },
  hint: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  saveBtn: {
    marginTop: theme.spacing.xl,
  },
});
