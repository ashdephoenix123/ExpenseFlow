export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  spent_on: string; // ISO format string 'YYYY-MM-DD'
  created_at?: string;
  user_id?: string;
}

export type NewExpense = Omit<Expense, 'id' | 'created_at' | 'user_id'>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AiUsageDay {
  date: string; // YYYY-MM-DD (UTC)
  requestCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiUsageOverview {
  todayDate: string;
  todayRequests: number;
  todayTokens: number;
  todayEstimatedCostUsd: number;
  dailyQuotaTokens: number;
  remainingTokens: number;
  usagePercent: number;
  usdPer1kTokens: number;
  daily: AiUsageDay[];
}
