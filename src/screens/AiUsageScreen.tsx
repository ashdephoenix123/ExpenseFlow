import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { theme, useTheme, ThemeColors } from '../theme/theme';
import { aiUsageService } from '../services/aiUsageService';
import { AiUsageOverview } from '../types';

function formatDate(isoDate: string): string {
  try {
    return new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return isoDate;
  }
}

export const AiUsageScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [overview, setOverview] = useState<AiUsageOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiUsageService.getOverview(7);
      setOverview(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load AI usage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsage();
    }, [loadUsage])
  );

  const usagePercent = overview?.usagePercent ?? 0;
  const isNearLimit = usagePercent >= 90;
  const progressColor = isNearLimit ? colors.tertiary : colors.primary;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>AI Usage & Quota</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadUsage}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Screen Title Section ── */}
        <View style={styles.titleSection}>
          <View style={styles.titleCol}>
            <Text style={styles.screenHeading}>AI Assistant</Text>
            <Text style={styles.screenSubheading}>
              Daily telemetry, token quotas, and fair-use parameters
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isNearLimit && styles.statusPillWarning,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isNearLimit && styles.statusDotWarning,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isNearLimit && styles.statusTextWarning,
              ]}
            >
              {isNearLimit ? 'Near Quota' : 'Quota Healthy'}
            </Text>
          </View>
        </View>

        {/* ── Error Banner ── */}
        {error ? (
          <View style={styles.errorCard}>
            <Icon name="alert-circle-outline" size={18} color={colors.tertiary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── 2x2 Metric Cards Grid ── */}
        <View style={styles.gridRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Icon name="lightning-bolt-outline" size={16} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.statLabel}>Tokens Used Today</Text>
            <Text style={styles.statValue}>
              {(overview?.todayTokens ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Icon name="message-text-outline" size={16} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.statLabel}>Requests Today</Text>
            <Text style={styles.statValue}>{overview?.todayRequests ?? 0}</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Icon name="chart-box-outline" size={16} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.statLabel}>Daily Token Limit</Text>
            <Text style={styles.statValue}>
              {(overview?.dailyQuotaTokens ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconCircle}>
              <Icon name="clock-check-outline" size={16} color={isDark ? colors.secondary : '#059669'} />
            </View>
            <Text style={styles.statLabel}>Remaining Today</Text>
            <Text style={[styles.statValue, { color: isDark ? colors.secondary : '#059669' }]}>
              {(overview?.remainingTokens ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ── Today's Capacity Progress Card ── */}
        <Text style={styles.sectionHeaderLabel}>TODAY&apos;S CAPACITY</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View style={styles.progressLabelWrap}>
              <Icon
                name="speedometer"
                size={18}
                color={colors.onSurface}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.progressHeading}>Fair-Use Burn Rate</Text>
            </View>
            <Text style={styles.progressValueText}>
              {(overview?.todayTokens ?? 0).toLocaleString('en-IN')}{' '}
              <Text style={{ color: colors.onSurfaceVariant }}>
                /{' '}
                {(overview?.dailyQuotaTokens ?? 0).toLocaleString('en-IN')}
              </Text>
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(2, Math.min(usagePercent, 100))}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>

          <View style={styles.progressFooterRow}>
            <Text style={styles.progressPercentText}>
              {usagePercent.toFixed(1)}% consumed
            </Text>
            <Text style={styles.progressResetText}>Resets 12:00 AM UTC</Text>
          </View>
        </View>

        {/* ── Last 7 Days History Card ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabelNoMargin}>LAST 7 DAYS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {(overview?.daily ?? []).length} recorded
            </Text>
          </View>
        </View>

        <View style={styles.groupCard}>
          {(overview?.daily ?? []).length === 0 ? (
            <View style={styles.emptyHistoryWrap}>
              <Text style={styles.emptyHistoryText}>
                No usage recorded in the past 7 days.
              </Text>
            </View>
          ) : (
            overview?.daily.map((day, index) => {
              const dayPercent = overview?.dailyQuotaTokens
                ? (day.totalTokens / overview.dailyQuotaTokens) * 100
                : 0;

              return (
                <View key={day.date}>
                  <View style={styles.dayRow}>
                    <View style={styles.dayIconBox}>
                      <Icon
                        name="calendar-blank-outline"
                        size={18}
                        color={colors.onSurfaceVariant}
                      />
                    </View>

                    <View style={styles.dayLeft}>
                      <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                      <Text style={styles.dayMeta}>
                        {day.requestCount} prompt inquiry
                        {day.requestCount === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View style={styles.dayRight}>
                      <Text style={styles.dayTokens}>
                        {day.totalTokens.toLocaleString('en-IN')}{' '}
                        <Text style={styles.tokensUnit}>tokens</Text>
                      </Text>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>
                          {dayPercent.toFixed(1)}% cap
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < overview.daily.length - 1 && (
                    <View style={styles.itemDivider} />
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Footer Transparency Note ── */}
        <View style={styles.footerWrap}>
          <Icon name="shield-check-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.footerNote}>
            AI telemetry metrics are monitored for fair resource allocation. You
            are never billed for standard queries.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

function getStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
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
    navIconBtn: {
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appTitle: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },

    // ── Content ──
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },

    // ── Screen Title Section ──
    titleSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: 4,
      marginBottom: 20,
    },
    titleCol: {
      flex: 1,
      paddingRight: 10,
    },
    screenHeading: {
      fontSize: 26,
      fontFamily: isDark ? theme.fonts.serifBold : theme.fonts.bold,
      color: colors.onSurface,
    },
    screenSubheading: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      marginTop: 3,
      lineHeight: 18,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(143, 163, 130, 0.15)' : '#DEF7EC',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(143, 163, 130, 0.25)' : '#BCF0DA',
    },
    statusPillWarning: {
      backgroundColor: isDark ? 'rgba(201, 122, 99, 0.15)' : '#FEF2F2',
      borderColor: isDark ? 'rgba(201, 122, 99, 0.25)' : '#FEE2E2',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? colors.secondary : '#059669',
    },
    statusDotWarning: {
      backgroundColor: colors.tertiary,
    },
    statusText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: isDark ? colors.secondary : '#03543F',
    },
    statusTextWarning: {
      color: colors.tertiary,
    },

    // ── Error ──
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(201, 122, 99, 0.3)' : '#FEE2E2',
      backgroundColor: isDark ? 'rgba(201, 122, 99, 0.1)' : '#FFF5F5',
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.tertiary,
      flex: 1,
    },

    // ── 2x2 Metric Cards Grid ──
    gridRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    statIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },

    // ── Today's Capacity Progress Card ──
    sectionHeaderLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      letterSpacing: 1,
      marginTop: 8,
      marginBottom: 8,
      marginLeft: 2,
    },
    progressCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 5,
      elevation: 1,
    },
    progressHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressHeading: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    progressValueText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    progressTrack: {
      height: 8,
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    progressPercentText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    progressResetText: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },

    // ── Last 7 Days History Card ──
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      marginLeft: 2,
    },
    sectionHeaderLabelNoMargin: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: colors.onSurfaceVariant,
      letterSpacing: 1,
    },
    countBadge: {
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    countBadgeText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    groupCard: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 5,
      elevation: 1,
      marginBottom: 20,
    },
    emptyHistoryWrap: {
      padding: 24,
      alignItems: 'center',
    },
    emptyHistoryText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    dayIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    dayLeft: {
      flex: 1,
    },
    dayDate: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    dayMeta: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      marginTop: 1,
    },
    dayRight: {
      alignItems: 'flex-end',
    },
    dayTokens: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.onSurface,
    },
    tokensUnit: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
    },
    dayBadge: {
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 2,
    },
    dayBadgeText: {
      fontSize: 10,
      fontFamily: theme.fonts.medium,
      color: colors.onSurfaceVariant,
    },
    itemDivider: {
      height: 1,
      backgroundColor: colors.outlineVariant,
      marginLeft: 64,
    },

    // ── Footer ──
    footerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      marginTop: 4,
    },
    footerNote: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 16,
      flex: 1,
    },
  });
}
