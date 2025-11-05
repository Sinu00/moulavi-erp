-- AlterTable
ALTER TABLE "umrah_hotel_bookings" ADD COLUMN     "brn" JSONB;

-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "umrah_visa_provider_id" UUID;

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_umrah_visa_provider_id_idx" ON "umrah_visa_bookings"("umrah_visa_provider_id");

-- AddForeignKey
ALTER TABLE "umrah_visa_bookings" ADD CONSTRAINT "umrah_visa_bookings_umrah_visa_provider_id_fkey" FOREIGN KEY ("umrah_visa_provider_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
