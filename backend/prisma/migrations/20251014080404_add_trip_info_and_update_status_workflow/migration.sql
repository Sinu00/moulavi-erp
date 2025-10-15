/*
  Warnings:

  - The values [pending,processing,approved,rejected,completed] on the enum `UmrahVisaStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UmrahVisaStatus_new" AS ENUM ('group_processing', 'group_assigned', 'documents_downloaded', 'booking_success', 'cancelled');
ALTER TABLE "public"."umrah_visa_bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "status" TYPE "UmrahVisaStatus_new" USING ("status"::text::"UmrahVisaStatus_new");
ALTER TYPE "UmrahVisaStatus" RENAME TO "UmrahVisaStatus_old";
ALTER TYPE "UmrahVisaStatus_new" RENAME TO "UmrahVisaStatus";
DROP TYPE "public"."UmrahVisaStatus_old";
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "status" SET DEFAULT 'group_processing';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."umrah_travel_details" DROP CONSTRAINT "umrah_travel_details_departure_airport_id_fkey";

-- AlterTable
ALTER TABLE "umrah_accommodation_details" ADD COLUMN     "iqama_national_short_address" VARCHAR(500);

-- AlterTable
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "status" SET DEFAULT 'group_processing';

-- DropEnum
DROP TYPE "public"."BookingMode";

-- CreateTable
CREATE TABLE "trip_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "group_number" VARCHAR(100),
    "group_name" VARCHAR(255),
    "party_name" VARCHAR(255) NOT NULL,
    "arrival_date" DATE NOT NULL,
    "departure_date" DATE NOT NULL,
    "iqama_number" VARCHAR(50),
    "iqama_holder_name" VARCHAR(255),
    "iqama_holder_dob" DATE,
    "iqama_holder_mobile" VARCHAR(20),
    "iqama_national_short_address" VARCHAR(500),
    "documents_download_count" INTEGER NOT NULL DEFAULT 0,
    "documents_downloaded_at" TIMESTAMP(6),
    "documents_downloaded_by" UUID,
    "confirmation_image_path" VARCHAR(500),
    "confirmation_uploaded_at" TIMESTAMP(6),
    "updated_by" UUID NOT NULL,
    "status" "UmrahVisaStatus" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_info_booking_id_key" ON "trip_info"("booking_id");

-- CreateIndex
CREATE INDEX "trip_info_booking_id_idx" ON "trip_info"("booking_id");

-- CreateIndex
CREATE INDEX "trip_info_group_number_idx" ON "trip_info"("group_number");

-- CreateIndex
CREATE INDEX "trip_info_status_idx" ON "trip_info"("status");

-- CreateIndex
CREATE INDEX "trip_info_updated_by_idx" ON "trip_info"("updated_by");

-- RenameForeignKey
ALTER TABLE "hotel_masters" RENAME CONSTRAINT "hotel_masters_destination_id_fkey" TO "hotel_masters_location_id_fkey";

-- AddForeignKey
ALTER TABLE "umrah_travel_details" ADD CONSTRAINT "umrah_travel_details_departure_airport_id_fkey" FOREIGN KEY ("departure_airport_id") REFERENCES "airport_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_info" ADD CONSTRAINT "trip_info_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_info" ADD CONSTRAINT "trip_info_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_info" ADD CONSTRAINT "trip_info_documents_downloaded_by_fkey" FOREIGN KEY ("documents_downloaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
