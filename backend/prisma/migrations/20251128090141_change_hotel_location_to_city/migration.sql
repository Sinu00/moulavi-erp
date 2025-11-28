/*
  Warnings:

  - You are about to drop the column `location_id` on the `umrah_hotel_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `route_number` on the `umrah_movement_details` table. All the data in the column will be lost.
  - You are about to drop the column `booking_id` on the `vouchers` table. All the data in the column will be lost.
  - Added the required column `city_id` to the `umrah_hotel_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "umrah_hotel_bookings" DROP CONSTRAINT "umrah_hotel_bookings_location_id_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_booking_id_fkey";

-- DropIndex
DROP INDEX "umrah_hotel_bookings_location_id_idx";

-- DropIndex
DROP INDEX "umrah_movement_details_route_number_idx";

-- DropIndex
DROP INDEX "vouchers_booking_id_idx";

-- AlterTable
ALTER TABLE "umrah_hotel_bookings" DROP COLUMN "location_id",
ADD COLUMN     "city_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "umrah_movement_details" DROP COLUMN "route_number";

-- AlterTable
ALTER TABLE "vouchers" DROP COLUMN "booking_id",
ADD COLUMN     "group_name" VARCHAR(255);

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_city_id_idx" ON "umrah_hotel_bookings"("city_id");

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
