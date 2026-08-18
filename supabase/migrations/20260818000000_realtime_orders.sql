-- ============================================================================
-- Realtime for the kitchen queue.
--
-- Adds `orders` to the supabase_realtime publication so /admin receives
-- INSERT and UPDATE events the moment a customer places or a staff member
-- advances an order, instead of waiting for a manual page reload.
--
-- RLS still applies to realtime payloads: only STAFF/ADMIN can select orders,
-- so a customer subscribing to this channel receives nothing.
-- ============================================================================

-- REPLICA IDENTITY FULL makes the previous row available on UPDATE events.
-- Without it, updates arrive with only the primary key populated.
alter table public.orders replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;
