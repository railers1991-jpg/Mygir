-- Mygir database schema for Supabase (PostgreSQL).
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- Every row is owned by the authenticated user. Row Level Security (RLS)
-- guarantees a user can only ever read/write their own data.

-- ---------- Profiles (plan: free / pro) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  plan       text not null default 'free',
  created_at timestamptz not null default now()
);

-- ---------- Companies (фирмы) ----------
create table if not exists public.companies (
  id                uuid primary key default gen_random_uuid(),
  owner             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  tax_id            text,
  address           text,
  email             text,
  phone             text,
  logo              text,
  accent_color      text default '#2563eb',
  default_currency  text default 'USD',
  default_tax_label text default 'VAT',
  created_at        timestamptz not null default now()
);

-- ---------- Clients ----------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  details     text,
  created_at  timestamptz not null default now()
);

-- ---------- Invoices / quotes ----------
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id      uuid not null references public.companies (id) on delete cascade,
  doc_type        text not null default 'invoice',
  status          text not null default 'draft',
  number          text,
  client_name     text,
  client_details  text,
  currency        text default 'USD',
  issue_date      date,
  due_date        date,
  tax_label       text,
  discount_value  numeric default 0,
  discount_type   text default 'percent',
  notes           text,
  template        text default 'modern',
  accent_color    text,
  logo            text,
  items           jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists invoices_company_idx on public.invoices (company_id, updated_at desc);
create index if not exists clients_company_idx on public.clients (company_id);

-- ---------- Row Level Security ----------
alter table public.profiles  enable row level security;
alter table public.companies enable row level security;
alter table public.clients   enable row level security;
alter table public.invoices  enable row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists companies_owner_all on public.companies;
create policy companies_owner_all on public.companies
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists clients_owner_all on public.clients;
create policy clients_owner_all on public.clients
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists invoices_owner_all on public.invoices;
create policy invoices_owner_all on public.invoices
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
