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
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { useCategoryStore } from '../store/categoryStore';
import { useAccountStore } from '../store/accountStore';
import { supabase } from '../services/supabase';
import { RootStackParamList } from '../navigation/AppNavigator';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
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
            Manage your account preferences, theme, and ledger parameters
          </Text>
        </View>

        {/* ── User Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitialsText}>{userInitials}</Text>
          </View>
          <View style={styles.profileInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              {isDark && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
            <View style={styles.memberRow}>
              <Icon
                name="calendar-blank-outline"
                size={13}
                color={colors.textMuted}
                style={styles.memberIcon}
              />
              <Text style={styles.memberText}>
                Member since {memberSinceFormatted}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 1: ACCOUNT & PREFERENCES ── */}
        <Text style={styles.sectionHeaderLabel}>ACCOUNT & PREFERENCES</Text>
        <View style={styles.groupCard}>
          {/* Appearance (Theme Toggle) */}
          <View style={styles.appearanceItem}>
            <View style={styles.itemRow}>
              <View style={styles.itemIconContainer}>
                <Icon
                  name="palette-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>Appearance</Text>
                <Text style={styles.itemSubtitle}>
                  {themeMode === 'system'
                    ? `System default (${isDark ? 'Dark' : 'Light'})`
                    : isDark
                    ? 'Private library noir aesthetic'
                    : 'Clean minimalist light'}
                </Text>
              </View>
            </View>

            {/* Segmented Control */}
            <View style={styles.themeToggleContainer}>
              {(['system', 'light', 'dark'] as const).map(mode => {
                const isActive = themeMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.themeSegmentBtn,
                      isActive && styles.themeSegmentBtnActive,
                    ]}
                    onPress={() => setThemeMode(mode)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={
                        mode === 'system'
                          ? 'cellphone'
                          : mode === 'light'
                          ? 'white-balance-sunny'
                          : 'weather-night'
                      }
                      size={14}
                      color={isActive ? colors.activePillText : colors.textMuted}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.themeSegmentText,
                        isActive && styles.themeSegmentTextActive,
                      ]}
                    >
                      {mode === 'system'
                        ? 'System'
                        : mode === 'light'
                        ? 'Light'
                        : 'Dark'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.itemDivider} />

          {/* Email */}
          <View style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Icon
                name="email-outline"
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Registered Email</Text>
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
              <Icon
                name="calendar-clock"
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Member Since</Text>
              <Text style={styles.itemSubtitle}>Account registration date</Text>
            </View>
            <Text style={styles.metaValueText}>{memberSinceFormatted}</Text>
          </View>
        </View>

        {/* ── SECTION 2: MANAGE LEDGER ── */}
        <Text style={styles.sectionHeaderLabel}>MANAGE LEDGER</Text>
        <View style={styles.groupCard}>
          {/* Categories */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ManageCategories')}
          >
            <View style={styles.itemIconContainer}>
              <Icon
                name="tag-outline"
                size={20}
                color={colors.textSecondary}
              />
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
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
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
              <Icon
                name="bank-outline"
                size={20}
                color={colors.textSecondary}
              />
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
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
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
              <Icon
                name="robot-happy-outline"
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>AI Usage</Text>
              <Text style={styles.itemSubtitle}>
                Daily token usage and fair-use limit
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          {/* Reminders */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Reminders')}
          >
            <View style={styles.itemIconContainer}>
              <Icon
                name="bell-ring-outline"
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Reminders & Bills</Text>
              <Text style={styles.itemSubtitle}>
                Track recurring upcoming payments
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 3: ACTIONS ── */}
        <Text style={styles.sectionHeaderLabel}>SESSION</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View
              style={[
                styles.itemIconContainer,
                { backgroundColor: colors.outflowBg },
              ]}
            >
              <Icon name="logout" size={20} color={colors.outflow} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: colors.outflow }]}>
                Disconnect & Log Out
              </Text>
              <Text style={styles.itemSubtitle}>Sign out of this device</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.outflow} />
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
                { backgroundColor: colors.outflowBg },
              ]}
            >
              <Icon name="delete-forever" size={20} color={colors.outflow} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: colors.outflow }]}>
                Delete Account
              </Text>
              <Text style={styles.itemSubtitle}>
                Permanently purge all data from cloud
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.outflow} />
          </TouchableOpacity>
        </View>

        {/* ── Version ── */}
        <Text style={styles.versionText}>ExpenseFlow v1.0.0 • Warm Editorial Dark</Text>
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
              <Icon name="alert-circle" size={32} color={colors.outflow} />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalDesc}>
              This action is permanent and cannot be undone. All your expenses,
              categories, accounts, and insights will be erased.
            </Text>
            <Text style={styles.deleteConfirmLabel}>
              Type <Text style={{ fontWeight: 'bold' }}>DELETE</Text> below to
              confirm:
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              style={styles.deleteInput}
              autoCapitalize="characters"
              placeholder="DELETE"
              placeholderTextColor={colors.textMuted}
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

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appTitle: {
      fontSize: 18,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
      marginLeft: 12,
      letterSpacing: isDark ? 0.3 : 0,
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
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.textPrimary,
    },
    screenSubheading: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 4,
    },

    // ── User Profile Card ──
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    avatarCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? '#211F1E' : '#18181B',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isDark ? 2 : 0,
      borderColor: colors.primary,
    },
    avatarInitialsText: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: isDark ? colors.primary : '#FFFFFF',
    },
    profileInfoCol: {
      marginLeft: 14,
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    profileName: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    proBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
    },
    proBadgeText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      color: colors.onPrimary,
      letterSpacing: 0.5,
    },
    profileEmail: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      marginTop: 1,
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
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },

    // ── Section Headers ──
    sectionHeaderLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: colors.textMuted,
      letterSpacing: 0.8,
      paddingHorizontal: 22,
      marginBottom: 8,
      marginTop: 4,
    },
    dangerSectionLabel: {
      color: colors.outflow,
    },

    // ── Group Cards ──
    groupCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      marginHorizontal: 20,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    dangerGroupCard: {
      borderColor: isDark ? colors.border : '#FEE2E2',
    },

    // ── Item Rows ──
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    itemIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    itemSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      marginTop: 1,
    },
    itemRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    countBadge: {
      backgroundColor: colors.surfaceLow,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    countBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    itemDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 64,
    },
    emailValueText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      maxWidth: 140,
    },
    metaValueText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
    },

    // ── Appearance Segmented Toggle ──
    appearanceItem: {
      paddingBottom: 14,
    },
    themeToggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLow,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 4,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeSegmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9,
    },
    themeSegmentBtnActive: {
      backgroundColor: colors.activePillBg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    themeSegmentText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textMuted,
    },
    themeSegmentTextActive: {
      color: colors.activePillText,
      fontFamily: theme.fonts.bold,
    },

    // ── Version ──
    versionText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 16,
    },

    // ── Delete Account Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    deleteModalCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    deleteIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.outflowBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    modalDesc: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
    },
    deleteConfirmLabel: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textPrimary,
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    deleteInput: {
      width: '100%',
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
      marginBottom: 18,
      textAlign: 'center',
      letterSpacing: 2,
    },
    modalActionRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    modalCancelBtn: {
      flex: 1,
      backgroundColor: colors.surfaceLow,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    modalDeleteBtn: {
      flex: 1,
      backgroundColor: colors.outflow,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDeleteText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: '#FFFFFF',
    },
  });
