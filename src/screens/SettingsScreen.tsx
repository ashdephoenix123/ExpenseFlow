import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

export const SettingsScreen = () => {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileSection}>
        <Text style={styles.label}>Logged in as:</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Button
        mode="outlined"
        onPress={handleLogout}
        textColor={theme.colors.error}
        style={styles.logoutBtn}
        labelStyle={styles.logoutLabel}
      >
        Logout button
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 20,
  },
  profileSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 20,
    width: '100%',
    borderColor: theme.colors.error,
  },
  logoutLabel: {
    ...theme.typography.body,
    color: theme.colors.error,
  }
});
