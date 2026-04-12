-- ============================================================
-- Categories table for ExpenseFlow
-- Supports both predefined (system) and user-created categories
-- ============================================================

-- 1. Create the categories table
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add a unique constraint so a user can't create duplicate category names,
-- and predefined categories (user_id IS NULL) also stay unique.
CREATE UNIQUE INDEX uq_categories_name_user
  ON categories (name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- 2. Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- SELECT: Users can see predefined categories (user_id IS NULL)
--         AND their own custom categories.
CREATE POLICY "Users can view default and own categories"
  ON categories FOR SELECT
  USING (
    is_default = true       -- predefined categories visible to everyone
    OR user_id = auth.uid() -- user's own custom categories
  );

-- INSERT: Users can only insert categories for themselves.
--         They cannot create predefined (is_default = true) categories.
CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_default = false
  );

-- UPDATE: Users can only update their own custom categories.
CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING  (user_id = auth.uid() AND is_default = false)
  WITH CHECK (user_id = auth.uid() AND is_default = false);

-- DELETE: Users can only delete their own custom categories.
CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (user_id = auth.uid() AND is_default = false);

-- 4. Seed the predefined categories (no user_id → visible to all users)
INSERT INTO categories (name, user_id, is_default) VALUES
  ('Food & Dining',       NULL, true),
  ('Travel & Transport',  NULL, true),
  ('Shopping',            NULL, true),
  ('Bills & Utilities',   NULL, true),
  ('Entertainment',       NULL, true),
  ('Other',               NULL, true);
