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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { AuthStackParamList } from './AuthScreen';

type NavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

export const ForgotPasswordScreen = ({
  navigation,
}: {
  navigation: NavigationProp;
}) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: 'expenseflow://auth-callback',
    });

    if (error) {
      Alert.alert('Request Failed', error.message);
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 20, 40),
            paddingBottom: Math.max(insets.bottom + 20, 40),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, styles.successCircle]}>
              <Icon name="email-check-outline" size={30} color="#15803D" />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We've dispatched a secure recovery link to:
            </Text>
            <View style={styles.emailChip}>
              <Text style={styles.emailHighlight}>{email}</Text>
            </View>
          </View>

          {/* Hint Card */}
          <View style={styles.card}>
            <View style={styles.hintRow}>
              <Icon
                name="information-outline"
                size={20}
                color="#6B7280"
                style={styles.hintIcon}
              />
              <Text style={styles.hintText}>
                Didn't receive an email? Check your spam folder or verify that
                the email address entered is registered with ExpenseFlow.
              </Text>
            </View>
          </View>

          {/* Try Again Button */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setEmailSent(false);
              setEmail('');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>
              Send to a Different Email
            </Text>
          </TouchableOpacity>

          {/* Back to Sign In */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={18} color="#4B5563" />
            <Text style={styles.backText}>Return to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

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
            <Icon name="lock-reset" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>ExpenseFlow</Text>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset
            your password
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>REGISTERED EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Icon
                name="email-outline"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                autoFocus
                style={styles.textInput}
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (loading || !email.trim()) && styles.primaryBtnDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading || !email.trim()}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Send Recovery Link</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={18} color="#4B5563" />
          <Text style={styles.backText}>Back to Sign In</Text>
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
    marginBottom: 28,
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
  successCircle: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
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
  emailChip: {
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  emailHighlight: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#18181B',
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
    marginBottom: 18,
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

  // Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  hintIcon: {
    marginTop: 1,
  },
  hintText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#18181B',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#374151',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  backText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
});
