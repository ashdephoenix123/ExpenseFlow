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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { useAccountStore } from '../store/accountStore';

export const ManageAccountsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
        'You cannot delete the primary account. Designate another account as primary first.'
      );
      return;
    }
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${name}"? Expenses linked to this account will retain their records without an account tag.`,
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
      ]
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

  const renderAccountItem = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => (
    <View key={item.id}>
      <View style={styles.itemRow}>
        <View
          style={[
            styles.itemIconContainer,
            item.is_primary && styles.primaryIconContainer,
          ]}
        >
          <Icon
            name={item.is_primary ? 'star' : 'bank-outline'}
            size={20}
            color={item.is_primary ? '#B45309' : '#4B5563'}
          />
        </View>

        <View style={styles.itemContent}>
          <View style={styles.nameRow}>
            <Text style={styles.accountName}>{item.name}</Text>
            {item.is_primary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
          </View>
          <Text style={styles.accountSubtitle}>
            {item.is_primary ? 'Default account for new logs' : 'Linked account'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {!item.is_primary && (
            <TouchableOpacity
              onPress={() => handleSetPrimary(item.id)}
              style={styles.actionBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="star-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => openRenameModal(item.id, item.name)}
            style={styles.actionBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="pencil-outline" size={19} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name, item.is_primary)}
            style={[styles.actionBtn, styles.deleteActionBtn]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="delete-outline" size={19} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
      {index < accounts.length - 1 && <View style={styles.itemDivider} />}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Manage Accounts</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Content ── */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Screen Title Section ── */}
            <View style={styles.titleSection}>
              <Text style={styles.screenHeading}>Payment Accounts</Text>
              <Text style={styles.screenSubheading}>
                Manage bank accounts, wallets, and cards used for tracking
              </Text>
            </View>

            {/* ── Hint Banner ── */}
            <View style={styles.hintBanner}>
              <Icon
                name="information-outline"
                size={18}
                color="#4B5563"
                style={styles.hintIcon}
              />
              <Text style={styles.hintText}>
                Tap the star icon to set your primary account. It will be
                auto-selected when you log a new expense.
              </Text>
            </View>

            {/* ── Accounts Header ── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>LINKED ACCOUNTS</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {accounts.length} active
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#111827" />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Icon name="wallet-plus-outline" size={28} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No Accounts Configured</Text>
              <Text style={styles.emptySubtext}>
                Create your first account below to track payment methods.
              </Text>
            </View>
          )
        }
      />

      {/* ── Floating Bottom Add Button ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add New Account</Text>
        </TouchableOpacity>
      </View>

      {/* ── Add Account Modal ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAddModal(false);
          setNewAccountName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Icon name="bank-plus" size={24} color="#111827" />
            </View>
            <Text style={styles.modalTitle}>New Account</Text>
            <Text style={styles.modalDesc}>
              E.g. Cash, HDFC Bank, SBI Account, Credit Card
            </Text>

            <TextInput
              style={styles.modalInput}
              value={newAccountName}
              onChangeText={setNewAccountName}
              placeholder="Account name"
              placeholderTextColor="#9CA3AF"
              autoFocus
              maxLength={50}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setShowAddModal(false);
                  setNewAccountName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  (!newAccountName.trim() || saving) && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
                disabled={!newAccountName.trim() || saving}
                onPress={handleAddAccount}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Rename Account Modal ── */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRenameModal(false);
          setRenameAccountId(null);
          setRenameText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Icon name="pencil-outline" size={24} color="#111827" />
            </View>
            <Text style={styles.modalTitle}>Rename Account</Text>
            <Text style={styles.modalDesc}>
              Update the account label across all associated transactions.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="New account name"
              placeholderTextColor="#9CA3AF"
              autoFocus
              maxLength={50}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setShowRenameModal(false);
                  setRenameAccountId(null);
                  setRenameText('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  (!renameText.trim() || saving) && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
                disabled={!renameText.trim() || saving}
                onPress={handleRename}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },

  // ── Content ──
  listContent: {
    paddingHorizontal: 20,
  },
  titleSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  screenHeading: {
    fontSize: 26,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  screenSubheading: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 3,
    lineHeight: 18,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  hintIcon: {
    marginTop: 1,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#4B5563',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: '#6B7280',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },

  // ── Item Row ──
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  itemIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  primaryIconContainer: {
    backgroundColor: '#FEF3C7',
  },
  itemContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  primaryBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: '#B45309',
  },
  accountSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  deleteActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  itemDivider: {
    height: 0,
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 6,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },

  // ── Empty State ──
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: '#111827',
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },
});
