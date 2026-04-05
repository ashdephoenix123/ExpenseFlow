import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';

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
      <View style={styles.content}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.description}>
          Create a strong password for your account. It must be at least 6 characters long.
        </Text>
        <TextInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(prev => !prev)}
              color={theme.colors.textSecondary}
            />
          }
          style={styles.input}
          theme={{
            colors: { primary: theme.colors.primary, background: theme.colors.surface, text: theme.colors.text },
            fonts: {
              bodyLarge: {
                fontFamily: theme.fonts.displaySemiBold,
              },
            },
          }}
          textColor={theme.colors.text}
          contentStyle={{ ...theme.typography.body }}
        />
        <TextInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirmPassword(prev => !prev)}
              color={theme.colors.textSecondary}
            />
          }
          style={styles.input}
          theme={{
            colors: { primary: theme.colors.primary, background: theme.colors.surface, text: theme.colors.text },
            fonts: {
              bodyLarge: {
                fontFamily: theme.fonts.displaySemiBold,
              },
            },
          }}
          textColor={theme.colors.text}
          contentStyle={{ ...theme.typography.body }}
        />
        <Button
          mode="contained"
          onPress={handleUpdatePassword}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor={theme.colors.primary}
          labelStyle={{ ...theme.typography.body, fontSize: 18 }}
        >
          Update Password
        </Button>
        <Button
          mode="text"
          onPress={handleSkip}
          disabled={loading}
          style={styles.linkButton}
          textColor={theme.colors.textSecondary}
          labelStyle={{ ...theme.typography.body, color: theme.colors.textSecondary }}
        >
          Skip for now
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    ...theme.typography.h1,
    fontSize: 32,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  input: {
    ...theme.typography.body,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  button: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkButton: {
    marginTop: 16,
  },
});
