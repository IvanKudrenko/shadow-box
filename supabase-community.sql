create extension if not exists pgcrypto;

create table if not exists public.community_levels (
  id uuid primary key default gen_random_uuid(),
  level_id text not null,
  name text not null,
  author text not null default 'Player',
  difficulty text not null default 'Community',
  description text not null default '',
  level jsonb not null,
  owner_key text not null,
  created_at timestamptz not null default now()
);

alter table public.community_levels enable row level security;

drop policy if exists "community levels are readable" on public.community_levels;
drop policy if exists "community levels can be submitted" on public.community_levels;

create policy "community levels are readable"
  on public.community_levels
  for select
  to anon
  using (true);

create policy "community levels can be submitted"
  on public.community_levels
  for insert
  to anon
  with check (
    jsonb_typeof(level) = 'object'
    and char_length(name) between 1 and 40
    and char_length(owner_key) >= 16
  );

revoke all on public.community_levels from anon, authenticated;
grant select (id, level_id, name, author, difficulty, description, level, created_at)
  on public.community_levels to anon;
grant insert (level_id, name, author, difficulty, description, level, owner_key)
  on public.community_levels to anon;

create or replace function public.delete_community_level(p_id uuid, p_owner_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.community_levels
  where id = p_id
    and owner_key = p_owner_key;
end;
$$;

revoke all on function public.delete_community_level(uuid, text) from public;
grant execute on function public.delete_community_level(uuid, text) to anon;
