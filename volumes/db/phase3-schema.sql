-- Phase 3: Business Dashboard Schema
-- Auto-run on first `docker compose up` (mounted via docker-entrypoint-initdb.d).
-- Safe to run multiple times (idempotent).

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.businesses (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null,
  contact text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_owner unique(owner_id)
);

create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  duration_minutes integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.business_hours (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_business_day unique(business_id, day_of_week)
);

create table if not exists public.staff (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  role text not null,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.widget_settings (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null unique,
  color text default '#2563eb',
  welcome_message text default 'How can we help you today?',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payment_settings (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null unique,
  payment_type text not null check (payment_type in ('cash', 'online')),
  stripe_publishable_key text,
  stripe_secret_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- businesses
alter table public.businesses enable row level security;

do $$ begin
  create policy "Users can view own business"
    on public.businesses for select
    using (auth.uid() = owner_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own business"
    on public.businesses for update
    using (auth.uid() = owner_id);
exception when duplicate_object then null;
end $$;

-- services
alter table public.services enable row level security;

do $$ begin
  create policy "Users can view own business services"
    on public.services for select
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own business services"
    on public.services for insert
    with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own business services"
    on public.services for update
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete own business services"
    on public.services for delete
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

-- business_hours
alter table public.business_hours enable row level security;

do $$ begin
  create policy "Users can view own business hours"
    on public.business_hours for select
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own business hours"
    on public.business_hours for insert
    with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own business hours"
    on public.business_hours for update
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete own business hours"
    on public.business_hours for delete
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

-- staff
alter table public.staff enable row level security;

do $$ begin
  create policy "Users can view own business staff"
    on public.staff for select
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own business staff"
    on public.staff for insert
    with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own business staff"
    on public.staff for update
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete own business staff"
    on public.staff for delete
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

-- widget_settings
alter table public.widget_settings enable row level security;

do $$ begin
  create policy "Users can view own widget settings"
    on public.widget_settings for select
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own widget settings"
    on public.widget_settings for insert
    with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own widget settings"
    on public.widget_settings for update
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

-- payment_settings
alter table public.payment_settings enable row level security;

do $$ begin
  create policy "Users can view own payment settings"
    on public.payment_settings for select
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own payment settings"
    on public.payment_settings for insert
    with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own payment settings"
    on public.payment_settings for update
    using (business_id in (select id from public.businesses where owner_id = auth.uid()));
exception when duplicate_object then null;
end $$;
