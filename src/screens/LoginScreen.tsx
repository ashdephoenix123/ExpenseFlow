import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text, Linking, TouchableOpacity } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { theme } from '../theme/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from './AuthScreen';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: { navigation: NavigationProp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          theme={{
            colors: { primary: theme.colors.primary, background: theme.colors.surface, text: theme.colors.text }, fonts: {
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
            colors: { primary: theme.colors.primary, background: theme.colors.surface, text: theme.colors.text }, fonts: {
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
          onPress={handleLogin}
          loading={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 10 }}

          buttonColor={theme.colors.primary}
          labelStyle={{ ...theme.typography.body, fontSize: 18 }}
        >
          Login
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={loading}
          style={styles.forgotButton}
          textColor={theme.colors.primary}
          labelStyle={{ ...theme.typography.caption }}
          rippleColor="transparent"
        >
          Forgot Password?
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Signup')}
          disabled={loading}
          style={styles.linkButton}
          textColor={theme.colors.textSecondary}
          labelStyle={{ ...theme.typography.body, color: theme.colors.textSecondary }}
        >
          Don't have an account? Sign Up
        </Button>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://ashdephoenix123.github.io/ExpenseFlow/')}
          style={styles.privacyLink}
        >
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
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
    borderRadius: 8,
  },
  forgotButton: {
    marginTop: 16,
  },
  linkButton: {
    marginTop: 16,
  },
  privacyLink: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  privacyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
    fontSize: 13,
  },
});
