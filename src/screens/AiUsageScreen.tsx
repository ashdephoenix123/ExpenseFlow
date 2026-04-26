import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';
import { aiUsageService } from '../services/aiUsageService';
import { AiUsageOverview } from '../types';

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const AiUsageScreen = () => {
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
  const progressColor =
    usagePercent >= 90 ? theme.colors.error : theme.colors.primary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadUsage}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="robot-happy-outline" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>AI Assistant Capacity</Text>
          <Text style={styles.headerSub}>
            Fair usage resets daily at 12:00 AM UTC
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Icon name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tokens Used Today</Text>
          <Text style={styles.statValue}>
            {(overview?.todayTokens ?? 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Requests Today</Text>
          <Text style={styles.statValue}>{overview?.todayRequests ?? 0}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Daily Token Limit</Text>
          <Text style={styles.statValue}>
            {(overview?.dailyQuotaTokens ?? 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Remaining Today</Text>
          <Text style={styles.statValue}>
            {(overview?.remainingTokens ?? 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today&apos;s Capacity</Text>
          <Text style={styles.progressValue}>
            {(overview?.todayTokens ?? 0).toLocaleString('en-IN')}
            {' / '}
            {(overview?.dailyQuotaTokens ?? 0).toLocaleString('en-IN')}
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
        <Text style={styles.progressHint}>
          {usagePercent.toFixed(1)}% of today&apos;s fair-usage limit used
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHead}>
          <Icon name="calendar-clock-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
        </View>

        {(overview?.daily ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No usage logged yet.</Text>
        ) : (
          overview?.daily.map((day, index) => (
            <View
              key={day.date}
              style={[styles.dayRow, index < overview.daily.length - 1 && styles.dayRowBorder]}
            >
              <View style={styles.dayLeft}>
                <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                <Text style={styles.dayMeta}>{day.requestCount} request(s)</Text>
              </View>
              <View style={styles.dayRight}>
                <Text style={styles.dayTokens}>
                  {day.totalTokens.toLocaleString('en-IN')} tokens
                </Text>
                <Text style={styles.dayCost}>
                  {overview?.dailyQuotaTokens
                    ? `${Math.min((day.totalTokens / overview.dailyQuotaTokens) * 100, 100).toFixed(1)}% of limit`
                    : 'No daily limit'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.footerNote}>
        Usage is shown for transparency only. You are not charged in the app.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  headerSub: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(207, 102, 121, 0.35)',
    backgroundColor: 'rgba(207, 102, 121, 0.08)',
    borderRadius: theme.borderRadius.md,
    padding: 12,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.error,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
  },
  statLabel: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 17,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
  },
  progressValue: {
    ...theme.typography.small,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressHint: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  dayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayLeft: {
    flex: 1,
  },
  dayDate: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 14,
  },
  dayMeta: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dayRight: {
    alignItems: 'flex-end',
  },
  dayTokens: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
  },
  dayCost: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  footerNote: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 2,
  },
});
