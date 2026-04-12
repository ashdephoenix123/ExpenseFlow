import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Modal, Portal } from 'react-native-paper';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from '../components/Button';

export const SettingsScreen = () => {
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm.');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        Alert.alert('Error', error.message);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Icon name="account" size={40} color={theme.colors.primary} />
          </View>
        </View>
        <Text style={styles.userName}>User</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <Icon name="email-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Email</Text>
              <Text style={styles.menuValue} numberOfLines={1}>{user?.email}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <Icon name="calendar-clock" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Member Since</Text>
              <Text style={styles.menuValue}>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={[styles.menuIconContainer, styles.logoutIcon]}>
              <Icon name="logout" size={20} color={theme.colors.error} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, styles.logoutText]}>Logout</Text>
              <Text style={styles.menuHint}>Sign out of your account</Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={[styles.menuIconContainer, styles.deleteIcon]}>
              <Icon name="delete-forever" size={20} color={theme.colors.error} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, styles.deleteText]}>Delete Account</Text>
              <Text style={styles.menuHint}>Permanently remove your data</Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.version}>ExpenseFlow v1.0.0</Text>

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={showDeleteModal}
          onDismiss={() => {
            setShowDeleteModal(false);
            setConfirmText('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalIconRow}>
            <View style={styles.modalIconCircle}>
              <Icon name="alert-circle" size={32} color={theme.colors.error} />
            </View>
          </View>
          <Text style={styles.modalTitle}>Delete Account</Text>
          <Text style={styles.modalText}>
            This action is permanent and cannot be undone. All your data will be deleted.
          </Text>
          <Text style={styles.modalText}>
            Type <Text style={styles.bold}>DELETE</Text> below to confirm:
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            style={styles.modalInput}
            autoCapitalize="characters"
            theme={{
              colors: { primary: theme.colors.error, background: theme.colors.surface, text: theme.colors.text },
            }}
            textColor={theme.colors.text}
          />
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setShowDeleteModal(false);
                setConfirmText('');
              }}
              style={styles.modalCancelBtn}
              textStyle={styles.modalCancelText}
            />
            <Button
              title="Delete Forever"
              onPress={handleDeleteAccount}
              loading={deleting}
              disabled={confirmText !== 'DELETE' || deleting}
              style={styles.modalDeleteBtn}
              textStyle={styles.modalDeleteText}
            />
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 8,
  },
  avatarContainer: {
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  dangerTitle: {
    color: theme.colors.error,
  },

  // Card container
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  dangerCard: {
    borderColor: 'rgba(207, 102, 121, 0.25)',
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logoutIcon: {
    backgroundColor: 'rgba(207, 102, 121, 0.12)',
  },
  deleteIcon: {
    backgroundColor: 'rgba(207, 102, 121, 0.12)',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  menuValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 1,
  },
  menuHint: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  logoutText: {
    color: theme.colors.error,
  },
  deleteText: {
    color: theme.colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 66,
  },

  // Version
  version: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  },

  // Modal
  modalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 24,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(207, 102, 121, 0.25)',
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(207, 102, 121, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    marginTop: 8,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: theme.colors.error,
  },
  modalDeleteText: {
    color: '#ffffff',
    fontSize: 14,
  },
});
