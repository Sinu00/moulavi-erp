-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "umrah_passengers" ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "umrah_visa_bookings" ADD COLUMN     "deleted_at" TIMESTAMP(6),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "transport_pricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_id" VARCHAR(100) NOT NULL,
    "transport_id" VARCHAR(100) NOT NULL,
    "pax" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_pricing_route_id_idx" ON "transport_pricing"("route_id");

-- CreateIndex
CREATE INDEX "transport_pricing_transport_id_idx" ON "transport_pricing"("transport_id");

-- CreateIndex
CREATE INDEX "transport_pricing_is_active_idx" ON "transport_pricing"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "transport_pricing_route_id_transport_id_pax_key" ON "transport_pricing"("route_id", "transport_id", "pax");

-- CreateIndex
CREATE INDEX "documents_document_type_idx" ON "documents"("document_type");

-- CreateIndex
CREATE INDEX "documents_is_deleted_idx" ON "documents"("is_deleted");

-- CreateIndex
CREATE INDEX "umrah_passengers_is_deleted_idx" ON "umrah_passengers"("is_deleted");

-- CreateIndex
CREATE INDEX "umrah_passengers_passport_number_idx" ON "umrah_passengers"("passport_number");

-- CreateIndex
CREATE INDEX "umrah_passengers_nationality_idx" ON "umrah_passengers"("nationality");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_arrival_date_idx" ON "umrah_visa_bookings"("arrival_date");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_departure_date_idx" ON "umrah_visa_bookings"("departure_date");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_booking_mode_idx" ON "umrah_visa_bookings"("booking_mode");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_accommodation_type_idx" ON "umrah_visa_bookings"("accommodation_type");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_is_deleted_idx" ON "umrah_visa_bookings"("is_deleted");

-- CreateIndex
CREATE INDEX "umrah_visa_bookings_created_at_idx" ON "umrah_visa_bookings"("created_at");
