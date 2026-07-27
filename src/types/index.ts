export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  account_id?: string | null;
  spent_on: string; // ISO format string 'YYYY-MM-DD'
  is_reminder?: boolean;
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

export interface Account {
  id: string;
  name: string;
  is_primary: boolean;
  user_id: string;
  created_at?: string;
}
