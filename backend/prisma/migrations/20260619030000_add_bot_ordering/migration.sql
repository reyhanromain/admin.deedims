-- CreateTable
CREATE TABLE "cart_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_user_id" BIGINT NOT NULL,
    "parent_cart_item_id" INTEGER,
    "item_type" TEXT NOT NULL DEFAULT 'main',
    "menu_id" INTEGER NOT NULL,
    "menu_variant_id" INTEGER NOT NULL,
    "menu_name_snapshot" TEXT NOT NULL,
    "variant_name_snapshot" TEXT,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pre_order_reminder_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pre_order_id" INTEGER NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error_message" TEXT,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "order_item_stock_usages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_item_id" INTEGER NOT NULL,
    "stock_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL
);

CREATE INDEX "cart_items_telegram_user_id_idx" ON "cart_items"("telegram_user_id");
CREATE INDEX "cart_items_parent_cart_item_id_idx" ON "cart_items"("parent_cart_item_id");
CREATE INDEX "cart_items_menu_id_idx" ON "cart_items"("menu_id");
CREATE INDEX "cart_items_menu_variant_id_idx" ON "cart_items"("menu_variant_id");
CREATE UNIQUE INDEX "pre_order_reminder_logs_pre_order_id_telegram_user_id_key" ON "pre_order_reminder_logs"("pre_order_id", "telegram_user_id");
CREATE INDEX "pre_order_reminder_logs_telegram_user_id_idx" ON "pre_order_reminder_logs"("telegram_user_id");
CREATE INDEX "order_item_stock_usages_order_item_id_idx" ON "order_item_stock_usages"("order_item_id");
CREATE INDEX "order_item_stock_usages_stock_item_id_idx" ON "order_item_stock_usages"("stock_item_id");
