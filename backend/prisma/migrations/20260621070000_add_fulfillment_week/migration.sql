ALTER TABLE "pre_orders" ADD COLUMN "fulfillment_start_date" DATETIME;
ALTER TABLE "pre_orders" ADD COLUMN "fulfillment_end_date" DATETIME;

UPDATE "pre_orders"
SET
  "fulfillment_start_date" = (
    strftime(
      '%s',
      date(
        datetime("fulfillment_date" / 1000, 'unixepoch', '+7 hours'),
        printf('-%d days', (CAST(strftime('%w', "fulfillment_date" / 1000, 'unixepoch', '+7 hours') AS INTEGER) + 6) % 7)
      ),
      '-7 hours'
    ) * 1000
  ),
  "fulfillment_end_date" = (
    strftime(
      '%s',
      date(
        datetime("fulfillment_date" / 1000, 'unixepoch', '+7 hours'),
        printf('-%d days', (CAST(strftime('%w', "fulfillment_date" / 1000, 'unixepoch', '+7 hours') AS INTEGER) + 6) % 7),
        '+4 days'
      ),
      '-7 hours'
    ) * 1000
  )
WHERE "fulfillment_date" IS NOT NULL;

ALTER TABLE "pre_orders" DROP COLUMN "fulfillment_date";
