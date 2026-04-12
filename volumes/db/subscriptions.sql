-- Auto-run on first `docker compose up` (mounted via docker-entrypoint-initdb.d).
-- Safe to run multiple times (idempotent).

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;

-- Allow users to read their own subscription
do $$ begin
  create policy "Users can view own subscription"
    on public.subscriptions for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
