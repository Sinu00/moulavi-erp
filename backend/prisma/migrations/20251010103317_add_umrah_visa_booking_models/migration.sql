/*
  Warnings:

  - You are about to drop the `user_masters` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('group_number', 'travel_documents');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('hotel', 'iqama');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "passenger_id" UUID;

-- DropTable
DROP TABLE "public"."user_masters";

-- CreateTable
CREATE TABLE "umrah_visa_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "booking_mode" "BookingMode" NOT NULL,
    "group_number" VARCHAR(100),
    "group_name" VARCHAR(255),
    "flight_number" VARCHAR(50) NOT NULL,
    "arrival_date" DATE NOT NULL,
    "departure_date" DATE NOT NULL,
    "arrival_airport" VARCHAR(100) NOT NULL,
    "transport_route" VARCHAR(100),
    "transport_type" VARCHAR(50),
    "transport_pax" INTEGER,
    "transport_price" DECIMAL(10,2),
    "accommodation_type" "AccommodationType" NOT NULL,
    "makkah_checkin" DATE,
    "makkah_checkout" DATE,
    "madina_checkin" DATE,
    "madina_checkout" DATE,
    "iqama_number" VARCHAR(50),
    "iqama_name" VARCHAR(255),
    "iqama_dob" DATE,
    "iqama_mobile" VARCHAR(20),
    "passenger_count" INTEGER NOT NULL,
    "status" "UmrahVisaStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_visa_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_passengers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "is_lead_passenger" BOOLEAN NOT NULL DEFAULT false,
    "full_name" VARCHAR(255) NOT NULL,
    "passport_number" VARCHAR(50) NOT NULL,
    "nationality" VARCHAR(100) NOT NULL,
    "passport_expiry" DATE NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone_number" VARCHAR(20),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "umrah_visa_bookings_service_id_key" ON "umrah_visa_bookings"("service_id");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_service_id_idx" ON "umrah_visa_bookings"("service_id");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_status_idx" ON "umrah_visa_bookings"("status");

-- CreateIndex
CREATE INDEX "umrah_passengers_booking_id_idx" ON "umrah_passengers"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_passengers_is_lead_passenger_idx" ON "umrah_passengers"("is_lead_passenger");

-- CreateIndex
CREATE INDEX "documents_passenger_id_idx" ON "documents"("passenger_id");

-- AddForeignKey
ALTER TABLE "umrah_visa_bookings" ADD CONSTRAINT "umrah_visa_bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_passengers" ADD CONSTRAINT "umrah_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
