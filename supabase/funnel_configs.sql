create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists "admins can read their own access" on public.admin_users;
create policy "admins can read their own access"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid() and enabled = true);
insert into public.admin_users (user_id, email, role, enabled)
select id, email, 'owner', true from auth.users
where lower(email) = lower('phuongtung477.tn@gmail.com')
on conflict (user_id) do update set email = excluded.email, role = 'owner', enabled = true;

create or replace function public.is_funnel_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and enabled = true
      and role in ('admin', 'owner')
  );
$$;
revoke all on function public.is_funnel_admin() from public;
grant execute on function public.is_funnel_admin() to authenticated;

create or replace function public.upsert_funnel_analytics(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_funnel_admin() then
    raise exception 'admin access required';
  end if;
  insert into public.funnel_analytics (id, data, updated_at)
  values (1, p_data, now())
  on conflict (id) do update
    set data = excluded.data, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.upsert_funnel_analytics(jsonb) from public;
grant execute on function public.upsert_funnel_analytics(jsonb) to authenticated;

create or replace function public.reset_funnel_analytics()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_funnel_admin() then raise exception 'admin access required'; end if;
  -- Chỉ reset số liệu lượt truy cập, KHÔNG đụng tới bảng leads (CRM); muốn xóa lead hãy dùng clear_funnel_leads().
  delete from public.visitor_sessions where true;
  insert into public.funnel_analytics (id, data, updated_at)
  values (1, '{"visits":0,"leads":0,"bySource":{},"bySourceStats":{},"byVariant":{}}'::jsonb, now())
  on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.reset_funnel_analytics() from public;
grant execute on function public.reset_funnel_analytics() to authenticated;

create or replace function public.clear_funnel_leads()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_funnel_admin() then raise exception 'admin access required'; end if;
  delete from public.leads where true;
end;
$$;
revoke all on function public.clear_funnel_leads() from public;
grant execute on function public.clear_funnel_leads() to authenticated;

create table if not exists public.funnel_configs (
  id bigint primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Public submit can decrement the counter without exposing the full config.
-- The function performs the read/modify/write atomically under SECURITY DEFINER.
create or replace function public.decrement_countdown_slot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_data jsonb;
  current_slots integer;
  next_data jsonb;
begin
  select data into current_data
  from public.funnel_configs
  where id = 1
  for update;

  if current_data is null then
    return jsonb_build_object('ok', false, 'reason', 'config_missing');
  end if;

  current_slots := greatest(0, coalesce((current_data #>> '{countdown,slotsLeft}')::integer, 0));
  next_data := jsonb_set(
    current_data,
    '{countdown,slotsLeft}',
    to_jsonb(greatest(0, current_slots - 1)),
    true
  );
  update public.funnel_configs
  set data = next_data, updated_at = now()
  where id = 1;
  return jsonb_build_object('ok', true, 'slotsLeft', greatest(0, current_slots - 1));
end;
$$;

revoke all on function public.decrement_countdown_slot() from public;
grant execute on function public.decrement_countdown_slot() to anon, authenticated;
alter table public.funnel_configs enable row level security;
drop policy if exists "funnel configs can be read" on public.funnel_configs;
create policy "funnel configs can be read" on public.funnel_configs for select using (true);
drop policy if exists "funnel configs can be written" on public.funnel_configs;
drop policy if exists "funnel configs can be updated" on public.funnel_configs;
create policy "funnel configs can be written" on public.funnel_configs for insert to authenticated
  with check (id = 1 and public.is_funnel_admin());
create policy "funnel configs can be updated" on public.funnel_configs for update to authenticated
  using (id = 1 and public.is_funnel_admin())
  with check (id = 1 and public.is_funnel_admin());

create table if not exists public.funnel_analytics (
  id bigint primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.funnel_analytics enable row level security;
drop policy if exists "funnel analytics can be read" on public.funnel_analytics;
create policy "funnel analytics can be read" on public.funnel_analytics for select to authenticated;
drop policy if exists "funnel analytics can be written" on public.funnel_analytics;
drop policy if exists "funnel analytics can be updated" on public.funnel_analytics;
create policy "funnel analytics can be written" on public.funnel_analytics for insert to authenticated
  with check (id = 1 and public.is_funnel_admin());
create policy "funnel analytics can be updated" on public.funnel_analytics for update to authenticated
  using (id = 1 and public.is_funnel_admin())
  with check (id = 1 and public.is_funnel_admin());

update public.funnel_configs set data = data #- '{admin,password}' where id = 1;
