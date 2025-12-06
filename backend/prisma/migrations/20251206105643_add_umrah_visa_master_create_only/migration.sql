-- CreateTable
CREATE TABLE "umrah_visa_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "last_arrival_date" DATE NOT NULL,
    "last_departure_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_visa_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "umrah_visa_masters_is_active_idx" ON "umrah_visa_masters"("is_active");
