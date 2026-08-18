-- ============================================================================
-- Bossing's Flying Saucer — Row Level Security
--
-- Run AFTER `prisma migrate deploy` has created the tables.
--   supabase db push          (or paste into the SQL editor)
--
-- Model:
--   * Menu data is world-readable, but only STAFF/ADMIN may write it.
--   * A customer sees only their own profile and their own orders.
--   * Guest orders carry user_id IS NULL and are written exclusively by the
--     server with the service role key, which bypasses RLS. No anon INSERT
--     policy exists on `orders`, so the browser can never create one directly.
-- ============================================================================

-- ── Helper: is the current user staff or admin? ─────────────────────────────
-- SECURITY DEFINER lets the function read `profiles` without recursing through
-- the very policies that call it. search_path is pinned to defeat hijacking.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('STAFF', 'ADMIN')
  );
$$;

revoke execute on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated, anon;

-- ── Enable RLS everywhere ───────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;

-- Force RLS for table owners too, so nothing slips through outside the
-- service role (which bypasses RLS by design).
alter table public.profiles          force row level security;
alter table public.orders            force row level security;
alter table public.order_items       force row level security;

-- ============================================================================
-- profiles — a user reads and updates only their own row
-- ============================================================================
drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_select_staff" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Privilege escalation guard. A WITH CHECK subquery on `profiles` would
-- recurse through this very policy, so the role is pinned by a trigger
-- instead: a non-staff user's UPDATE silently keeps their existing role.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The service role and staff may legitimately change roles.
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if new.role is distinct from old.role then
    new.role := old.role;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_role_escalation();

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id and role = 'CUSTOMER');

-- Staff need to see customer names/phones attached to orders.
create policy "profiles_select_staff"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

-- ============================================================================
-- categories — public read, staff write
-- ============================================================================
drop policy if exists "categories_select_public" on public.categories;
drop policy if exists "categories_write_staff"   on public.categories;

create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "categories_write_staff"
  on public.categories for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- products — public read of AVAILABLE rows only, staff read/write everything
-- ============================================================================
drop policy if exists "products_select_available" on public.products;
drop policy if exists "products_select_staff"     on public.products;
drop policy if exists "products_write_staff"      on public.products;

create policy "products_select_available"
  on public.products for select
  to anon, authenticated
  using (is_available = true);

create policy "products_select_staff"
  on public.products for select
  to authenticated
  using (public.is_staff());

create policy "products_write_staff"
  on public.products for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- product_variants — visible when the parent product is visible
-- ============================================================================
drop policy if exists "variants_select_available" on public.product_variants;
drop policy if exists "variants_select_staff"     on public.product_variants;
drop policy if exists "variants_write_staff"      on public.product_variants;

create policy "variants_select_available"
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.is_available = true
    )
  );

create policy "variants_select_staff"
  on public.product_variants for select
  to authenticated
  using (public.is_staff());

create policy "variants_write_staff"
  on public.product_variants for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- orders — a customer sees only their own; staff see and update all
--
-- Note: there is deliberately NO insert policy. Orders (guest and customer
-- alike) are created by a Server Action using the service role key, which
-- bypasses RLS. This keeps price calculation server-side and un-forgeable.
-- ============================================================================
drop policy if exists "orders_select_own"    on public.orders;
drop policy if exists "orders_select_staff"  on public.orders;
drop policy if exists "orders_update_staff"  on public.orders;
drop policy if exists "orders_delete_staff"  on public.orders;

create policy "orders_select_own"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "orders_select_staff"
  on public.orders for select
  to authenticated
  using (public.is_staff());

create policy "orders_update_staff"
  on public.orders for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "orders_delete_staff"
  on public.orders for delete
  to authenticated
  using (public.is_staff());

-- ============================================================================
-- order_items — follow the visibility of the parent order
-- ============================================================================
drop policy if exists "order_items_select_own"   on public.order_items;
drop policy if exists "order_items_select_staff" on public.order_items;
drop policy if exists "order_items_write_staff"  on public.order_items;

create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "order_items_select_staff"
  on public.order_items for select
  to authenticated
  using (public.is_staff());

create policy "order_items_write_staff"
  on public.order_items for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- Storage: the public "products" bucket
--   public read, writes limited to STAFF and ADMIN
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "products_bucket_read"   on storage.objects;
drop policy if exists "products_bucket_insert" on storage.objects;
drop policy if exists "products_bucket_update" on storage.objects;
drop policy if exists "products_bucket_delete" on storage.objects;

create policy "products_bucket_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'products');

create policy "products_bucket_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_staff());

create policy "products_bucket_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products' and public.is_staff())
  with check (bucket_id = 'products' and public.is_staff());

create policy "products_bucket_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products' and public.is_staff());
