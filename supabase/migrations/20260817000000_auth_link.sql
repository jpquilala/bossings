-- ============================================================================
-- Links public.profiles to Supabase's auth.users.
--
-- Prisma cannot express a foreign key into the `auth` schema (it does not
-- manage it), so the constraint is added here instead. Run this AFTER
-- `prisma migrate deploy` and BEFORE the RLS policy migration.
-- ============================================================================

-- ── profiles.id must reference a real auth user ─────────────────────────────
-- Deleting the auth user removes the profile; orders keep their snapshots and
-- fall back to user_id = NULL (the same shape as a guest order).
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id)
  on delete cascade;

-- ── Create a profile automatically on sign-up ───────────────────────────────
-- The app also upserts the profile in /auth/callback, but doing it here means
-- a row exists even if that request never completes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
