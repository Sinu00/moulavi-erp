-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "accommodation_type" "AccommodationType";

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_accommodation_type_idx" ON "umrah_visa_bookings"("accommodation_type");
