-- AlterTable
-- Make booking_id nullable to support quick vouchers without bookings
ALTER TABLE "vouchers" ALTER COLUMN "booking_id" DROP NOT NULL;

-- Drop the unique constraint on booking_id since it can now be null
-- (PostgreSQL doesn't allow unique constraints with nulls in the same way)
-- We'll need to handle uniqueness differently - only enforce uniqueness when booking_id is not null
DROP INDEX IF EXISTS "vouchers_booking_id_key";

-- Create a partial unique index that only enforces uniqueness when booking_id is not null
CREATE UNIQUE INDEX "vouchers_booking_id_key" ON "vouchers"("booking_id") WHERE "booking_id" IS NOT NULL;

