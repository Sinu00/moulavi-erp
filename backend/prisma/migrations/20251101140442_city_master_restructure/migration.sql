/*
  Warnings:

  - The values [DESTINATION] on the enum `LocationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `hotel_masters` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `city_id` to the `location_masters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LocationType_new" AS ENUM ('HOTEL', 'AIRPORT', 'ZIYARAT', 'OTHERS');
ALTER TABLE "location_masters" ALTER COLUMN "location_type" TYPE "LocationType_new" USING ("location_type"::text::"LocationType_new");
ALTER TYPE "LocationType" RENAME TO "LocationType_old";
ALTER TYPE "LocationType_new" RENAME TO "LocationType";
DROP TYPE "public"."LocationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."hotel_masters" DROP CONSTRAINT "hotel_masters_location_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."umrah_hotel_bookings" DROP CONSTRAINT "umrah_hotel_bookings_hotel_id_fkey";

-- AlterTable
ALTER TABLE "location_masters" ADD COLUMN     "city_id" UUID NOT NULL;

-- DropTable
DROP TABLE "public"."hotel_masters";

-- CreateTable
CREATE TABLE "city_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "country_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "city_masters_name_idx" ON "city_masters"("name");

-- CreateIndex
CREATE INDEX "city_masters_country_id_idx" ON "city_masters"("country_id");

-- CreateIndex
CREATE INDEX "city_masters_is_active_idx" ON "city_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "city_masters_name_country_id_key" ON "city_masters"("name", "country_id");

-- CreateIndex
CREATE INDEX "location_masters_city_id_idx" ON "location_masters"("city_id");

-- AddForeignKey
ALTER TABLE "city_masters" ADD CONSTRAINT "city_masters_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_masters" ADD CONSTRAINT "location_masters_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_hotel_bookings" ADD CONSTRAINT "umrah_hotel_bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
