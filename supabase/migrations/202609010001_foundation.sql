-- Met Nisa — Sprint 0 Foundation
-- Supabase PostgreSQL / Auth / RBAC baseline

create type public.app_role as enum ('OWNER', 'ADMIN', 'CULTURE_REVIEWER', 'EDITOR', 'OPS', 'VIEWER');
create type public.profile_status as enum ('ACTIVE', 'SUSPENDED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.app_role not null default 'VIEWER',
  status public.profile_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at before update on public.app_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and status = 'ACTIVE' limit 1;
$$;

grant execute on function public.current_app_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self_or_staff"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() in ('OWNER', 'ADMIN', 'CULTURE_REVIEWER', 'EDITOR', 'OPS')
);

create policy "profiles_manage_admin"
on public.profiles for update
to authenticated
using (public.current_app_role() in ('OWNER', 'ADMIN'))
with check (public.current_app_role() in ('OWNER', 'ADMIN'));

create policy "settings_admin_select"
on public.app_settings for select
to authenticated
using (public.current_app_role() in ('OWNER', 'ADMIN'));

create policy "settings_admin_insert"
on public.app_settings for insert
to authenticated
with check (public.current_app_role() in ('OWNER', 'ADMIN'));

create policy "settings_admin_update"
on public.app_settings for update
to authenticated
using (public.current_app_role() in ('OWNER', 'ADMIN'))
with check (public.current_app_role() in ('OWNER', 'ADMIN'));

create policy "audit_staff_insert"
on public.audit_logs for insert
to authenticated
with check (actor_id = auth.uid());

create policy "audit_admin_select"
on public.audit_logs for select
to authenticated
using (public.current_app_role() in ('OWNER', 'ADMIN'));

insert into public.app_settings (key, value, description)
values
  ('brand', '{"name":"Met Nisa","tagline":"Moris in you."}'::jsonb, 'Canonical brand identity'),
  ('foundation', '{"version":1,"sprint":0}'::jsonb, 'Application foundation version');

comment on table public.profiles is 'Met Nisa Studio identities and RBAC roles.';
comment on table public.app_settings is 'Server-managed application configuration. Never store secrets here.';
comment on table public.audit_logs is 'Append-only business audit trail for sensitive Studio actions.';
