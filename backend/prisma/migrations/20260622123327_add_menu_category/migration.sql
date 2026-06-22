-- AlterTable
ALTER TABLE "menus" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");
