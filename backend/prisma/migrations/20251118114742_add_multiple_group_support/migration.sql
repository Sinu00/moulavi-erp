-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "has_multiple_group" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "multiple_group_details" JSONB;
