import { supabase } from './supabase';
import { Expense, NewExpense } from '../types';

export const expenseService = {
  async getDailyExpenses(date: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('spent_on', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Expense[];
  },

  async addExpense(expense: NewExpense): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async getMonthlyExpenses(year: number, month: number): Promise<Expense[]> {
    // month is 1-12
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('spent_on', startDate)
      .lte('spent_on', endDate)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Expense[];
  },

  async getAllExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('spent_on', { ascending: false });

    if (error) throw error;
    return data as Expense[];
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
