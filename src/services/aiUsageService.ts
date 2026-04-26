import { ASK_AI_DAILY_TOKEN_QUOTA, ASK_AI_ESTIMATED_USD_PER_1K_TOKENS } from '@env';
import { supabase } from './supabase';
import { AiUsageDay, AiUsageOverview } from '../types';

const DEFAULT_DAILY_QUOTA = 25000;
const DEFAULT_USD_PER_1K_TOKENS = 0.0004;

type UsageRow = {
  created_at: string;
  first_call_total_tokens: number | null;
  second_call_total_tokens: number | null;
  first_call_input_tokens: number | null;
  second_call_input_tokens: number | null;
  first_call_output_tokens: number | null;
  second_call_output_tokens: number | null;
};

function parseNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function estimateTokensForRow(row: UsageRow): number {
  const firstTotal =
    parseNumber(row.first_call_total_tokens, 0) ||
    parseNumber(row.first_call_input_tokens, 0) + parseNumber(row.first_call_output_tokens, 0);
  const secondTotal =
    parseNumber(row.second_call_total_tokens, 0) ||
    parseNumber(row.second_call_input_tokens, 0) + parseNumber(row.second_call_output_tokens, 0);
  return firstTotal + secondTotal;
}

function estimateCostUsd(tokens: number, usdPer1kTokens: number): number {
  return (tokens / 1000) * usdPer1kTokens;
}

export const aiUsageService = {
  async getOverview(days = 7): Promise<AiUsageOverview> {
    const now = new Date();
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select(
        'created_at,first_call_total_tokens,second_call_total_tokens,first_call_input_tokens,second_call_input_tokens,first_call_output_tokens,second_call_output_tokens'
      )
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch AI usage logs.');
    }

    const quota = parseNumber(ASK_AI_DAILY_TOKEN_QUOTA, DEFAULT_DAILY_QUOTA);
    const usdPer1kTokens = parseNumber(
      ASK_AI_ESTIMATED_USD_PER_1K_TOKENS,
      DEFAULT_USD_PER_1K_TOKENS
    );

    const byDate = new Map<string, AiUsageDay>();
    const rows = (data ?? []) as UsageRow[];

    for (const row of rows) {
      const date = String(row.created_at).slice(0, 10);
      const rowTokens = estimateTokensForRow(row);
      const current = byDate.get(date) ?? {
        date,
        requestCount: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };
      current.requestCount += 1;
      current.totalTokens += rowTokens;
      current.estimatedCostUsd = estimateCostUsd(current.totalTokens, usdPer1kTokens);
      byDate.set(date, current);
    }

    const daily = Array.from(byDate.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    const todayDate = now.toISOString().slice(0, 10);
    const today = byDate.get(todayDate) ?? {
      date: todayDate,
      requestCount: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };

    const remainingTokens = Math.max(quota - today.totalTokens, 0);
    const usagePercent = quota > 0 ? Math.min((today.totalTokens / quota) * 100, 100) : 0;

    return {
      todayDate,
      todayRequests: today.requestCount,
      todayTokens: today.totalTokens,
      todayEstimatedCostUsd: today.estimatedCostUsd,
      dailyQuotaTokens: quota,
      remainingTokens,
      usagePercent,
      usdPer1kTokens,
      daily,
    };
  },
};
