import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { useAccountStore } from '../store/accountStore';
import { Button } from '../components/Button';

export const ManageAccountsScreen = () => {
  const {
    accounts,
    isLoading,
    fetchAccounts,
    addAccount,
    deleteAccount,
    setPrimaryAccount,
    updateAccount,
  } = useAccountStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [renameAccountId, setRenameAccountId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddAccount = async () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter an account name.');
      return;
    }

    setSaving(true);
    try {
      await addAccount(trimmed);
      setNewAccountName('');
      setShowAddModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string, isPrimary: boolean) => {
    if (isPrimary) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete the primary account. Set another account as primary first.',
      );
      return;
    }
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${name}"? Expenses linked to this account will lose their account tag.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account.');
            }
          },
        },
      ],
    );
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimaryAccount(id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set primary account.');
    }
  };

  const handleRename = async () => {
    const trimmed = renameText.trim();
    if (!trimmed || !renameAccountId) return;

    setSaving(true);
    try {
      await updateAccount(renameAccountId, trimmed);
      setShowRenameModal(false);
      setRenameAccountId(null);
      setRenameText('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to rename account.');
    } finally {
      setSaving(false);
    }
  };

  const openRenameModal = (id: string, currentName: string) => {
    setRenameAccountId(id);
    setRenameText(currentName);
    setShowRenameModal(true);
  };

  const renderAccountItem = ({ item }: { item: any }) => (
    <View style={styles.accountItem}>
      <View style={styles.accountInfo}>
        <View style={styles.accountIconContainer}>
          <Icon
            name={item.is_primary ? 'star' : 'wallet-outline'}
            size={22}
            color={item.is_primary ? '#FFD700' : theme.colors.primary}
          />
        </View>
        <View style={styles.accountDetails}>
          <Text style={styles.accountName}>{item.name}</Text>
          {item.is_primary && (
            <Text style={styles.primaryBadge}>Primary</Text>
          )}
        </View>
      </View>

      <View style={styles.accountActions}>
        {!item.is_primary && (
          <TouchableOpacity
            onPress={() => handleSetPrimary(item.id)}
            style={styles.actionBtn}
            activeOpacity={0.7}>
            <Icon name="star-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => openRenameModal(item.id, item.name)}
          style={styles.actionBtn}
          activeOpacity={0.7}>
          <Icon name="pencil-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.name, item.is_primary)}
          style={styles.actionBtn}
          activeOpacity={0.7}>
          <Icon name="delete-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && accounts.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          renderItem={renderAccountItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon
                name="wallet-plus-outline"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No Accounts Yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first account to start tracking where your money goes.
              </Text>
            </View>
          }
          ListHeaderComponent={
            accounts.length > 0 ? (
              <Text style={styles.sectionHint}>
                Tap the ☆ to set an account as primary. The primary account is
                auto-selected when adding expenses.
              </Text>
            ) : null
          }
        />
      )}

      {/* Add Account Button */}
      <View style={styles.bottomBar}>
        <Button
          title="Add Account"
          onPress={() => setShowAddModal(true)}
          style={styles.addBtn}
        />
      </View>

      {/* Add Account Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => {
            setShowAddModal(false);
            setNewAccountName('');
          }}
          contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>New Account</Text>
          <Text style={styles.modalSubtext}>
            E.g. Cash, SBI Account, HDFC Credit Card
          </Text>
          <TextInput
            style={styles.modalInput}
            value={newAccountName}
            onChangeText={setNewAccountName}
            placeholder="Account name"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
            maxLength={50}
          />
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setShowAddModal(false);
                setNewAccountName('');
              }}
              style={styles.modalCancelBtn}
              textStyle={styles.modalCancelText}
            />
            <Button
              title="Add"
              onPress={handleAddAccount}
              loading={saving}
              disabled={!newAccountName.trim() || saving}
              style={styles.modalSaveBtn}
            />
          </View>
        </Modal>
      </Portal>

      {/* Rename Account Modal */}
      <Portal>
        <Modal
          visible={showRenameModal}
          onDismiss={() => {
            setShowRenameModal(false);
            setRenameAccountId(null);
            setRenameText('');
          }}
          contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Rename Account</Text>
          <TextInput
            style={styles.modalInput}
            value={renameText}
            onChangeText={setRenameText}
            placeholder="New name"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
            maxLength={50}
          />
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setShowRenameModal(false);
                setRenameAccountId(null);
                setRenameText('');
              }}
              style={styles.modalCancelBtn}
              textStyle={styles.modalCancelText}
            />
            <Button
              title="Rename"
              onPress={handleRename}
              loading={saving}
              disabled={!renameText.trim() || saving}
              style={styles.modalSaveBtn}
            />
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
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionHint: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  primaryBadge: {
    ...theme.typography.small,
    color: '#FFD700',
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    marginTop: 1,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addBtn: {
    width: '100%',
  },

  // Modal
  modalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 24,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  modalSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  modalInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    marginBottom: theme.spacing.md,
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
  modalSaveBtn: {
    flex: 1,
  },
});
