/*
  Warnings:

  - You are about to drop the `trip_info` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."trip_info" DROP CONSTRAINT "trip_info_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."trip_info" DROP CONSTRAINT "trip_info_documents_downloaded_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."trip_info" DROP CONSTRAINT "trip_info_updated_by_fkey";

-- AlterTable
ALTER TABLE "umrah_sponser_iqama_details" ADD COLUMN     "confirmation_image_path" VARCHAR(500),
ADD COLUMN     "confirmation_uploaded_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "documents_download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "documents_downloaded_by" UUID,
ADD COLUMN     "last_updated_by" UUID;

-- DropTable
DROP TABLE "public"."trip_info";

-- AddForeignKey
ALTER TABLE "umrah_visa_bookings" ADD CONSTRAINT "umrah_visa_bookings_documents_downloaded_by_fkey" FOREIGN KEY ("documents_downloaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_visa_bookings" ADD CONSTRAINT "umrah_visa_bookings_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
