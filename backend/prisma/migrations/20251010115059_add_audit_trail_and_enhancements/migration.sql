/*
  Warnings:

  - You are about to drop the column `pax` on the `transport_pricing` table. All the data in the column will be lost.
  - You are about to drop the column `transport_id` on the `transport_pricing` table. All the data in the column will be lost.
  - Added the required column `pax_count` to the `transport_pricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transport_type` to the `transport_pricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valid_from` to the `transport_pricing` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."transport_pricing_route_id_idx";

-- DropIndex
DROP INDEX "public"."transport_pricing_route_id_transport_id_pax_key";

-- DropIndex
DROP INDEX "public"."transport_pricing_transport_id_idx";

-- AlterTable
ALTER TABLE "transport_pricing" DROP COLUMN "pax",
DROP COLUMN "transport_id",
ADD COLUMN     "pax_count" INTEGER NOT NULL,
ADD COLUMN     "transport_type" VARCHAR(50) NOT NULL,
ADD COLUMN     "valid_from" TIMESTAMP(6) NOT NULL,
ADD COLUMN     "valid_to" TIMESTAMP(6);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "old_status" VARCHAR(50),
    "new_status" VARCHAR(50) NOT NULL,
    "changed_by" UUID NOT NULL,
    "reason" VARCHAR(500),
    "changed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_limits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "max_passengers" INTEGER NOT NULL DEFAULT 50,
    "max_passengers_iqama" INTEGER NOT NULL DEFAULT 5,
    "max_travel_days" INTEGER NOT NULL DEFAULT 80,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "days_before_travel" INTEGER NOT NULL,
    "cancellation_fee" DECIMAL(10,2) NOT NULL,
    "refund_percentage" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_idx" ON "booking_status_history"("booking_id");

-- CreateIndex
CREATE INDEX "booking_status_history_changed_by_idx" ON "booking_status_history"("changed_by");

-- CreateIndex
CREATE INDEX "booking_status_history_changed_at_idx" ON "booking_status_history"("changed_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_changed_by_idx" ON "audit_logs"("changed_by");

-- CreateIndex
CREATE INDEX "audit_logs_changed_at_idx" ON "audit_logs"("changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "party_limits_party_id_key" ON "party_limits"("party_id");

-- CreateIndex
CREATE INDEX "cancellation_policies_is_active_idx" ON "cancellation_policies"("is_active");

-- CreateIndex
CREATE INDEX "cancellation_policies_days_before_travel_idx" ON "cancellation_policies"("days_before_travel");

-- CreateIndex
CREATE INDEX "transport_pricing_route_id_transport_type_pax_count_idx" ON "transport_pricing"("route_id", "transport_type", "pax_count");

-- CreateIndex
CREATE INDEX "transport_pricing_valid_from_valid_to_idx" ON "transport_pricing"("valid_from", "valid_to");

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "umrah_visa_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_limits" ADD CONSTRAINT "party_limits_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
