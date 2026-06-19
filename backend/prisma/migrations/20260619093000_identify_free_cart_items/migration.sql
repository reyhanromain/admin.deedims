ALTER TABLE "cart_items" ADD COLUMN "is_free" BOOLEAN NOT NULL DEFAULT false;

-- Preserve free complements already present in carts before this column existed.
UPDATE "cart_items"
SET "is_free" = true
WHERE "item_type" = 'addon' AND "unit_price" = 0;
