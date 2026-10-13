import { create } from 'zustand';
import { MonthlyBudget } from '../types';
import { budgetService, DEFAULT_BUDGET } from '../services/budgetService';

interface BudgetState {
  budgets: MonthlyBudget[];
  currentMonthKey: string | null;
  currentBudget: number;
  isCustomBudget: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadBudgetForMonth: (year: number, month: number) => Promise<number>;
  setBudgetForMonth: (
    year: number,
    month: number,
    amount: number,
  ) => Promise<void>;
  reset: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  currentMonthKey: null,
  currentBudget: DEFAULT_BUDGET,
  isCustomBudget: false,
  isLoading: false,
  isSaving: false,
  error: null,

  loadBudgetForMonth: async (year: number, month: number) => {
    const monthKey = budgetService.toMonthKey(year, month);
    set({ isLoading: true, error: null });
    try {
      const allBudgets = await budgetService.getAllBudgets();
      const resolved = budgetService.resolveBudgetForMonthKey(
        allBudgets,
        monthKey,
      );
      set({
        budgets: allBudgets,
        currentMonthKey: monthKey,
        currentBudget: resolved.amount,
        isCustomBudget: resolved.isCustom,
        isLoading: false,
      });
      return resolved.amount;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load budget',
      });
      return get().currentBudget;
    }
  },

  setBudgetForMonth: async (year: number, month: number, amount: number) => {
    const monthKey = budgetService.toMonthKey(year, month);
    set({ isSaving: true, error: null });
    try {
      await budgetService.setBudgetForMonth(year, month, amount);
      const allBudgets = await budgetService.getAllBudgets();
      const resolved = budgetService.resolveBudgetForMonthKey(
        allBudgets,
        monthKey,
      );
      set({
        budgets: allBudgets,
        currentMonthKey: monthKey,
        currentBudget: resolved.amount,
        isCustomBudget: resolved.isCustom,
        isSaving: false,
      });
    } catch (error: any) {
      set({
        isSaving: false,
        error: error.message || 'Failed to save budget',
      });
      throw error;
    }
  },

  reset: () =>
    set({
      budgets: [],
      currentMonthKey: null,
      currentBudget: DEFAULT_BUDGET,
      isCustomBudget: false,
      isLoading: false,
      isSaving: false,
      error: null,
    }),
}));
