import { create } from 'zustand';
import { Expense, NewExpense } from '../types';
import { expenseService } from '../services/expenseService';

interface ExpenseState {
  dailyExpenses: Expense[];
  monthlyExpenses: Expense[];
  currentDailyDate: string | null;
  currentMonthlyKey: string | null;
  newEntryVersion: number;
  monthlySyncedEntryVersion: number;
  isLoading: boolean;
  error: string | null;

  fetchDailyExpenses: (date: string) => Promise<void>;
  fetchMonthlyExpenses: (year: number, month: number) => Promise<void>;
  addExpense: (expense: NewExpense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<NewExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  reset: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  dailyExpenses: [],
  monthlyExpenses: [],
  currentDailyDate: null,
  currentMonthlyKey: null,
  newEntryVersion: 0,
  monthlySyncedEntryVersion: -1,
  isLoading: false,
  error: null,

  fetchDailyExpenses: async (date: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await expenseService.getDailyExpenses(date);
      set({ dailyExpenses: data, currentDailyDate: date, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMonthlyExpenses: async (year: number, month: number) => {
    set({ isLoading: true, error: null });
    try {
      const data = await expenseService.getMonthlyExpenses(year, month);
      const currentVersion = get().newEntryVersion;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      set({
        monthlyExpenses: data,
        currentMonthlyKey: monthKey,
        monthlySyncedEntryVersion: currentVersion,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addExpense: async (expense: NewExpense) => {
    set({ isLoading: true, error: null });
    try {
      const newExp = await expenseService.addExpense(expense);
      // Insert locally only when the current daily list is for the same date.
      const currentDaily = get().dailyExpenses;
      const currentDailyDate = get().currentDailyDate;
      const shouldPrependToDaily = newExp.spent_on === currentDailyDate;
      const nextVersion = get().newEntryVersion + 1;
      set({
        dailyExpenses: shouldPrependToDaily
          ? [newExp, ...currentDaily]
          : currentDaily,
        newEntryVersion: nextVersion,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error; // Let the UI handle the failure presentation
    }
  },

  updateExpense: async (id: string, updates: Partial<NewExpense>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await expenseService.updateExpense(id, updates);
      const nextVersion = get().newEntryVersion + 1;
      set({
        dailyExpenses: get().dailyExpenses.map(e =>
          e.id === id ? updated : e,
        ),
        monthlyExpenses: get().monthlyExpenses.map(e =>
          e.id === id ? updated : e,
        ),
        isLoading: false,
        newEntryVersion: nextVersion,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteExpense: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await expenseService.deleteExpense(id);
      set({
        dailyExpenses: get().dailyExpenses.filter(e => e.id !== id),
        monthlyExpenses: get().monthlyExpenses.filter(e => e.id !== id),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  reset: () =>
    set({
      dailyExpenses: [],
      monthlyExpenses: [],
      currentDailyDate: null,
      currentMonthlyKey: null,
      newEntryVersion: 0,
      monthlySyncedEntryVersion: -1,
      isLoading: false,
      error: null,
    }),
}));
