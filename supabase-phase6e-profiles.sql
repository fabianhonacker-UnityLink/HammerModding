-- Hammer Modding · Phase 6E Profiles & Rollen
-- Diesen Block komplett im Supabase SQL Editor ausführen.

create schema if not exists public;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text not null default '',
  discord_name text not null default '',
  cfx_identifier text not null default '',
  avatar_url text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin', 'product_manager')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  last_seen_at timestamptz,
  last_purchase_at timestamptz,
  last_purchase_label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, discord_name, cfx_identifier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), ''),
    coalesce(new.raw_user_meta_data ->> 'discord_name', ''),
    coalesce(new.raw_user_meta_data ->> 'cfx_identifier', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(nullif(excluded.username, ''), public.profiles.username),
    discord_name = coalesce(nullif(excluded.discord_name, ''), public.profiles.discord_name),
    cfx_identifier = coalesce(nullif(excluded.cfx_identifier, ''), public.profiles.cfx_identifier),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, username)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_select on public.profiles
  for select
  using (auth.uid() = id or public.current_app_role() in ('admin', 'product_manager'));

create policy profiles_self_insert on public.profiles
  for insert
  with check (auth.uid() = id or public.current_app_role() in ('admin', 'product_manager'));

create policy profiles_self_update on public.profiles
  for update
  using (auth.uid() = id or public.current_app_role() in ('admin', 'product_manager'))
  with check (auth.uid() = id or public.current_app_role() in ('admin', 'product_manager'));

create or replace trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
