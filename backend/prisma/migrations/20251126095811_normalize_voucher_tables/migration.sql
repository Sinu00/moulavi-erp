/*
  Warnings:

  - You are about to drop the column `flight_details` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `hotel_schedules` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `movement_details` on the `vouchers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vouchers" DROP COLUMN "flight_details",
DROP COLUMN "hotel_schedules",
DROP COLUMN "movement_details";

-- CreateTable
CREATE TABLE "voucher_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_id" UUID NOT NULL,
    "sr" INTEGER NOT NULL,
    "route" VARCHAR(20),
    "date" DATE NOT NULL,
    "time" VARCHAR(10) NOT NULL,
    "from" VARCHAR(100) NOT NULL,
    "from_location" VARCHAR(255) NOT NULL,
    "from_location_id" UUID,
    "to" VARCHAR(100) NOT NULL,
    "to_location" VARCHAR(255) NOT NULL,
    "to_location_id" UUID,
    "driver_details_1" VARCHAR(255),
    "driver_details_2" VARCHAR(255),
    "vehicle_number" VARCHAR(50),
    "pax_count" INTEGER,
    "price" DECIMAL(10,2),
    "vehicle_type" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_hotels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "hotel_name" VARCHAR(255) NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "brn" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_flights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_id" UUID NOT NULL,
    "type" VARCHAR(2) NOT NULL,
    "carrier" VARCHAR(10) NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "from" VARCHAR(10) NOT NULL,
    "to" VARCHAR(10) NOT NULL,
    "etd" VARCHAR(10),
    "eta" VARCHAR(10),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_flights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voucher_movements_voucher_id_idx" ON "voucher_movements"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_movements_date_idx" ON "voucher_movements"("date");

-- CreateIndex
CREATE INDEX "voucher_movements_from_location_id_idx" ON "voucher_movements"("from_location_id");

-- CreateIndex
CREATE INDEX "voucher_movements_to_location_id_idx" ON "voucher_movements"("to_location_id");

-- CreateIndex
CREATE INDEX "voucher_hotels_voucher_id_idx" ON "voucher_hotels"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_hotels_check_in_idx" ON "voucher_hotels"("check_in");

-- CreateIndex
CREATE INDEX "voucher_hotels_check_out_idx" ON "voucher_hotels"("check_out");

-- CreateIndex
CREATE INDEX "voucher_flights_voucher_id_idx" ON "voucher_flights"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_flights_date_idx" ON "voucher_flights"("date");

-- CreateIndex
CREATE INDEX "voucher_flights_type_idx" ON "voucher_flights"("type");

-- AddForeignKey
ALTER TABLE "voucher_movements" ADD CONSTRAINT "voucher_movements_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_hotels" ADD CONSTRAINT "voucher_hotels_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_flights" ADD CONSTRAINT "voucher_flights_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
