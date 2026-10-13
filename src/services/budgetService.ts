import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { MonthlyBudget } from '../types';

const LOCAL_BUDGETS_KEY = '@monthly_budgets_v1';
export const DEFAULT_BUDGET = 20000;

export const budgetService = {
  /**
   * Helper: Format year & month to 'YYYY-MM'
   */
  toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  },

  /**
   * Fetch all budgets for the authenticated user.
   * Checks Supabase first; falls back to local storage if offline or if table is not yet created.
   */
  async getAllBudgets(): Promise<MonthlyBudget[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('monthly_budgets')
          .select('*')
          .order('month_key', { ascending: true });

        if (!error && data) {
          const typedData = data as MonthlyBudget[];
          await this.saveLocalBudgets(typedData);
          return typedData;
        } else if (error) {
          // Table may not yet be migrated or RLS issue; use local fallback
          console.warn(
            '[budgetService] Supabase fetch notice:',
            error.message,
          );
        }
      }
    } catch (err: any) {
      console.warn('[budgetService] Error contacting Supabase:', err.message);
    }

    return this.getLocalBudgets();
  },

  /**
   * Resolve effective budget for a given monthKey ('YYYY-MM').
   * Business Logic:
   * 1. Exact match for target month.
   * 2. Most recent set budget prior to or on target month (<= monthKey).
   * 3. If target month is prior to any budget ever set, use the earliest known budget.
   * 4. DEFAULT_BUDGET (20000) if no budget has ever been recorded.
   */
  resolveBudgetForMonthKey(
    budgets: MonthlyBudget[],
    monthKey: string,
  ): { amount: number; isCustom: boolean } {
    if (!budgets || budgets.length === 0) {
      return { amount: DEFAULT_BUDGET, isCustom: false };
    }

    // 1. Exact match
    const exact = budgets.find(b => b.month_key === monthKey);
    if (exact && !isNaN(Number(exact.amount))) {
      return { amount: Number(exact.amount), isCustom: true };
    }

    // 2. Most recent budget prior to target month
    const sorted = [...budgets].sort((a, b) =>
      a.month_key.localeCompare(b.month_key),
    );
    const priorBudgets = sorted.filter(b => b.month_key <= monthKey);
    if (priorBudgets.length > 0) {
      const latestPrior = priorBudgets[priorBudgets.length - 1];
      return { amount: Number(latestPrior.amount), isCustom: false };
    }

    // 3. Fallback to earliest recorded budget
    if (sorted.length > 0) {
      return { amount: Number(sorted[0].amount), isCustom: false };
    }

    return { amount: DEFAULT_BUDGET, isCustom: false };
  },

  /**
   * Get budget for a specific year and month.
   */
  async getBudgetForMonth(
    year: number,
    month: number,
  ): Promise<{ amount: number; isCustom: boolean }> {
    const monthKey = this.toMonthKey(year, month);
    const allBudgets = await this.getAllBudgets();
    return this.resolveBudgetForMonthKey(allBudgets, monthKey);
  },

  /**
   * Save or update budget for a specific year and month in the database.
   * Performs an upsert on (user_id, month_key) and updates local cache.
   */
  async setBudgetForMonth(
    year: number,
    month: number,
    amount: number,
  ): Promise<MonthlyBudget> {
    const monthKey = this.toMonthKey(year, month);
    const timestamp = new Date().toISOString();

    let savedBudget: MonthlyBudget = {
      month_key: monthKey,
      amount,
      updated_at: timestamp,
    };

    // Update local cache immediately for responsive UI
    const currentLocal = await this.getLocalBudgets();
    const existingIndex = currentLocal.findIndex(b => b.month_key === monthKey);
    let updatedLocal: MonthlyBudget[];
    if (existingIndex >= 0) {
      updatedLocal = currentLocal.map((b, idx) =>
        idx === existingIndex ? { ...b, amount, updated_at: timestamp } : b,
      );
    } else {
      updatedLocal = [...currentLocal, savedBudget].sort((a, b) =>
        a.month_key.localeCompare(b.month_key),
      );
    }
    await this.saveLocalBudgets(updatedLocal);

    // Save/upsert to Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('monthly_budgets')
          .upsert(
            {
              user_id: user.id,
              month_key: monthKey,
              amount,
              updated_at: timestamp,
            },
            { onConflict: 'user_id,month_key' },
          )
          .select()
          .single();

        if (error) {
          console.warn(
            '[budgetService] Supabase upsert note (persisted locally):',
            error.message,
          );
        } else if (data) {
          savedBudget = data as MonthlyBudget;
          const refreshed = updatedLocal.map(b =>
            b.month_key === monthKey ? savedBudget : b,
          );
          await this.saveLocalBudgets(refreshed);
        }
      }
    } catch (err: any) {
      console.warn('[budgetService] Supabase upsert error:', err.message);
    }

    return savedBudget;
  },

  /**
   * Local storage helpers
   */
  async getLocalBudgets(): Promise<MonthlyBudget[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BUDGETS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
      // Migrate legacy single budget key if it existed
      const legacy = await AsyncStorage.getItem('@monthly_budget_cap');
      if (legacy) {
        const parsed = Number(legacy);
        if (!isNaN(parsed) && parsed > 0) {
          const now = new Date();
          const initial = [
            {
              month_key: this.toMonthKey(now.getFullYear(), now.getMonth() + 1),
              amount: parsed,
              created_at: new Date().toISOString(),
            },
          ];
          await this.saveLocalBudgets(initial);
          return initial;
        }
      }
    } catch {}
    return [];
  },

  async saveLocalBudgets(budgets: MonthlyBudget[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(budgets));
    } catch {}
  },
};
