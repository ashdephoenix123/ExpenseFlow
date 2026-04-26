import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────
// Tool Definitions — These are sent to Gemini so it knows what
// functions it can call and what arguments they accept.
// ─────────────────────────────────────────────────────────────

export const toolDefinitions = [
  {
    functionDeclarations: [
      {
        name: 'get_expenses',
        description:
          'Retrieve individual expense records for the user, optionally filtered by a date range and/or category. Returns a list of expense entries with amount, category, note, and date. Use this when the user wants to see specific transactions or a list of expenses.',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: {
              type: 'STRING',
              description:
                'Start of the date range (inclusive) in YYYY-MM-DD format. Example: "2026-04-01".',
            },
            endDate: {
              type: 'STRING',
              description:
                'End of the date range (inclusive) in YYYY-MM-DD format. Example: "2026-04-15".',
            },
            category: {
              type: 'STRING',
              description:
                'Filter by expense category name. Example: "Food", "Transport", "Entertainment". Case-insensitive.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_spending_summary',
        description:
          'Get a summary of total spending grouped by category for a given date range. Returns each category with its total amount and number of transactions. Use this when the user asks about totals, breakdowns, or "how much did I spend".',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: {
              type: 'STRING',
              description:
                'Start of the date range (inclusive) in YYYY-MM-DD format.',
            },
            endDate: {
              type: 'STRING',
              description:
                'End of the date range (inclusive) in YYYY-MM-DD format.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_expense_stats',
        description:
          'Get statistical information about expenses: the highest single expense, lowest single expense, average expense amount, and total count of transactions. Optionally filtered by date range and/or category. Use this when the user asks about biggest, smallest, average, or count.',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: {
              type: 'STRING',
              description:
                'Start of the date range (inclusive) in YYYY-MM-DD format.',
            },
            endDate: {
              type: 'STRING',
              description:
                'End of the date range (inclusive) in YYYY-MM-DD format.',
            },
            category: {
              type: 'STRING',
              description:
                'Filter by expense category name. Case-insensitive.',
            },
          },
          required: [],
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Tool Executors — Secure, parameterized Supabase queries.
// Each function takes the user-scoped Supabase client (RLS
// enforced) and the arguments extracted by Gemini.
// ─────────────────────────────────────────────────────────────

interface ToolArgs {
  startDate?: string;
  endDate?: string;
  category?: string;
}

/**
 * Fetch individual expense records with optional filters.
 */
async function executeGetExpenses(
  client: SupabaseClient,
  args: ToolArgs
): Promise<unknown> {
  let query = client
    .from('expenses')
    .select('amount, category, note, spent_on')
    .order('spent_on', { ascending: false })
    .order('amount', { ascending: false })
    .limit(50);

  if (args.startDate) query = query.gte('spent_on', args.startDate);
  if (args.endDate) query = query.lte('spent_on', args.endDate);
  if (args.category) query = query.ilike('category', args.category);

  const { data, error } = await query;
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get spending totals grouped by category.
 * Since Supabase JS doesn't support GROUP BY natively,
 * we fetch raw rows and aggregate in JavaScript.
 */
async function executeGetSpendingSummary(
  client: SupabaseClient,
  args: ToolArgs
): Promise<unknown> {
  let query = client
    .from('expenses')
    .select('amount, category')
    .order('spent_on', { ascending: false });

  if (args.startDate) query = query.gte('spent_on', args.startDate);
  if (args.endDate) query = query.lte('spent_on', args.endDate);

  const { data, error } = await query;
  if (error) throw new Error(`Database error: ${error.message}`);

  // Aggregate by category
  const summary: Record<string, { total: number; count: number }> = {};
  let grandTotal = 0;

  for (const row of data || []) {
    const cat = row.category || 'Uncategorized';
    if (!summary[cat]) summary[cat] = { total: 0, count: 0 };
    summary[cat].total += row.amount;
    summary[cat].count += 1;
    grandTotal += row.amount;
  }

  // Convert to sorted array
  const categories = Object.entries(summary)
    .map(([category, stats]) => ({
      category,
      total: Math.round(stats.total * 100) / 100,
      count: stats.count,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    grandTotal: Math.round(grandTotal * 100) / 100,
    totalTransactions: data?.length || 0,
    categories,
  };
}

/**
 * Get expense statistics (min, max, avg, count).
 */
async function executeGetExpenseStats(
  client: SupabaseClient,
  args: ToolArgs
): Promise<unknown> {
  let query = client
    .from('expenses')
    .select('amount, category, note, spent_on')
    .order('amount', { ascending: false });

  if (args.startDate) query = query.gte('spent_on', args.startDate);
  if (args.endDate) query = query.lte('spent_on', args.endDate);
  if (args.category) query = query.ilike('category', args.category);

  const { data, error } = await query;
  if (error) throw new Error(`Database error: ${error.message}`);

  if (!data || data.length === 0) {
    return {
      count: 0,
      message: 'No expenses found for the given criteria.',
    };
  }

  const amounts = data.map((e) => e.amount);
  const total = amounts.reduce((s, a) => s + a, 0);
  const highest = data[0]; // Already sorted desc by amount
  const lowest = data[data.length - 1];

  return {
    count: data.length,
    total: Math.round(total * 100) / 100,
    average: Math.round((total / data.length) * 100) / 100,
    highest: {
      amount: highest.amount,
      category: highest.category,
      note: highest.note,
      date: highest.spent_on,
    },
    lowest: {
      amount: lowest.amount,
      category: lowest.category,
      note: lowest.note,
      date: lowest.spent_on,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Tool Router — Maps a tool name to its executor function.
// ─────────────────────────────────────────────────────────────

export async function executeToolCall(
  client: SupabaseClient,
  toolName: string,
  args: ToolArgs
): Promise<unknown> {
  switch (toolName) {
    case 'get_expenses':
      return executeGetExpenses(client, args);
    case 'get_spending_summary':
      return executeGetSpendingSummary(client, args);
    case 'get_expense_stats':
      return executeGetExpenseStats(client, args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
