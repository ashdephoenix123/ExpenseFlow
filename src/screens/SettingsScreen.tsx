import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, TextInput, Modal, Portal } from 'react-native-paper';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

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
        Logout
      </Button>

      <Button
        mode="contained"
        onPress={() => setShowDeleteModal(true)}
        buttonColor={theme.colors.error}
        textColor="#fff"
        style={styles.deleteBtn}
        labelStyle={styles.deleteLabel}
      >
        Delete Account
      </Button>

      <Portal>
        <Modal
          visible={showDeleteModal}
          onDismiss={() => {
            setShowDeleteModal(false);
            setConfirmText('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
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
              mode="text"
              onPress={() => {
                setShowDeleteModal(false);
                setConfirmText('');
              }}
              textColor={theme.colors.textSecondary}
              labelStyle={styles.modalBtnLabel}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleDeleteAccount}
              loading={deleting}
              disabled={confirmText !== 'DELETE' || deleting}
              buttonColor={theme.colors.error}
              textColor="#fff"
              labelStyle={styles.modalBtnLabel}
            >
              Delete Forever
            </Button>
          </View>
        </Modal>
      </Portal>
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
    borderRadius: 8
  },
  logoutLabel: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  deleteBtn: {
    marginTop: 16,
    width: '100%',
    borderRadius: 8,
  },
  deleteLabel: {
    ...theme.typography.body,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.error,
    marginBottom: 12,
  },
  modalText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    marginTop: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtnLabel: {
    ...theme.typography.body,
    fontSize: 14,
  },
});
