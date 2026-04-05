import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from './AuthScreen';

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
        <View style={styles.content}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.description}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <Text style={styles.hint}>
            Didn't receive the email? Check your spam folder or try again.
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              setEmailSent(false);
              setEmail('');
            }}
            style={styles.button}
            buttonColor={theme.colors.primary}
            labelStyle={{ ...theme.typography.body, fontSize: 18 }}
          >
            Try Again
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
            textColor={theme.colors.textSecondary}
            labelStyle={{ ...theme.typography.body, color: theme.colors.textSecondary }}
          >
            Back to Login
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.description}>
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoFocus
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
          onPress={handleResetPassword}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor={theme.colors.primary}
          labelStyle={{ ...theme.typography.body, fontSize: 18 }}
        >
          Send Reset Link
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.linkButton}
          textColor={theme.colors.textSecondary}
          labelStyle={{ ...theme.typography.body, color: theme.colors.textSecondary }}
        >
          Back to Login
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
  successIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  emailHighlight: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
});
