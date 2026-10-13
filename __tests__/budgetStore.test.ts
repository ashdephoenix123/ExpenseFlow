jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ month_key: '2026-10', amount: 20000 }],
        error: null,
      }),
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { month_key: '2026-11', amount: 25000 },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

import { useBudgetStore } from '../src/store/budgetStore';

describe('useBudgetStore', () => {
  beforeEach(() => {
    useBudgetStore.getState().reset();
  });

  test('loads budget for October and sets currentBudget', async () => {
    await useBudgetStore.getState().loadBudgetForMonth(2026, 10);
    const state = useBudgetStore.getState();
    expect(state.currentBudget).toBe(20000);
    expect(state.isCustomBudget).toBe(true);
    expect(state.currentMonthKey).toBe('2026-10');
  });

  test('loads November and inherits October budget of 20000 if not set', async () => {
    await useBudgetStore.getState().loadBudgetForMonth(2026, 11);
    const state = useBudgetStore.getState();
    expect(state.currentBudget).toBe(20000);
    expect(state.isCustomBudget).toBe(false);
  });
});
