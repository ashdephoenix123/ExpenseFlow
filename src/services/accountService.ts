import { supabase } from './supabase';
import { Account } from '../types';

export const accountService = {
  /**
   * Fetch all accounts for the current user,
   * ordered by primary first, then alphabetically by name.
   */
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Account[];
  },

  /**
   * Add a new account for the authenticated user.
   */
  async addAccount(name: string): Promise<Account> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('accounts')
      .insert([{ name, user_id: user.id }])
      .select()
      .single();

    if (error) {
      // Unique constraint violation → duplicate name
      if (error.code === '23505') {
        throw new Error('An account with this name already exists.');
      }
      throw error;
    }
    return data as Account;
  },

  /**
   * Delete an account (only the owner can delete, enforced by RLS).
   */
  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Set an account as the primary account.
   * First unsets all accounts as non-primary, then sets the target.
   */
  async setPrimaryAccount(id: string): Promise<Account> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Unset all accounts as non-primary
    const { error: unsetError } = await supabase
      .from('accounts')
      .update({ is_primary: false })
      .eq('user_id', user.id);

    if (unsetError) throw unsetError;

    // Set the target account as primary
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_primary: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  },

  /**
   * Update an account's name.
   */
  async updateAccount(id: string, name: string): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  },
};
