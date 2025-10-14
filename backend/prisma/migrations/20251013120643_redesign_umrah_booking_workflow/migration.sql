/*
  Warnings:

  - You are about to drop the column `vehicle_route` on the `transport_masters` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `umrah_passengers` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `umrah_passengers` table. All the data in the column will be lost.
  - You are about to drop the column `nationality` on the `umrah_passengers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_expiry` on the `umrah_passengers` table. All the data in the column will be lost.
  - You are about to drop the column `passport_number` on the `umrah_passengers` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `umrah_passengers` table. All the data in the column will be lost.
  - You are about to drop the column `accommodation_type` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `arrival_airport` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `arrival_date` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `booking_mode` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `departure_date` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `flight_number` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `iqama_dob` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `iqama_mobile` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `iqama_name` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `iqama_number` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `madina_checkin` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `madina_checkout` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `makkah_checkin` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `makkah_checkout` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `transport_pax` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `transport_price` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `transport_route` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `transport_type` on the `umrah_visa_bookings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[from_location_id,to_location_id,vehicle_type,pax]` on the table `transport_masters` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `from_location_id` to the `transport_masters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_location_id` to the `transport_masters` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."transport_masters_vehicle_route_idx";

-- DropIndex
DROP INDEX "public"."transport_masters_vehicle_route_vehicle_type_pax_key";

-- DropIndex
DROP INDEX "public"."umrah_passengers_nationality_idx";

-- DropIndex
DROP INDEX "public"."umrah_passengers_passport_number_idx";

-- DropIndex
DROP INDEX "public"."umrah_visa_bookings_accommodation_type_idx";

-- DropIndex
DROP INDEX "public"."umrah_visa_bookings_arrival_date_idx";

-- DropIndex
DROP INDEX "public"."umrah_visa_bookings_booking_mode_idx";

-- DropIndex
DROP INDEX "public"."umrah_visa_bookings_departure_date_idx";

-- AlterTable
ALTER TABLE "transport_masters" DROP COLUMN "vehicle_route",
ADD COLUMN     "from_location_id" UUID NOT NULL,
ADD COLUMN     "to_location_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "umrah_passengers" DROP COLUMN "date_of_birth",
DROP COLUMN "gender",
DROP COLUMN "nationality",
DROP COLUMN "passport_expiry",
DROP COLUMN "passport_number",
DROP COLUMN "phone_number";

-- AlterTable
ALTER TABLE "umrah_visa_bookings" DROP COLUMN "accommodation_type",
DROP COLUMN "arrival_airport",
DROP COLUMN "arrival_date",
DROP COLUMN "booking_mode",
DROP COLUMN "departure_date",
DROP COLUMN "flight_number",
DROP COLUMN "iqama_dob",
DROP COLUMN "iqama_mobile",
DROP COLUMN "iqama_name",
DROP COLUMN "iqama_number",
DROP COLUMN "madina_checkin",
DROP COLUMN "madina_checkout",
DROP COLUMN "makkah_checkin",
DROP COLUMN "makkah_checkout",
DROP COLUMN "transport_pax",
DROP COLUMN "transport_price",
DROP COLUMN "transport_route",
DROP COLUMN "transport_type";

-- CreateTable
CREATE TABLE "airport_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "airport_code" VARCHAR(10) NOT NULL,
    "airport_name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airport_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_travel_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "arrival_date" DATE NOT NULL,
    "arrival_airport_id" UUID NOT NULL,
    "arrival_flight_number" VARCHAR(50) NOT NULL,
    "departure_date" DATE NOT NULL,
    "departure_airport_id" UUID,
    "departure_flight_number" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_travel_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_accommodation_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "accommodation_type" "AccommodationType" NOT NULL,
    "iqama_number" VARCHAR(50),
    "iqama_name" VARCHAR(255),
    "iqama_dob" DATE,
    "iqama_mobile" VARCHAR(20),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_accommodation_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_hotel_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accommodation_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "checkin_date" DATE NOT NULL,
    "checkout_date" DATE NOT NULL,
    "room_count" INTEGER NOT NULL DEFAULT 1,
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_transport_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "from_location_id" UUID NOT NULL,
    "to_location_id" UUID NOT NULL,
    "transport_type" VARCHAR(50) NOT NULL,
    "pax_count" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "travel_date" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_transport_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passenger_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passenger_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "fileSize" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "passenger_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airport_masters_airport_code_key" ON "airport_masters"("airport_code");

-- CreateIndex
CREATE INDEX "airport_masters_airport_code_idx" ON "airport_masters"("airport_code");

-- CreateIndex
CREATE INDEX "airport_masters_airport_name_idx" ON "airport_masters"("airport_name");

-- CreateIndex
CREATE INDEX "airport_masters_city_idx" ON "airport_masters"("city");

-- CreateIndex
CREATE INDEX "airport_masters_is_active_idx" ON "airport_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "umrah_travel_details_booking_id_key" ON "umrah_travel_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_travel_details_booking_id_idx" ON "umrah_travel_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_travel_details_arrival_date_idx" ON "umrah_travel_details"("arrival_date");

-- CreateIndex
CREATE INDEX "umrah_travel_details_departure_date_idx" ON "umrah_travel_details"("departure_date");

-- CreateIndex
CREATE INDEX "umrah_travel_details_arrival_airport_id_idx" ON "umrah_travel_details"("arrival_airport_id");

-- CreateIndex
CREATE INDEX "umrah_travel_details_departure_airport_id_idx" ON "umrah_travel_details"("departure_airport_id");

-- CreateIndex
CREATE UNIQUE INDEX "umrah_accommodation_details_booking_id_key" ON "umrah_accommodation_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_accommodation_details_booking_id_idx" ON "umrah_accommodation_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_accommodation_details_accommodation_type_idx" ON "umrah_accommodation_details"("accommodation_type");

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_accommodation_id_idx" ON "umrah_hotel_bookings"("accommodation_id");

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_location_id_idx" ON "umrah_hotel_bookings"("location_id");

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_hotel_id_idx" ON "umrah_hotel_bookings"("hotel_id");

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_checkin_date_idx" ON "umrah_hotel_bookings"("checkin_date");

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_checkout_date_idx" ON "umrah_hotel_bookings"("checkout_date");

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_booking_id_idx" ON "umrah_transport_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_from_location_id_idx" ON "umrah_transport_bookings"("from_location_id");

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_to_location_id_idx" ON "umrah_transport_bookings"("to_location_id");

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_transport_type_idx" ON "umrah_transport_bookings"("transport_type");

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_travel_date_idx" ON "umrah_transport_bookings"("travel_date");

-- CreateIndex
CREATE INDEX "passenger_documents_passenger_id_idx" ON "passenger_documents"("passenger_id");

-- CreateIndex
CREATE INDEX "passenger_documents_document_type_idx" ON "passenger_documents"("document_type");

-- CreateIndex
CREATE INDEX "passenger_documents_is_deleted_idx" ON "passenger_documents"("is_deleted");

-- CreateIndex
CREATE INDEX "transport_masters_from_location_id_idx" ON "transport_masters"("from_location_id");

-- CreateIndex
CREATE INDEX "transport_masters_to_location_id_idx" ON "transport_masters"("to_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_masters_from_location_id_to_location_id_vehicle_t_key" ON "transport_masters"("from_location_id", "to_location_id", "vehicle_type", "pax");

-- AddForeignKey
ALTER TABLE "transport_masters" ADD CONSTRAINT "transport_masters_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "destination_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_masters" ADD CONSTRAINT "transport_masters_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "destination_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_travel_details" ADD CONSTRAINT "umrah_travel_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_travel_details" ADD CONSTRAINT "umrah_travel_details_arrival_airport_id_fkey" FOREIGN KEY ("arrival_airport_id") REFERENCES "airport_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_travel_details" ADD CONSTRAINT "umrah_travel_details_departure_airport_id_fkey" FOREIGN KEY ("departure_airport_id") REFERENCES "airport_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_accommodation_details" ADD CONSTRAINT "umrah_accommodation_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_accommodation_id_fkey" FOREIGN KEY ("accommodation_id") REFERENCES "umrah_accommodation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "destination_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotel_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "destination_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "destination_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passenger_documents" ADD CONSTRAINT "passenger_documents_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "umrah_passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
