-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('umrah', 'others');

-- CreateTable
CREATE TABLE "pricing_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "type" "PricingType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_masters_party_id_idx" ON "pricing_masters"("party_id");

-- CreateIndex
CREATE INDEX "pricing_masters_type_idx" ON "pricing_masters"("type");

-- CreateIndex
CREATE INDEX "pricing_masters_is_active_idx" ON "pricing_masters"("is_active");

-- AddForeignKey
ALTER TABLE "pricing_masters" ADD CONSTRAINT "pricing_masters_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
