/*
  Warnings:

  - You are about to drop the column `from_location_id` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `from_specific_location_id` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `pax_count` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `to_location_id` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `to_specific_location_id` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `vehicle_type` on the `umrah_transport_bookings` table. All the data in the column will be lost.
  - Made the column `transport_master_id` on table `umrah_transport_bookings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_from_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_from_specific_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_to_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_to_specific_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_transport_bookings" DROP CONSTRAINT "umrah_transport_bookings_transport_master_id_fkey";

-- DropIndex
DROP INDEX "public"."umrah_transport_bookings_from_location_id_idx";

-- DropIndex
DROP INDEX "public"."umrah_transport_bookings_to_location_id_idx";

-- AlterTable
ALTER TABLE "umrah_transport_bookings" DROP COLUMN "from_location_id",
DROP COLUMN "from_specific_location_id",
DROP COLUMN "pax_count",
DROP COLUMN "price",
DROP COLUMN "to_location_id",
DROP COLUMN "to_specific_location_id",
DROP COLUMN "vehicle_type",
ALTER COLUMN "transport_master_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "umrah_transport_bookings" ADD CONSTRAINT "umrah_transport_bookings_transport_master_id_fkey" FOREIGN KEY ("transport_master_id") REFERENCES "transport_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
