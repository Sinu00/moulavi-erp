-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_from_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_to_location_id_fkey";

-- DropIndex
DROP INDEX "public"."umrah_transport_bookings_from_specific_location_id_idx";

-- DropIndex
DROP INDEX "public"."umrah_transport_bookings_to_specific_location_id_idx";

-- DropIndex
DROP INDEX "public"."umrah_transport_bookings_vehicle_type_idx";

-- AlterTable
ALTER TABLE "umrah_transport_bookings" ADD COLUMN     "transport_master_id" UUID,
ALTER COLUMN "from_location_id" DROP NOT NULL,
ALTER COLUMN "to_location_id" DROP NOT NULL,
ALTER COLUMN "vehicle_type" DROP NOT NULL,
ALTER COLUMN "pax_count" DROP NOT NULL,
ALTER COLUMN "price" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "umrah_transport_bookings_transport_master_id_idx" ON "umrah_transport_bookings"("transport_master_id");

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_transport_master_id_fkey" FOREIGN KEY ("transport_master_id") REFERENCES "transport_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "location_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "location_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
