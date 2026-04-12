import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { useExpenseStore } from './expenseStore';
import { useCategoryStore } from './categoryStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  pendingPasswordReset: boolean;
  setSession: (session: Session | null) => void;
  setPendingPasswordReset: (pending: boolean) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  pendingPasswordReset: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setPendingPasswordReset: (pending) => set({ pendingPasswordReset: pending }),
  initialize: async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, initialized: true });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null });
      if (event === 'PASSWORD_RECOVERY') {
        set({ pendingPasswordReset: true });
      }
      // Clear cached data when user signs out or a different user signs in
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        useExpenseStore.getState().reset();
        useCategoryStore.getState().reset();
      }
    });
  },
}));
