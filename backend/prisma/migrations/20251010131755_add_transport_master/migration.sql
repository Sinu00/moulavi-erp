/*
  Warnings:

  - You are about to drop the `umrah_visa_details` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "UmrahVisaStatus" ADD VALUE 'cancelled';

-- DropForeignKey
ALTER TABLE "public"."umrah_visa_details" DROP CONSTRAINT "umrah_visa_details_service_id_fkey";

-- DropTable
DROP TABLE "public"."umrah_visa_details";

-- CreateTable
CREATE TABLE "transport_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_route" VARCHAR(100) NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "pax" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_masters_vehicle_route_idx" ON "transport_masters"("vehicle_route");

-- CreateIndex
CREATE INDEX "transport_masters_vehicle_type_idx" ON "transport_masters"("vehicle_type");

-- CreateIndex
CREATE INDEX "transport_masters_is_active_idx" ON "transport_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "transport_masters_vehicle_route_vehicle_type_pax_key" ON "transport_masters"("vehicle_route", "vehicle_type", "pax");
