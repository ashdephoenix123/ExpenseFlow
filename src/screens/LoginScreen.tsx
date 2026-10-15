import React, { useState, useMemo } from 'react';
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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../services/supabase';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { AuthStackParamList } from './AuthScreen';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: { navigation: NavigationProp }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) {
      Alert.alert('Login Failed', error.message);
    }
    setLoading(false);
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
            <Icon name="wallet-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.appName}>ExpenseFlow</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your ledger, budgets, and AI insights
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Icon
                name="email-outline"
                size={20}
                color={colors.onSurfaceVariant}
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                style={styles.textInput}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotLink}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Icon
                name="lock-outline"
                size={20}
                color={colors.onSurfaceVariant}
                style={styles.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.onSurfaceVariant}
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
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={isDark ? colors.onPrimary : '#FFFFFF'} />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
            style={styles.switchRow}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>Don't have an account? </Text>
            <Text style={styles.switchHighlight}>Create one</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                'https://ashdephoenix123.github.io/ExpenseFlow/privacy-policy.html',
              )
            }
            style={styles.privacyBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function getStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
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
      color: colors.primary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: {
      fontSize: 26,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      maxWidth: 290,
      lineHeight: 20,
    },

    // Form Card
    card: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 18,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    inputLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    forgotLink: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.primary,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
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
      color: colors.onSurface,
      padding: 0,
    },
    eyeBtn: {
      padding: 6,
      marginLeft: 4,
    },

    // Button
    primaryBtn: {
      backgroundColor: colors.primary,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryBtnText: {
      fontSize: 15,
      fontFamily: theme.fonts.semiBold,
      color: isDark ? colors.onPrimary : '#FFFFFF',
      letterSpacing: 0.2,
    },

    // Footer
    footer: {
      alignItems: 'center',
      gap: 16,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    switchText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },
    switchHighlight: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.primary,
    },
    privacyBtn: {
      paddingVertical: 4,
    },
    privacyText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      textDecorationLine: 'underline',
    },
  });
}
