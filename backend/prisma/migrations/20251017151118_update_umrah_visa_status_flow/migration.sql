/*
  Warnings:

  - The values [group_processing] on the enum `UmrahVisaStatus` will be removed. If these variants are still used in the database, this will fail.

*/

-- First, migrate existing data with group_processing to pending
UPDATE "umrah_visa_bookings" SET "status" = 'group_assigned' WHERE "status" = 'group_processing';
UPDATE "trip_info" SET "status" = 'group_assigned' WHERE "status" = 'group_processing';

-- CreateEnum
CREATE TYPE "VisaType" AS ENUM ('individual_visa', 'group_visa');

-- AlterEnum
BEGIN;
CREATE TYPE "UmrahVisaStatus_new" AS ENUM ('pending', 'documents_downloaded', 'group_assigned', 'voucher', 'bill', 'booking_success', 'cancelled');
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "status" TYPE "UmrahVisaStatus_new" USING ("status"::text::"UmrahVisaStatus_new");
ALTER TABLE "trip_info" ALTER COLUMN "status" TYPE "UmrahVisaStatus_new" USING ("status"::text::"UmrahVisaStatus_new");
ALTER TYPE "UmrahVisaStatus" RENAME TO "UmrahVisaStatus_old";
ALTER TYPE "UmrahVisaStatus_new" RENAME TO "UmrahVisaStatus";
DROP TYPE "UmrahVisaStatus_old";
ALTER TABLE "umrah_visa_bookings" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "bill_generated_at" TIMESTAMP(6),
ADD COLUMN     "bill_generated_by" UUID,
ADD COLUMN     "has_transportation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visa_type" "VisaType" NOT NULL DEFAULT 'individual_visa',
ADD COLUMN     "voucher_generated_at" TIMESTAMP(6),
ADD COLUMN     "voucher_generated_by" UUID,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- Update hasTransportation flag based on existing transport bookings
UPDATE "umrah_visa_bookings" 
SET "has_transportation" = true 
WHERE "id" IN (
  SELECT DISTINCT "booking_id" 
  FROM "umrah_transport_bookings"
);

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_visa_type_idx" ON "umrah_visa_bookings"("visa_type");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_has_transportation_idx" ON "umrah_visa_bookings"("has_transportation");
