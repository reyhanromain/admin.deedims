ALTER TABLE "settings" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "settings" ADD COLUMN "placeholders" TEXT;
UPDATE "settings" SET "category" = 'bot_messages_start' WHERE "label" = 'start_quick_intro';
UPDATE "settings" SET "category" = 'pagination' WHERE "label" IN ('order_menu_page_size', 'cart_edit_page_size', 'my_orders_page_size');
