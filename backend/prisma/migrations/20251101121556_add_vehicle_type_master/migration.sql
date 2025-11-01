/*
  Warnings:

  - You are about to drop the column `pax_count` on the `transport_masters` table. All the data in the column will be lost.
  - You are about to drop the column `vehicle_type` on the `transport_masters` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[from_location_id,to_location_id,vehicle_type_id]` on the table `transport_masters` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vehicle_type_id` to the `transport_masters` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."transport_masters_from_location_id_to_location_id_vehicle_t_key";

-- DropIndex
DROP INDEX "public"."transport_masters_pax_count_idx";

-- DropIndex
DROP INDEX "public"."transport_masters_vehicle_type_idx";

-- AlterTable
ALTER TABLE "transport_masters" DROP COLUMN "pax_count",
DROP COLUMN "vehicle_type",
ADD COLUMN     "vehicle_type_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "vehicle_type_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_name" VARCHAR(100) NOT NULL,
    "pax_count" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_type_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_type_masters_vehicle_name_key" ON "vehicle_type_masters"("vehicle_name");

-- CreateIndex
CREATE INDEX "vehicle_type_masters_vehicle_name_idx" ON "vehicle_type_masters"("vehicle_name");

-- CreateIndex
CREATE INDEX "vehicle_type_masters_pax_count_idx" ON "vehicle_type_masters"("pax_count");

-- CreateIndex
CREATE INDEX "vehicle_type_masters_is_active_idx" ON "vehicle_type_masters"("is_active");

-- CreateIndex
CREATE INDEX "transport_masters_vehicle_type_id_idx" ON "transport_masters"("vehicle_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_masters_from_location_id_to_location_id_vehicle_t_key" ON "transport_masters"("from_location_id", "to_location_id", "vehicle_type_id");

-- AddForeignKey
ALTER TABLE "transport_masters" ADD CONSTRAINT "transport_masters_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_type_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
