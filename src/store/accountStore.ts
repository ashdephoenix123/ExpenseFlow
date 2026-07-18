import { create } from 'zustand';
import { Account } from '../types';
import { accountService } from '../services/accountService';

interface AccountState {
  accounts: Account[];
  fetched: boolean;
  isLoading: boolean;
  error: string | null;

  fetchAccounts: () => Promise<void>;
  addAccount: (name: string) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  setPrimaryAccount: (id: string) => Promise<void>;
  updateAccount: (id: string, name: string) => Promise<void>;
  getPrimaryAccount: () => Account | undefined;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  fetched: false,
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    if (get().fetched) return;
    set({ isLoading: true, error: null });
    try {
      const data = await accountService.getAccounts();
      set({ accounts: data, fetched: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addAccount: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const newAccount = await accountService.addAccount(name);
      set({
        accounts: [...get().accounts, newAccount],
        isLoading: false,
      });
      return newAccount;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteAccount: async (id: string) => {
    try {
      await accountService.deleteAccount(id);
      set({
        accounts: get().accounts.filter(a => a.id !== id),
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setPrimaryAccount: async (id: string) => {
    try {
      await accountService.setPrimaryAccount(id);
      set({
        accounts: get().accounts.map(a => ({
          ...a,
          is_primary: a.id === id,
        })),
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateAccount: async (id: string, name: string) => {
    try {
      await accountService.updateAccount(id, name);
      set({
        accounts: get().accounts.map(a =>
          a.id === id ? { ...a, name } : a
        ),
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getPrimaryAccount: () => {
    const { accounts } = get();
    if (accounts.length === 0) return undefined;
    return accounts.find(a => a.is_primary === true) || accounts[0];
  },

  reset: () =>
    set({
      accounts: [],
      fetched: false,
      isLoading: false,
      error: null,
    }),
}));
