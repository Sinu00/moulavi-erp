-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('AIRPORT', 'DESTINATION', 'ZIYARAT');

-- DropIndex
DROP INDEX "public"."parties_created_by_idx";

-- DropIndex
DROP INDEX "public"."trip_info_documents_downloaded_by_idx";

-- CreateTable
CREATE TABLE "transport_pricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_id" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pax_count" INTEGER NOT NULL,
    "transport_type" VARCHAR(50) NOT NULL,
    "valid_from" TIMESTAMP(6) NOT NULL,
    "valid_to" TIMESTAMP(6),

    CONSTRAINT "transport_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "location_type" "LocationType" NOT NULL,
    "country_id" UUID NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_pricing_route_id_transport_type_pax_count_idx" ON "transport_pricing"("route_id", "transport_type", "pax_count");

-- CreateIndex
CREATE INDEX "transport_pricing_is_active_idx" ON "transport_pricing"("is_active");

-- CreateIndex
CREATE INDEX "transport_pricing_valid_from_valid_to_idx" ON "transport_pricing"("valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "location_masters_code_idx" ON "location_masters"("code");

-- CreateIndex
CREATE INDEX "location_masters_name_idx" ON "location_masters"("name");

-- CreateIndex
CREATE INDEX "location_masters_location_type_idx" ON "location_masters"("location_type");

-- CreateIndex
CREATE INDEX "location_masters_country_id_idx" ON "location_masters"("country_id");

-- CreateIndex
CREATE INDEX "location_masters_is_active_idx" ON "location_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "location_masters_code_location_type_key" ON "location_masters"("code", "location_type");

-- AddForeignKey
ALTER TABLE "location_masters" ADD CONSTRAINT "location_masters_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
