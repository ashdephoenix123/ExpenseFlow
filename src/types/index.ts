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
