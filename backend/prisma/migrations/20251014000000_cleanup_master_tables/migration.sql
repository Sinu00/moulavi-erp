-- Migration: Clean up master tables and simplify structure
-- Remove unnecessary masters: CountryMaster, UserRoleMaster, AirportRouteMaster
-- Simplify: HotelMaster, DestinationMaster
-- Add: hasGroupNumber field to UmrahVisaBooking
-- Update: TransportMaster pax field to paxCount
-- Update: UmrahTransportBooking transportType to vehicleType
-- Make departure flight details required in UmrahTravelDetails

-- Step 1: Drop unnecessary master tables
DROP TABLE IF EXISTS "country_masters" CASCADE;
DROP TABLE IF EXISTS "user_role_masters" CASCADE;
DROP TABLE IF EXISTS "airport_route_masters" CASCADE;

-- Step 2: Add hasGroupNumber to UmrahVisaBooking
ALTER TABLE "umrah_visa_bookings" ADD COLUMN IF NOT EXISTS "has_group_number" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "umrah_visa_bookings_has_group_number_idx" ON "umrah_visa_bookings"("has_group_number");

-- Step 3: Update TransportMaster - rename pax to paxCount
ALTER TABLE "transport_masters" RENAME COLUMN "pax" TO "pax_count";
DROP INDEX IF EXISTS "transport_masters_from_location_id_to_location_id_vehicle__key";
CREATE UNIQUE INDEX "transport_masters_from_location_id_to_location_id_vehicle__key" ON "transport_masters"("from_location_id", "to_location_id", "vehicle_type", "pax_count");
CREATE INDEX IF NOT EXISTS "transport_masters_pax_count_idx" ON "transport_masters"("pax_count");

-- Step 4: Simplify HotelMaster - remove unnecessary columns
ALTER TABLE "hotel_masters" DROP COLUMN IF EXISTS "category" CASCADE;
ALTER TABLE "hotel_masters" DROP COLUMN IF EXISTS "capacity" CASCADE;
ALTER TABLE "hotel_masters" DROP COLUMN IF EXISTS "amenities" CASCADE;
ALTER TABLE "hotel_masters" DROP COLUMN IF EXISTS "description" CASCADE;

-- Rename destinationId to locationId in hotel_masters
ALTER TABLE "hotel_masters" RENAME COLUMN "destination_id" TO "location_id";
DROP INDEX IF EXISTS "hotel_masters_destination_id_idx";
DROP INDEX IF EXISTS "hotel_masters_category_idx";
CREATE INDEX IF NOT EXISTS "hotel_masters_location_id_idx" ON "hotel_masters"("location_id");

-- Step 5: Simplify DestinationMaster - remove description, set default country
ALTER TABLE "destination_masters" DROP COLUMN IF EXISTS "description" CASCADE;
ALTER TABLE "destination_masters" ALTER COLUMN "country" SET DEFAULT 'Saudi Arabia';

-- Step 6: Update AirportMaster - set default country
ALTER TABLE "airport_masters" ALTER COLUMN "country" SET DEFAULT 'Saudi Arabia';

-- Step 7: Update UmrahTravelDetails - make departure details required
ALTER TABLE "umrah_travel_details" ALTER COLUMN "departure_airport_id" SET NOT NULL;
ALTER TABLE "umrah_travel_details" ALTER COLUMN "departure_flight_number" SET NOT NULL;

-- Step 8: Update UmrahTransportBooking - rename transportType to vehicleType, make price required
ALTER TABLE "umrah_transport_bookings" RENAME COLUMN "transport_type" TO "vehicle_type";
ALTER TABLE "umrah_transport_bookings" ALTER COLUMN "price" SET NOT NULL;
DROP INDEX IF EXISTS "umrah_transport_bookings_transport_type_idx";
CREATE INDEX IF NOT EXISTS "umrah_transport_bookings_vehicle_type_idx" ON "umrah_transport_bookings"("vehicle_type");

-- Step 9: Remove roomCount and guestCount from UmrahHotelBooking
ALTER TABLE "umrah_hotel_bookings" DROP COLUMN IF EXISTS "room_count" CASCADE;
ALTER TABLE "umrah_hotel_bookings" DROP COLUMN IF EXISTS "guest_count" CASCADE;

-- Step 10: Update TransportPricing (legacy table) - can be removed if not used
-- This table seems redundant with TransportMaster
-- Keeping for now but marking for potential removal

