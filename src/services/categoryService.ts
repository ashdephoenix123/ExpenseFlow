import { supabase } from './supabase';

export interface Category {
  id: string;
  name: string;
  user_id: string | null;
  is_default: boolean;
  created_at: string;
}

export const categoryService = {
  /**
   * Fetch all categories visible to the current user:
   * predefined (is_default=true) + user's own custom categories.
   * RLS handles the filtering on the server side.
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Category[];
  },

  /**
   * Add a new custom category for the authenticated user.
   * user_id is set automatically by RLS / default.
   */
  async addCategory(name: string): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, user_id: user.id, is_default: false }])
      .select()
      .single();

    if (error) {
      // Unique constraint violation → duplicate name
      if (error.code === '23505') {
        throw new Error('A category with this name already exists.');
      }
      throw error;
    }
    return data as Category;
  },

  /**
   * Delete a custom category (only the owner can delete, enforced by RLS).
   */
  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
