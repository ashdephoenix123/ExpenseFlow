import { create } from 'zustand';
import { Expense, NewExpense } from '../types';
import { expenseService } from '../services/expenseService';

interface ExpenseState {
  dailyExpenses: Expense[];
  monthlyExpenses: Expense[];
  currentDailyDate: string | null;
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
  currentDailyDate: null,
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
      set({ monthlyExpenses: data, isLoading: false });
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
      set({ 
        dailyExpenses: shouldPrependToDaily ? [newExp, ...currentDaily] : currentDaily,
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
