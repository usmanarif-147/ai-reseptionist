-- imp03: Appointments table for tracking bookings
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  customer_name text not null,
  service_id uuid references public.services(id) on delete set null,
  appointment_date timestamptz not null,
  payment_method text not null check (payment_method in ('cash_on_arrival', 'paid_cash', 'paid_online')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Business owner manages appointments"
  on public.appointments for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );
