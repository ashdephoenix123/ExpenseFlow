import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from './AuthScreen';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export const SignupScreen = ({ navigation }: { navigation: NavigationProp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'expenseflow://auth-callback'
      }
    });
    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please check your email for verification before logging in if required.');
      navigation.navigate('Login');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
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
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
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
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
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
          onPress={handleSignUp}
          loading={loading}
          style={styles.button}
          buttonColor={theme.colors.primary}
          labelStyle={{ ...theme.typography.body, fontSize: 18 }}
        >
          Sign Up
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.linkButton}
          textColor={theme.colors.textSecondary}
          labelStyle={{ ...theme.typography.body, color: theme.colors.textSecondary }}
        >
          Already have an account? Login
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
    marginBottom: 40,
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
