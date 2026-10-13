jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { budgetService, DEFAULT_BUDGET } from '../src/services/budgetService';
import { MonthlyBudget } from '../src/types';

describe('budgetService business logic', () => {
  test('toMonthKey formats year and month correctly with padding', () => {
    expect(budgetService.toMonthKey(2026, 5)).toBe('2026-05');
    expect(budgetService.toMonthKey(2026, 10)).toBe('2026-10');
    expect(budgetService.toMonthKey(2027, 1)).toBe('2027-01');
  });

  test('returns DEFAULT_BUDGET when no budgets exist', () => {
    const result = budgetService.resolveBudgetForMonthKey([], '2026-10');
    expect(result.amount).toBe(DEFAULT_BUDGET);
    expect(result.isCustom).toBe(false);
  });

  test('returns exact budget when month has a specific record', () => {
    const budgets: MonthlyBudget[] = [
      { month_key: '2026-10', amount: 20000 },
      { month_key: '2026-11', amount: 25000 },
    ];
    const oct = budgetService.resolveBudgetForMonthKey(budgets, '2026-10');
    expect(oct.amount).toBe(20000);
    expect(oct.isCustom).toBe(true);

    const nov = budgetService.resolveBudgetForMonthKey(budgets, '2026-11');
    expect(nov.amount).toBe(25000);
    expect(nov.isCustom).toBe(true);
  });

  test('carries forward budget to next month when next month has no budget set', () => {
    // October set to 20000, November has no budget set
    const budgets: MonthlyBudget[] = [
      { month_key: '2026-10', amount: 20000 },
    ];

    // When viewing November 2026
    const nov = budgetService.resolveBudgetForMonthKey(budgets, '2026-11');
    expect(nov.amount).toBe(20000);
    expect(nov.isCustom).toBe(false);

    // When viewing December 2026
    const dec = budgetService.resolveBudgetForMonthKey(budgets, '2026-12');
    expect(dec.amount).toBe(20000);
    expect(dec.isCustom).toBe(false);
  });

  test('future month override does NOT alter past month budget', () => {
    // October was 20000, November is set to 25000
    const budgets: MonthlyBudget[] = [
      { month_key: '2026-10', amount: 20000 },
      { month_key: '2026-11', amount: 25000 },
    ];

    // October stays 20000
    const oct = budgetService.resolveBudgetForMonthKey(budgets, '2026-10');
    expect(oct.amount).toBe(20000);
    expect(oct.isCustom).toBe(true);

    // November is 25000
    const nov = budgetService.resolveBudgetForMonthKey(budgets, '2026-11');
    expect(nov.amount).toBe(25000);
    expect(nov.isCustom).toBe(true);

    // December carries forward November's 25000
    const dec = budgetService.resolveBudgetForMonthKey(budgets, '2026-12');
    expect(dec.amount).toBe(25000);
    expect(dec.isCustom).toBe(false);
  });

  test('navigating before first budget uses earliest budget', () => {
    const budgets: MonthlyBudget[] = [
      { month_key: '2026-10', amount: 20000 },
    ];
    // September 2026 (prior to any budget ever set)
    const sep = budgetService.resolveBudgetForMonthKey(budgets, '2026-09');
    expect(sep.amount).toBe(20000);
    expect(sep.isCustom).toBe(false);
  });
});
