-- AlterTable
ALTER TABLE "umrah_transport_bookings" ADD COLUMN     "from_specific_location_id" UUID,
ADD COLUMN     "to_specific_location_id" UUID;

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_from_specific_location_id_idx" ON "umrah_transport_bookings"("from_specific_location_id");

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_to_specific_location_id_idx" ON "umrah_transport_bookings"("to_specific_location_id");

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_from_specific_location_id_fkey" FOREIGN KEY ("from_specific_location_id") REFERENCES "location_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_to_specific_location_id_fkey" FOREIGN KEY ("to_specific_location_id") REFERENCES "location_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
