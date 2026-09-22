create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  phone text,
  email text,
  city text,
  major text,
  ai_score int,
  ai_rank text,
  risk_level text,
  risk_reasons text[],
  recommended_action text,
  behavior_summary text,
  sale_advice text,
  sale_assigned_to text,
  sales_email_recipients text,
  sales_distribution_mode text,
  sales_distribution_weights jsonb,
  sales_send_webhook boolean,
  device_tech_info text,
  traffic_ads_source text,
  network_provider text,
  network_label text,
  current_session int,
  visits_today int,
  visits_month int,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  ttclid text,
  gclid text,
  raw_query text,
  referrer text,
  attribution_model text,
  attribution_detected_by text,
  utm_params jsonb,
  variant text,
  landing_url text,
  device_manufacturer text,
  device_family text,
  device_model text,
  operating_system text,
  browser text,
  visitor_behavior_payload jsonb
);

alter table public.leads add column if not exists sale_assigned_to text;
alter table public.leads add column if not exists sales_email_recipients text;
alter table public.leads add column if not exists sales_distribution_mode text;
alter table public.leads add column if not exists sales_distribution_weights jsonb;
alter table public.leads add column if not exists sales_send_webhook boolean;

alter table public.leads enable row level security;
drop policy if exists "leads can be created by public form" on public.leads;
create policy "leads can be created by public form"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- The public form uses the publishable Supabase key when the Vercel server
-- function is unavailable. Keep this policy explicit so a fresh project does
-- not silently reject CRM inserts with SQLSTATE 42501.
grant insert on table public.leads to anon, authenticated;

drop policy if exists "admins can read leads" on public.leads;
create policy "admins can read leads"
  on public.leads for select
  to authenticated
  using (true);

-- Cho phép khách (anon) kiểm tra trùng số điện thoại trong 24h mà không lộ
-- dữ liệu lead nào; chỉ trả về true/false qua SECURITY DEFINER, bỏ qua RLS
-- SELECT (vốn chỉ dành cho authenticated) một cách có kiểm soát.
create or replace function public.check_duplicate_lead(p_phone text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads
    where phone = p_phone
      and created_at > now() - interval '24 hours'
  );
$$;

revoke all on function public.check_duplicate_lead(text) from public;
grant execute on function public.check_duplicate_lead(text) to anon, authenticated;
