/*
  Warnings:

  - You are about to drop the `airport_masters` table. If the table is not empty, all the data it contains will be lost.

*/

-- Step 1: Migrate airport data from airport_masters to location_masters if not already exists
-- (Most airports should already be in location_masters from seeding, but we ensure data consistency)
INSERT INTO "location_masters" (
  "id",
  "code",
  "name",
  "location_type",
  "country_id",
  "city",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT 
  am.id,
  am.airport_code,
  am.airport_name,
  'AIRPORT'::"LocationType",
  cm.id,
  am.city,
  am.is_active,
  am.created_at,
  am.updated_at
FROM "airport_masters" am
LEFT JOIN "country_masters" cm ON cm.country_name = am.country OR (am.country = 'Saudi Arabia' AND cm.country_code = 'SAU')
WHERE NOT EXISTS (
  SELECT 1 FROM "location_masters" lm 
  WHERE lm.code = am.airport_code AND lm.location_type = 'AIRPORT'
)
ON CONFLICT DO NOTHING;

-- Step 2: Create mapping table for airport IDs (airport_masters.id -> location_masters.id)
-- Update foreign keys in umrah_travel_details to use location_masters IDs
UPDATE "umrah_travel_details" utd
SET "arrival_airport_id" = lm.id
FROM "airport_masters" am
INNER JOIN "location_masters" lm ON lm.code = am.airport_code AND lm.location_type = 'AIRPORT'
WHERE utd.arrival_airport_id = am.id
  AND utd.arrival_airport_id != lm.id;

UPDATE "umrah_travel_details" utd
SET "departure_airport_id" = lm.id
FROM "airport_masters" am
INNER JOIN "location_masters" lm ON lm.code = am.airport_code AND lm.location_type = 'AIRPORT'
WHERE utd.departure_airport_id = am.id
  AND utd.departure_airport_id != lm.id;

-- Step 3: Drop foreign key constraints
ALTER TABLE "public"."umrah_travel_details" DROP CONSTRAINT IF EXISTS "umrah_travel_details_arrival_airport_id_fkey";
ALTER TABLE "public"."umrah_travel_details" DROP CONSTRAINT IF EXISTS "umrah_travel_details_departure_airport_id_fkey";

-- Step 4: Drop the airport_masters table
DROP TABLE IF EXISTS "public"."airport_masters";

-- Step 5: Add new foreign key constraints to location_masters
ALTER TABLE "umrah_travel_details" ADD CONSTRAINT "umrah_travel_details_arrival_airport_id_fkey" 
  FOREIGN KEY ("arrival_airport_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "umrah_travel_details" ADD CONSTRAINT "umrah_travel_details_departure_airport_id_fkey" 
  FOREIGN KEY ("departure_airport_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
