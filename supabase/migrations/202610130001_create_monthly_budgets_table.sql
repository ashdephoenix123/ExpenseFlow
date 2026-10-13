-- Create monthly_budgets table to store spending budgets per user per month
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g. '2026-10')
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: each user has at most one budget per month
ALTER TABLE public.monthly_budgets 
  DROP CONSTRAINT IF EXISTS unique_monthly_budget_per_user;
ALTER TABLE public.monthly_budgets 
  ADD CONSTRAINT unique_monthly_budget_per_user UNIQUE (user_id, month_key);

-- Index for fast user and month lookups
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_month 
  ON public.monthly_budgets (user_id, month_key DESC);

-- Enable Row Level Security
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'monthly_budgets' 
      AND policyname = 'Users can view own monthly budgets'
  ) THEN
    CREATE POLICY "Users can view own monthly budgets" 
      ON public.monthly_budgets FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'monthly_budgets' 
      AND policyname = 'Users can insert own monthly budgets'
  ) THEN
    CREATE POLICY "Users can insert own monthly budgets" 
      ON public.monthly_budgets FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'monthly_budgets' 
      AND policyname = 'Users can update own monthly budgets'
  ) THEN
    CREATE POLICY "Users can update own monthly budgets" 
      ON public.monthly_budgets FOR UPDATE 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'monthly_budgets' 
      AND policyname = 'Users can delete own monthly budgets'
  ) THEN
    CREATE POLICY "Users can delete own monthly budgets" 
      ON public.monthly_budgets FOR DELETE 
      USING (auth.uid() = user_id);
  END IF;
END $$;
