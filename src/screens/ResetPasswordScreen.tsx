import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const paperTheme = {
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.surface,
    text: theme.colors.text,
  },
  fonts: {
    bodyLarge: { fontFamily: theme.fonts.displaySemiBold },
  },
};

export const ResetPasswordScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setPendingPasswordReset = useAuthStore(state => state.setPendingPasswordReset);

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Your password has been updated successfully!');
      setPendingPasswordReset(false);
    }
    setLoading(false);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Password Reset?',
      'You can change your password later from Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => setPendingPasswordReset(false),
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="shield-lock" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a strong password for your account. It must be at least 6 characters long.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" color={theme.colors.textSecondary} />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(prev => !prev)}
                color={theme.colors.textSecondary}
              />
            }
            style={styles.input}
            theme={paperTheme}
            textColor={theme.colors.text}
            contentStyle={styles.inputContent}
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            left={<TextInput.Icon icon="lock-check-outline" color={theme.colors.textSecondary} />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(prev => !prev)}
                color={theme.colors.textSecondary}
              />
            }
            style={styles.input}
            theme={paperTheme}
            textColor={theme.colors.text}
            contentStyle={styles.inputContent}
          />

          {/* Password strength hint */}
          <View style={styles.hintRow}>
            <Icon name="information-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.hintText}>Minimum 6 characters required</Text>
          </View>

          <Button
            title="Update Password"
            onPress={handleUpdatePassword}
            loading={loading}
            disabled={loading || !newPassword || !confirmPassword}
            style={styles.primaryBtn}
          />
        </View>

        {/* Skip */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={loading}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  input: {
    ...theme.typography.body,
    marginBottom: 14,
    backgroundColor: theme.colors.background,
  },
  inputContent: {
    ...theme.typography.body,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  hintText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
  },
  primaryBtn: {
    borderRadius: theme.borderRadius.md,
  },

  // Skip
  skipBtn: {
    alignSelf: 'center',
  },
  skipText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
