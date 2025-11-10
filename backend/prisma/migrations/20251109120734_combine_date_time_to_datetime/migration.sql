-- Migration: Combine separate DATE and TIME columns into TIMESTAMP columns
-- This migration:
-- 1. Adds new TIMESTAMP columns
-- 2. Migrates existing data by combining date + time
-- 3. Drops old columns
-- 4. Updates indexes

-- ============================================
-- UmrahTravelDetails: Combine arrival_date + arrival_time -> arrival_datetime
-- ============================================

-- Add new arrival_datetime column
ALTER TABLE "umrah_travel_details" 
ADD COLUMN "arrival_datetime" TIMESTAMP(6);

-- Migrate existing data: combine arrival_date + arrival_time
UPDATE "umrah_travel_details"
SET "arrival_datetime" = (
  "arrival_date" + "arrival_time"
)
WHERE "arrival_date" IS NOT NULL AND "arrival_time" IS NOT NULL;

-- Set default for any NULL values (shouldn't happen, but safety check)
UPDATE "umrah_travel_details"
SET "arrival_datetime" = CURRENT_TIMESTAMP
WHERE "arrival_datetime" IS NULL;

-- Make column NOT NULL
ALTER TABLE "umrah_travel_details" 
ALTER COLUMN "arrival_datetime" SET NOT NULL;

-- ============================================
-- UmrahTravelDetails: Combine departure_date + departure_time -> departure_datetime
-- ============================================

-- Add new departure_datetime column
ALTER TABLE "umrah_travel_details" 
ADD COLUMN "departure_datetime" TIMESTAMP(6);

-- Migrate existing data: combine departure_date + departure_time
UPDATE "umrah_travel_details"
SET "departure_datetime" = (
  "departure_date" + "departure_time"
)
WHERE "departure_date" IS NOT NULL AND "departure_time" IS NOT NULL;

-- Set default for any NULL values (shouldn't happen, but safety check)
UPDATE "umrah_travel_details"
SET "departure_datetime" = CURRENT_TIMESTAMP
WHERE "departure_datetime" IS NULL;

-- Make column NOT NULL
ALTER TABLE "umrah_travel_details" 
ALTER COLUMN "departure_datetime" SET NOT NULL;

-- ============================================
-- UmrahTransportBooking: Combine travel_date + travel_time -> travel_datetime
-- ============================================

-- Add new travel_datetime column (nullable since travel_date and travel_time are nullable)
ALTER TABLE "umrah_transport_bookings" 
ADD COLUMN "travel_datetime" TIMESTAMP(6);

-- Migrate existing data: combine travel_date + travel_time
UPDATE "umrah_transport_bookings"
SET "travel_datetime" = (
  "travel_date" + "travel_time"
)
WHERE "travel_date" IS NOT NULL AND "travel_time" IS NOT NULL;

-- For records with only date (no time), set time to 00:00:00
UPDATE "umrah_transport_bookings"
SET "travel_datetime" = "travel_date"
WHERE "travel_date" IS NOT NULL AND "travel_time" IS NULL AND "travel_datetime" IS NULL;

-- ============================================
-- Drop old columns and update indexes
-- ============================================

-- Drop old indexes that reference the old columns
DROP INDEX IF EXISTS "umrah_travel_details_arrival_date_idx";
DROP INDEX IF EXISTS "umrah_travel_details_departure_date_idx";
DROP INDEX IF EXISTS "umrah_transport_bookings_travel_date_idx";

-- Drop old columns from umrah_travel_details
ALTER TABLE "umrah_travel_details" 
DROP COLUMN "arrival_date",
DROP COLUMN "arrival_time",
DROP COLUMN "departure_date",
DROP COLUMN "departure_time";

-- Drop old columns from umrah_transport_bookings
ALTER TABLE "umrah_transport_bookings" 
DROP COLUMN "travel_date",
DROP COLUMN "travel_time";

-- Create new indexes on datetime columns
CREATE INDEX "umrah_travel_details_arrival_datetime_idx" ON "umrah_travel_details"("arrival_datetime");
CREATE INDEX "umrah_travel_details_departure_datetime_idx" ON "umrah_travel_details"("departure_datetime");
CREATE INDEX "umrah_transport_bookings_travel_datetime_idx" ON "umrah_transport_bookings"("travel_datetime");
