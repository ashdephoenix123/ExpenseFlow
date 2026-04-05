import { create } from 'zustand';
import { Expense, NewExpense } from '../types';
import { expenseService } from '../services/expenseService';

interface ExpenseState {
  dailyExpenses: Expense[];
  monthlyExpenses: Expense[];
  isLoading: boolean;
  error: string | null;
  
  fetchDailyExpenses: (date: string) => Promise<void>;
  fetchMonthlyExpenses: (year: number, month: number) => Promise<void>;
  addExpense: (expense: NewExpense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<NewExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  dailyExpenses: [],
  monthlyExpenses: [],
  isLoading: false,
  error: null,

  fetchDailyExpenses: async (date: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await expenseService.getDailyExpenses(date);
      set({ dailyExpenses: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMonthlyExpenses: async (year: number, month: number) => {
    set({ isLoading: true, error: null });
    try {
      const data = await expenseService.getMonthlyExpenses(year, month);
      set({ monthlyExpenses: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addExpense: async (expense: NewExpense) => {
    set({ isLoading: true, error: null });
    try {
      const newExp = await expenseService.addExpense(expense);
      // Insert locally so UI updates instantly if the date matches today
      const currentDaily = get().dailyExpenses;
      // We assume it's added for today by default, so it prepends
      set({ 
        dailyExpenses: [newExp, ...currentDaily],
        isLoading: false 
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
      set({
        dailyExpenses: get().dailyExpenses.map(e => e.id === id ? updated : e),
        monthlyExpenses: get().monthlyExpenses.map(e => e.id === id ? updated : e),
        isLoading: false,
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
        isLoading: false
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));

