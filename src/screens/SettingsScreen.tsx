import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { useCategoryStore } from '../store/categoryStore';
import { useAccountStore } from '../store/accountStore';
import { supabase } from '../services/supabase';
import { RootStackParamList } from '../navigation/AppNavigator';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { user } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { accounts, fetchAccounts } = useAccountStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
  }, [fetchCategories, fetchAccounts]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to logout.');
          }
        },
      },
    ]);
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

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const userInitials = useMemo(() => {
    if (!displayName) return 'U';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  const memberSinceFormatted = useMemo(() => {
    if (!user?.created_at) return '—';
    try {
      return format(new Date(user.created_at), 'd MMMM yyyy');
    } catch {
      return '—';
    }
  }, [user?.created_at]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* ── Top Navigation Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Add' as any);
              }
            }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.appTitle}>ExpenseFlow</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Title Section ── */}
        <View style={styles.titleSection}>
          <Text style={styles.screenHeading}>Settings</Text>
          <Text style={styles.screenSubheading}>
            Manage your account preferences and ledger parameters
          </Text>
        </View>

        {/* ── User Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitialsText}>{userInitials}</Text>
          </View>
          <View style={styles.profileInfoCol}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
            <View style={styles.memberRow}>
              <Icon
                name="calendar-blank-outline"
                size={13}
                color="#6B7280"
                style={styles.memberIcon}
              />
              <Text style={styles.memberText}>
                Member since {memberSinceFormatted}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 1: ACCOUNT ── */}
        <Text style={styles.sectionHeaderLabel}>ACCOUNT</Text>
        <View style={styles.groupCard}>
          {/* Email */}
          <View style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Icon name="email-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Email</Text>
              <Text style={styles.itemSubtitle}>Primary account email</Text>
            </View>
            <Text style={styles.emailValueText} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
          </View>

          <View style={styles.itemDivider} />

          {/* Member Since */}
          <View style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Icon name="calendar-clock" size={20} color="#4B5563" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Member Since</Text>
              <Text style={styles.itemSubtitle}>Account registration date</Text>
            </View>
            <Text style={styles.metaValueText}>{memberSinceFormatted}</Text>
          </View>
        </View>

        {/* ── SECTION 2: MANAGE ── */}
        <Text style={styles.sectionHeaderLabel}>MANAGE</Text>
        <View style={styles.groupCard}>
          {/* Categories */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ManageCategories')}
          >
            <View style={styles.itemIconContainer}>
              <Icon name="tag-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Categories</Text>
              <Text style={styles.itemSubtitle}>
                Add or remove custom categories
              </Text>
            </View>
            <View style={styles.itemRightGroup}>
              {categories.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {categories.length} active
                  </Text>
                </View>
              )}
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          {/* Accounts */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ManageAccounts')}
          >
            <View style={styles.itemIconContainer}>
              <Icon name="bank-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Accounts</Text>
              <Text style={styles.itemSubtitle}>
                Manage payment accounts & set primary
              </Text>
            </View>
            <View style={styles.itemRightGroup}>
              {accounts.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {accounts.length} linked
                  </Text>
                </View>
              )}
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          {/* AI Usage */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AiUsage')}
          >
            <View style={styles.itemIconContainer}>
              <Icon name="robot-happy-outline" size={20} color="#4B5563" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>AI Usage</Text>
              <Text style={styles.itemSubtitle}>
                Daily token usage and fair-use limit
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 3: ACTIONS ── */}
        <Text style={styles.sectionHeaderLabel}>ACTIONS</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View
              style={[
                styles.itemIconContainer,
                { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
              ]}
            >
              <Icon name="logout" size={20} color="#DC2626" />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: '#DC2626' }]}>
                Logout
              </Text>
              <Text style={styles.itemSubtitle}>Sign out of your account</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 4: DANGER ZONE ── */}
        <Text style={[styles.sectionHeaderLabel, styles.dangerSectionLabel]}>
          DANGER ZONE
        </Text>
        <View style={[styles.groupCard, styles.dangerGroupCard]}>
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={() => setShowDeleteModal(true)}
          >
            <View
              style={[
                styles.itemIconContainer,
                { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
              ]}
            >
              <Icon name="delete-forever" size={20} color="#DC2626" />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: '#DC2626' }]}>
                Delete Account
              </Text>
              <Text style={styles.itemSubtitle}>Permanently remove your data</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* ── Version ── */}
        <Text style={styles.versionText}>ExpenseFlow v1.0.0</Text>
      </ScrollView>

      {/* ── MODAL: Delete Account Confirmation ── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setConfirmText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconCircle}>
              <Icon name="alert-circle" size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalDesc}>
              This action is permanent and cannot be undone. All your data will be deleted.
            </Text>
            <Text style={styles.deleteConfirmLabel}>
              Type <Text style={{ fontWeight: 'bold' }}>DELETE</Text> below to confirm:
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              style={styles.deleteInput}
              autoCapitalize="characters"
              placeholder="DELETE"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setShowDeleteModal(false);
                  setConfirmText('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteBtn,
                  (confirmText !== 'DELETE' || deleting) && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
                disabled={confirmText !== 'DELETE' || deleting}
                onPress={handleDeleteAccount}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Forever</Text>
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
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 12,
  },

  // ── Scroll Content ──
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Screen Title Section ──
  titleSection: {
    paddingHorizontal: 20,
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

  // ── User Profile Card ──
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitialsText: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memberIcon: {
    marginRight: 4,
  },
  memberText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
  },

  // ── Section Group Headers & Cards ──
  sectionHeaderLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: '#6B7280',
    letterSpacing: 1,
    marginHorizontal: 22,
    marginBottom: 8,
  },
  dangerSectionLabel: {
    color: '#DC2626',
    marginTop: 4,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F1F3',
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  dangerGroupCard: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFB',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: '#111827',
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  itemRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },

  // Item values
  emailValueText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#111827',
    maxWidth: 160,
    textAlign: 'right',
  },
  metaValueText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: '#111827',
    textAlign: 'right',
  },

  // Badges
  countBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: '#4B5563',
  },

  // Version
  versionText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },

  // ── Delete Confirmation Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#DC2626',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  deleteConfirmLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#4B5563',
    marginBottom: 8,
  },
  deleteInput: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    color: '#DC2626',
    textAlign: 'center',
    letterSpacing: 2,
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
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
  },
});
