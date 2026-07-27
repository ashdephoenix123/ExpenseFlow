-- Add a reminder flag to expenses.
-- Reminder-flagged expenses are still normal expenses (they count toward
-- spending totals); the flag simply lets the Reminders screen list them.
alter table public.expenses
  add column if not exists is_reminder boolean not null default false;

-- Speed up the Reminders screen query, which filters on this flag.
create index if not exists expenses_is_reminder_idx
  on public.expenses (is_reminder)
  where is_reminder = true;
