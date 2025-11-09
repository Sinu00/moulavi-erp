/*
  Warnings:

  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceStatus` enum. If the enum is not empty, all the data it contains will be lost.
  - The `service_id` column on the `documents` table will be removed. If there are existing NULL values in that column, this will fail.
  - The `service_id` column on the `umrah_visa_bookings` table will be removed. If there are existing NULL values in that column, this will fail.

*/
-- Step 1: Add new columns to umrah_visa_bookings
ALTER TABLE "umrah_visa_bookings" ADD COLUMN "party_id" UUID;
ALTER TABLE "umrah_visa_bookings" ADD COLUMN "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Migrate data from services to umrah_visa_bookings
UPDATE "umrah_visa_bookings" 
SET 
  "party_id" = "services"."party_id",
  "submitted_at" = "services"."submitted_at"
FROM "services"
WHERE "umrah_visa_bookings"."service_id" = "services"."id";

-- Step 3: Make party_id NOT NULL after data migration
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "party_id" SET NOT NULL;

-- Step 4: Add booking_id column to documents
ALTER TABLE "documents" ADD COLUMN "booking_id" UUID;

-- Step 5: Migrate data from documents.service_id to documents.booking_id via umrah_visa_bookings
UPDATE "documents"
SET "booking_id" = "umrah_visa_bookings"."id"
FROM "umrah_visa_bookings"
WHERE "documents"."service_id" = "umrah_visa_bookings"."service_id";

-- Step 6: Make booking_id NOT NULL after data migration
ALTER TABLE "documents" ALTER COLUMN "booking_id" SET NOT NULL;

-- Step 7: Drop old foreign key constraints
ALTER TABLE "umrah_visa_bookings" DROP CONSTRAINT IF EXISTS "umrah_visa_bookings_service_id_fkey";
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_service_id_fkey";

-- Step 8: Drop old indexes
DROP INDEX IF EXISTS "umrah_visa_bookings_service_id_key";
DROP INDEX IF EXISTS "umrah_visa_bookings_service_id_idx";
DROP INDEX IF EXISTS "documents_service_id_idx";

-- Step 9: Drop old columns
ALTER TABLE "umrah_visa_bookings" DROP COLUMN "service_id";
ALTER TABLE "documents" DROP COLUMN "service_id";

-- Step 10: Add new foreign key constraints
ALTER TABLE "umrah_visa_bookings" ADD CONSTRAINT "umrah_visa_bookings_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Create new indexes
CREATE INDEX "umrah_visa_bookings_party_id_idx" ON "umrah_visa_bookings"("party_id");
CREATE INDEX "umrah_visa_bookings_submitted_at_idx" ON "umrah_visa_bookings"("submitted_at");
CREATE INDEX "documents_booking_id_idx" ON "documents"("booking_id");

-- Step 12: Drop the services table
DROP TABLE IF EXISTS "services";

-- Step 13: Drop the ServiceStatus enum
DROP TYPE IF EXISTS "ServiceStatus";


