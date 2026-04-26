import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  Linking,
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
      behavior={Platform.OS === 'ios' ? 'height' : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="wallet" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.appName}>ExpenseFlow</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue tracking your expenses</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email-outline" color={theme.colors.textSecondary} />}
            style={styles.input}
            theme={paperTheme}
            textColor={theme.colors.text}
            contentStyle={styles.inputContent}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
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

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.primaryBtn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>Don't have an account? </Text>
            <Text style={styles.switchHighlight}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://ashdephoenix123.github.io/ExpenseFlow/privacy-policy.html')}
            style={styles.privacyBtn}
          >
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
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
  appName: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
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
  forgotBtn: {
    alignSelf: 'center',
    marginTop: 16,
  },
  forgotText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontSize: 14,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  switchHighlight: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
  },
  privacyBtn: {
    paddingVertical: 4,
  },
  privacyText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
    fontSize: 13,
  },
});
