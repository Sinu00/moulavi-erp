-- AlterTable
ALTER TABLE "umrah_transport_bookings" ADD COLUMN     "travel_time" TIME;

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "voucher_number" VARCHAR(20) NOT NULL,
    "reservation_date" DATE NOT NULL,
    "guest_name" VARCHAR(255) NOT NULL,
    "guest_mobile" VARCHAR(20),
    "group_code" VARCHAR(100),
    "pax_count" INTEGER NOT NULL,
    "hotel_schedules" JSONB NOT NULL,
    "movement_details" JSONB NOT NULL,
    "flight_details" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_booking_id_key" ON "vouchers"("booking_id");

-- CreateIndex
CREATE INDEX "vouchers_booking_id_idx" ON "vouchers"("booking_id");

-- CreateIndex
CREATE INDEX "vouchers_voucher_number_idx" ON "vouchers"("voucher_number");

-- CreateIndex
CREATE INDEX "vouchers_generated_at_idx" ON "vouchers"("generated_at");

-- CreateIndex
CREATE INDEX "vouchers_generated_by_idx" ON "vouchers"("generated_by");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucher_number_key" ON "vouchers"("voucher_number");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
