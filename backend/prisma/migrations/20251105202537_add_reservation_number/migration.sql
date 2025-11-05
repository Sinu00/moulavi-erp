-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "reservation_number" VARCHAR(10);

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_reservation_number_idx" ON "umrah_visa_bookings"("reservation_number");
