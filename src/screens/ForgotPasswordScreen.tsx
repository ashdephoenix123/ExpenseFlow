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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from './AuthScreen';
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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: { navigation: NavigationProp }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'expenseflow://auth-callback',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, styles.successCircle]}>
              <Icon name="email-check" size={36} color={theme.colors.success} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a password reset link to
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.hintRow}>
              <Icon name="information-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.hintText}>
                Didn't receive the email? Check your spam folder or try again.
              </Text>
            </View>
          </View>

          <Button
            title="Try Again"
            onPress={() => {
              setEmailSent(false);
              setEmail('');
            }}
            style={styles.primaryBtn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backBtn}
          >
            <Icon name="arrow-left" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
            <Icon name="lock-reset" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the email address associated with your account and we'll send you a reset link.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
            left={<TextInput.Icon icon="email-outline" color={theme.colors.textSecondary} />}
            style={styles.input}
            theme={paperTheme}
            textColor={theme.colors.text}
            contentStyle={styles.inputContent}
          />

          <Button
            title="Send Reset Link"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading || !email.trim()}
            style={styles.primaryBtn}
          />
        </View>

        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.backText}>Back to Sign In</Text>
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
  successCircle: {
    backgroundColor: 'rgba(75, 181, 67, 0.12)',
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
  emailHighlight: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold,
    textAlign: 'center',
    marginTop: 4,
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
  primaryBtn: {
    marginTop: 4,
    borderRadius: theme.borderRadius.md,
  },

  // Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  backText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
