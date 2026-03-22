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
  }
}));
