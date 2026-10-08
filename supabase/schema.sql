-- AlgoSolveo database schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1. User profiles (one row per user, created automatically on sign-up)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'pass')),
  plan_expires_at timestamptz,
  hints_today int not null default 0,
  hints_reset_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- 2. Solved problems on the roadmap
create table if not exists public.progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  problem_slug text not null,
  solved_at timestamptz not null default now(),
  primary key (user_id, problem_slug)
);

-- 3. Row level security: users can only see their own rows
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
-- No update policy on purpose: users must never change their own plan or hint count.

drop policy if exists "manage own progress" on public.progress;
create policy "manage own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Atomically use one hint. Returns whether it's allowed and how many are left.
--    Only the server (service role) can call this.
create or replace function public.consume_hint(p_user uuid, p_free_limit int default 5)
returns table (allowed boolean, plan text, hints_left int)
language plpgsql security definer set search_path = public as $$
declare
  prof public.profiles%rowtype;
  is_paid boolean;
begin
  select * into prof from public.profiles where id = p_user for update;
  if not found then
    insert into public.profiles (id) values (p_user) returning * into prof;
  end if;

  -- New day: reset the counter
  if prof.hints_reset_at < current_date then
    update public.profiles set hints_today = 0, hints_reset_at = current_date where id = p_user;
    prof.hints_today := 0;
  end if;

  is_paid := prof.plan in ('pro', 'pass')
             and (prof.plan_expires_at is null or prof.plan_expires_at > now());

  if not is_paid and prof.hints_today >= p_free_limit then
    return query select false, 'free'::text, 0;
    return;
  end if;

  update public.profiles set hints_today = hints_today + 1 where id = p_user;

  return query select
    true,
    case when is_paid then prof.plan else 'free' end,
    case when is_paid then -1 else p_free_limit - prof.hints_today - 1 end;
end;
$$;

revoke all on function public.consume_hint(uuid, int) from public, anon, authenticated;
