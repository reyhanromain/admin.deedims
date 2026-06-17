-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_super" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_user_id" BIGINT,
    "username" TEXT,
    "name" TEXT,
    "joined_at" DATETIME,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" DATETIME,
    "blocked_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "order_cancellation_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" INTEGER,
    "reviewed_at" DATETIME
);

-- CreateTable
CREATE TABLE "bot_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_message_id" BIGINT,
    "telegram_chat_id" BIGINT NOT NULL,
    "telegram_user_id" BIGINT,
    "direction" TEXT NOT NULL DEFAULT 'incoming',
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "text" TEXT,
    "telegram_username" TEXT,
    "customer_name" TEXT,
    "is_command" BOOLEAN NOT NULL DEFAULT false,
    "command" TEXT,
    "intent" TEXT,
    "telegram_file_id" TEXT,
    "raw_payload" TEXT,
    "customer_id" INTEGER,
    "order_id" INTEGER,
    "pre_order_id" INTEGER,
    "telegram_date" DATETIME,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "menus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_price" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "telegram_file_id" TEXT,
    "is_addon" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "menu_variants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menu_id" INTEGER NOT NULL,
    "name" TEXT,
    "price" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "menu_variant_stock_usages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menu_variant_id" INTEGER NOT NULL,
    "stock_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "menu_addons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menu_id" INTEGER NOT NULL,
    "addon_menu_id" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pre_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "opened_at" DATETIME,
    "closed_at" DATETIME,
    "fulfillment_date" DATETIME,
    "fulfillment_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_code" TEXT NOT NULL,
    "pre_order_id" INTEGER NOT NULL,
    "telegram_user_id" BIGINT,
    "telegram_username" TEXT,
    "customer_name" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'cod',
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "order_status" TEXT NOT NULL DEFAULT 'submitted',
    "subtotal_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "admin_notes" TEXT,
    "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" DATETIME,
    "confirmed_at" DATETIME,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "parent_order_item_id" INTEGER,
    "menu_id" INTEGER,
    "menu_variant_id" INTEGER,
    "menu_name_snapshot" TEXT NOT NULL,
    "variant_name_snapshot" TEXT,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pre_order_reminder_subscribers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_user_id" BIGINT NOT NULL,
    "telegram_username" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "unsubscribed_at" DATETIME
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "input_type" TEXT NOT NULL DEFAULT 'text',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "customers_telegram_user_id_key" ON "customers"("telegram_user_id");

-- CreateIndex
CREATE INDEX "customers_username_idx" ON "customers"("username");

-- CreateIndex
CREATE INDEX "customers_blocked_idx" ON "customers"("blocked");

-- CreateIndex
CREATE INDEX "customers_blocked_by_idx" ON "customers"("blocked_by");

-- CreateIndex
CREATE INDEX "order_cancellation_requests_order_id_idx" ON "order_cancellation_requests"("order_id");

-- CreateIndex
CREATE INDEX "order_cancellation_requests_status_idx" ON "order_cancellation_requests"("status");

-- CreateIndex
CREATE INDEX "order_cancellation_requests_reviewed_by_idx" ON "order_cancellation_requests"("reviewed_by");

-- CreateIndex
CREATE INDEX "bot_messages_telegram_user_id_idx" ON "bot_messages"("telegram_user_id");

-- CreateIndex
CREATE INDEX "bot_messages_telegram_chat_id_idx" ON "bot_messages"("telegram_chat_id");

-- CreateIndex
CREATE INDEX "bot_messages_customer_id_idx" ON "bot_messages"("customer_id");

-- CreateIndex
CREATE INDEX "bot_messages_order_id_idx" ON "bot_messages"("order_id");

-- CreateIndex
CREATE INDEX "bot_messages_pre_order_id_idx" ON "bot_messages"("pre_order_id");

-- CreateIndex
CREATE INDEX "bot_messages_direction_idx" ON "bot_messages"("direction");

-- CreateIndex
CREATE INDEX "bot_messages_received_at_idx" ON "bot_messages"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_label_key" ON "stock_items"("label");

-- CreateIndex
CREATE INDEX "stock_items_is_active_idx" ON "stock_items"("is_active");

-- CreateIndex
CREATE INDEX "menus_is_active_idx" ON "menus"("is_active");

-- CreateIndex
CREATE INDEX "menu_variants_menu_id_idx" ON "menu_variants"("menu_id");

-- CreateIndex
CREATE INDEX "menu_variants_is_active_idx" ON "menu_variants"("is_active");

-- CreateIndex
CREATE INDEX "menu_variant_stock_usages_menu_variant_id_idx" ON "menu_variant_stock_usages"("menu_variant_id");

-- CreateIndex
CREATE INDEX "menu_variant_stock_usages_stock_item_id_idx" ON "menu_variant_stock_usages"("stock_item_id");

-- CreateIndex
CREATE INDEX "menu_addons_menu_id_idx" ON "menu_addons"("menu_id");

-- CreateIndex
CREATE INDEX "menu_addons_addon_menu_id_idx" ON "menu_addons"("addon_menu_id");

-- CreateIndex
CREATE INDEX "pre_orders_status_idx" ON "pre_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "orders_pre_order_id_idx" ON "orders"("pre_order_id");

-- CreateIndex
CREATE INDEX "orders_telegram_user_id_idx" ON "orders"("telegram_user_id");

-- CreateIndex
CREATE INDEX "orders_order_status_idx" ON "orders"("order_status");

-- CreateIndex
CREATE INDEX "orders_updated_at_idx" ON "orders"("updated_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_parent_order_item_id_idx" ON "order_items"("parent_order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_order_reminder_subscribers_telegram_user_id_key" ON "pre_order_reminder_subscribers"("telegram_user_id");

-- CreateIndex
CREATE INDEX "pre_order_reminder_subscribers_is_active_idx" ON "pre_order_reminder_subscribers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "settings_label_key" ON "settings"("label");
