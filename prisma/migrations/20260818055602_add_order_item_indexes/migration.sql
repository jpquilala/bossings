-- OrderItem.productId / variantId are foreign keys, which Postgres does not
-- index automatically. The admin sellers report groups by both, so without
-- these it sequential-scans order_items.
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items"("product_id");
CREATE INDEX IF NOT EXISTS "order_items_variant_id_idx" ON "order_items"("variant_id");
