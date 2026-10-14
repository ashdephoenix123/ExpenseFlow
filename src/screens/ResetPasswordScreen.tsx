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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';

export const ResetPasswordScreen = () => {
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setPendingPasswordReset = useAuthStore(
    state => state.setPendingPasswordReset,
  );

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      Alert.alert('Required Field', 'Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Short Password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert('Update Failed', error.message);
    } else {
      Alert.alert(
        'Password Updated',
        'Your password has been updated successfully!',
        [{ text: 'Continue', onPress: () => setPendingPasswordReset(false) }],
      );
    }
    setLoading(false);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Password Update?',
      'You can update your password anytime from Settings.',
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
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 20, 40),
            paddingBottom: Math.max(insets.bottom + 20, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand Header ── */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="shield-lock-outline" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>ExpenseFlow</Text>
          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Create a secure password with at least 6 characters to protect your
            account
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Icon
                name="lock-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.textInput}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Icon
                name="lock-check-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                style={styles.textInput}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(prev => !prev)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Icon
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Requirement Hint */}
          <View style={styles.hintRow}>
            <Icon name="information-outline" size={16} color="#6B7280" />
            <Text style={styles.hintText}>
              Requires a minimum of 6 characters
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (loading || !newPassword || !confirmPassword) &&
                styles.primaryBtnDisabled,
            ]}
            onPress={handleUpdatePassword}
            disabled={loading || !newPassword || !confirmPassword}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Skip Footer ── */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={loading}
          style={styles.skipBtn}
          activeOpacity={0.7}
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
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  appName: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: '#71717A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
  },

  // Form Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: '#4B5563',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: '#111827',
    padding: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },

  // Button
  primaryBtn: {
    backgroundColor: '#18181B',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Skip
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#6B7280',
  },
});
