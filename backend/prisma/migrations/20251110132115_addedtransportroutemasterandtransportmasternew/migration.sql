/*
  Warnings:

  - You are about to drop the column `from_location_id` on the `transport_masters` table. All the data in the column will be lost.
  - You are about to drop the column `to_location_id` on the `transport_masters` table. All the data in the column will be lost.
  - You are about to drop the column `accommodation_id` on the `umrah_hotel_bookings` table. All the data in the column will be lost.
  - You are about to drop the `airport_route_masters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `full_trip_master_to_cities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `full_trip_masters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transport_pricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `umrah_accommodation_details` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[route_id,vehicle_type_id]` on the table `transport_masters` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `route_id` to the `transport_masters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booking_id` to the `umrah_hotel_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RouteType" AS ENUM ('citytocity', 'airporttocity', 'citytoairport', 'tripandtour');

-- DropForeignKey
ALTER TABLE "public"."airport_route_masters" DROP CONSTRAINT "airport_route_masters_from_destination_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."airport_route_masters" DROP CONSTRAINT "airport_route_masters_to_destination_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."full_trip_master_to_cities" DROP CONSTRAINT "full_trip_master_to_cities_city_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."full_trip_master_to_cities" DROP CONSTRAINT "full_trip_master_to_cities_full_trip_master_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."full_trip_masters" DROP CONSTRAINT "full_trip_masters_from_city_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."full_trip_masters" DROP CONSTRAINT "full_trip_masters_vehicle_type_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transport_masters" DROP CONSTRAINT "transport_masters_from_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transport_masters" DROP CONSTRAINT "transport_masters_to_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_accommodation_details" DROP CONSTRAINT "umrah_accommodation_details_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_hotel_bookings" DROP CONSTRAINT "umrah_hotel_bookings_accommodation_id_fkey";

-- DropIndex
DROP INDEX "public"."transport_masters_from_location_id_idx";

-- DropIndex
DROP INDEX "public"."transport_masters_from_location_id_to_location_id_vehicle_t_key";

-- DropIndex
DROP INDEX "public"."transport_masters_to_location_id_idx";

-- DropIndex
DROP INDEX "public"."umrah_hotel_bookings_accommodation_id_idx";

-- AlterTable
ALTER TABLE "transport_masters" DROP COLUMN "from_location_id",
DROP COLUMN "to_location_id",
ADD COLUMN     "route_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "umrah_hotel_bookings" DROP COLUMN "accommodation_id",
ADD COLUMN     "booking_id" UUID NOT NULL;

-- DropTable
DROP TABLE "public"."airport_route_masters";

-- DropTable
DROP TABLE "public"."full_trip_master_to_cities";

-- DropTable
DROP TABLE "public"."full_trip_masters";

-- DropTable
DROP TABLE "public"."transport_pricing";

-- DropTable
DROP TABLE "public"."umrah_accommodation_details";

-- CreateTable
CREATE TABLE "transport_route_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city1_id" UUID NOT NULL,
    "city2_id" UUID NOT NULL,
    "city3_id" UUID,
    "city4_id" UUID,
    "route_type" "RouteType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_route_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_sponser_iqama_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "iqama_sponser_name" VARCHAR(255) NOT NULL,
    "iqama_number" VARCHAR(50) NOT NULL,
    "sponser_dob" DATE NOT NULL,
    "sponser_mobile_number" VARCHAR(20) NOT NULL,
    "sponser_national_short_address" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_sponser_iqama_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_route_masters_city1_id_idx" ON "transport_route_masters"("city1_id");

-- CreateIndex
CREATE INDEX "transport_route_masters_city2_id_idx" ON "transport_route_masters"("city2_id");

-- CreateIndex
CREATE INDEX "transport_route_masters_route_type_idx" ON "transport_route_masters"("route_type");

-- CreateIndex
CREATE INDEX "transport_route_masters_is_active_idx" ON "transport_route_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "umrah_sponser_iqama_details_booking_id_key" ON "umrah_sponser_iqama_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_sponser_iqama_details_booking_id_idx" ON "umrah_sponser_iqama_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_sponser_iqama_details_iqama_number_idx" ON "umrah_sponser_iqama_details"("iqama_number");

-- CreateIndex
CREATE INDEX "transport_masters_route_id_idx" ON "transport_masters"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_masters_route_id_vehicle_type_id_key" ON "transport_masters"("route_id", "vehicle_type_id");

-- CreateIndex
CREATE INDEX "umrah_hotel_bookings_booking_id_idx" ON "umrah_hotel_bookings"("booking_id");

-- AddForeignKey
ALTER TABLE "transport_route_masters" ADD CONSTRAINT "transport_route_masters_city1_id_fkey" FOREIGN KEY ("city1_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_masters" ADD CONSTRAINT "transport_route_masters_city2_id_fkey" FOREIGN KEY ("city2_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_masters" ADD CONSTRAINT "transport_route_masters_city3_id_fkey" FOREIGN KEY ("city3_id") REFERENCES "city_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_masters" ADD CONSTRAINT "transport_route_masters_city4_id_fkey" FOREIGN KEY ("city4_id") REFERENCES "city_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_masters" ADD CONSTRAINT "transport_masters_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_route_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_sponser_iqama_details" ADD CONSTRAINT "umrah_sponser_iqama_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
