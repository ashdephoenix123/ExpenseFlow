import { create } from 'zustand';
import { Category, categoryService } from '../services/categoryService';

interface CategoryState {
  categories: Category[];
  fetched: boolean;
  isLoading: boolean;
  error: string | null;
  lastAddedCategoryName: string | null;

  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  clearLastAddedCategory: () => void;
  reset: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  fetched: false,
  isLoading: false,
  error: null,
  lastAddedCategoryName: null,

  fetchCategories: async () => {
    if (get().fetched) return;
    set({ isLoading: true, error: null });
    try {
      const data = await categoryService.getCategories();
      set({ categories: data, fetched: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addCategory: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const newCat = await categoryService.addCategory(name);
      set({
        categories: [...get().categories, newCat],
        lastAddedCategoryName: newCat.name,
        isLoading: false,
      });
      return newCat;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await categoryService.deleteCategory(id);
      set({
        categories: get().categories.filter(c => c.id !== id),
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  clearLastAddedCategory: () => set({ lastAddedCategoryName: null }),

  reset: () =>
    set({
      categories: [],
      fetched: false,
      isLoading: false,
      error: null,
      lastAddedCategoryName: null,
    }),
}));
