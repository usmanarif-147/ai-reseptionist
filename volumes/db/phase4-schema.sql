-- Phase 4: Chat Widget Schema
-- Safe to run multiple times (idempotent).

-- ============================================================
-- TABLES
-- ============================================================

-- chat_sessions: one per visitor/widget load
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- chat_messages: individual turns
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- chat_sessions
alter table public.chat_sessions enable row level security;

-- Allow service_role full access (widget API uses admin client).
-- No user-facing RLS policies needed since visitors don't authenticate.

-- chat_messages
alter table public.chat_messages enable row level security;
