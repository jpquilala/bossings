-- ============================================================================
-- Database-level defaults for generated columns.
--
-- Prisma generates uuid() and @updatedAt in its client layer, so the columns
-- ship with no DEFAULT in Postgres. Any write that does not go through Prisma
-- — raw SQL, the Supabase dashboard, a supabase-js service-role client, or a
-- future Edge Function — then fails with a not-null violation.
--
-- These defaults make the schema self-sufficient. Prisma keeps supplying its
-- own values, so nothing about the app's behaviour changes.
-- ============================================================================

-- `gen_random_uuid()` ships with Postgres 13+ (pgcrypto is built in on Supabase).
alter table public.categories       alter column id set default gen_random_uuid();
alter table public.products         alter column id set default gen_random_uuid();
alter table public.product_variants alter column id set default gen_random_uuid();
alter table public.orders           alter column id set default gen_random_uuid();
alter table public.order_items      alter column id set default gen_random_uuid();

-- profiles.id is deliberately excluded: it must equal the auth.users id and is
-- always supplied explicitly, never generated.

-- Prisma's @updatedAt is client-side only; give it a default plus a trigger so
-- the column stays accurate no matter who writes the row.
alter table public.orders alter column updated_at set default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();
