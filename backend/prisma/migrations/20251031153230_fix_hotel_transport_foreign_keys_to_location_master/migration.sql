/*
  Warnings:

  - You are about to drop the `destination_masters` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."hotel_masters" DROP CONSTRAINT "hotel_masters_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transport_masters" DROP CONSTRAINT "transport_masters_from_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transport_masters" DROP CONSTRAINT "transport_masters_to_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_hotel_bookings" DROP CONSTRAINT "umrah_hotel_bookings_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_from_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_to_location_id_fkey";

-- DropTable
DROP TABLE "public"."destination_masters";

-- AddForeignKey
ALTER TABLE "transport_masters" ADD CONSTRAINT "transport_masters_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_masters" ADD CONSTRAINT "transport_masters_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_masters" ADD CONSTRAINT "hotel_masters_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
