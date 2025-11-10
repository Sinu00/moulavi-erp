-- CreateTable
CREATE TABLE "umrah_movement_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "route_number" VARCHAR(5),
    "travel_datetime" TIMESTAMP(6) NOT NULL,
    "from_city_id" UUID NOT NULL,
    "from_location_id" UUID NOT NULL,
    "to_city_id" UUID NOT NULL,
    "to_location_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_movement_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "umrah_movement_details_booking_id_idx" ON "umrah_movement_details"("booking_id");

-- CreateIndex
CREATE INDEX "umrah_movement_details_route_number_idx" ON "umrah_movement_details"("route_number");

-- CreateIndex
CREATE INDEX "umrah_movement_details_travel_datetime_idx" ON "umrah_movement_details"("travel_datetime");

-- CreateIndex
CREATE INDEX "umrah_movement_details_from_city_id_idx" ON "umrah_movement_details"("from_city_id");

-- CreateIndex
CREATE INDEX "umrah_movement_details_to_city_id_idx" ON "umrah_movement_details"("to_city_id");

-- AddForeignKey
ALTER TABLE "umrah_movement_details" ADD CONSTRAINT "umrah_movement_details_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_movement_details" ADD CONSTRAINT "umrah_movement_details_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_movement_details" ADD CONSTRAINT "umrah_movement_details_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_movement_details" ADD CONSTRAINT "umrah_movement_details_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_movement_details" ADD CONSTRAINT "umrah_movement_details_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "location_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
