-- CreateTable
CREATE TABLE "full_trip_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_city_id" UUID NOT NULL,
    "vehicle_type_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "full_trip_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "full_trip_master_to_cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_trip_master_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "full_trip_master_to_cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "full_trip_masters_from_city_id_idx" ON "full_trip_masters"("from_city_id");

-- CreateIndex
CREATE INDEX "full_trip_masters_vehicle_type_id_idx" ON "full_trip_masters"("vehicle_type_id");

-- CreateIndex
CREATE INDEX "full_trip_masters_is_active_idx" ON "full_trip_masters"("is_active");

-- CreateIndex
CREATE INDEX "full_trip_master_to_cities_full_trip_master_id_idx" ON "full_trip_master_to_cities"("full_trip_master_id");

-- CreateIndex
CREATE INDEX "full_trip_master_to_cities_city_id_idx" ON "full_trip_master_to_cities"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "full_trip_master_to_cities_full_trip_master_id_sequence_ord_key" ON "full_trip_master_to_cities"("full_trip_master_id", "sequence_order");

-- AddForeignKey
ALTER TABLE "full_trip_masters" ADD CONSTRAINT "full_trip_masters_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "full_trip_masters" ADD CONSTRAINT "full_trip_masters_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_type_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "full_trip_master_to_cities" ADD CONSTRAINT "full_trip_master_to_cities_full_trip_master_id_fkey" FOREIGN KEY ("full_trip_master_id") REFERENCES "full_trip_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "full_trip_master_to_cities" ADD CONSTRAINT "full_trip_master_to_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
