-- CreateTable
CREATE TABLE "country_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_code" VARCHAR(3) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL,
    "nationality" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "currency_code" VARCHAR(3) NOT NULL,
    "currency_name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "destination_code" VARCHAR(10) NOT NULL,
    "destination_name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hotel_code" VARCHAR(20) NOT NULL,
    "hotel_name" VARCHAR(255) NOT NULL,
    "destination_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "amenities" TEXT[],
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_type_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_code" VARCHAR(20) NOT NULL,
    "service_name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_type_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_code" VARCHAR(20) NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "permissions" TEXT[],
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_route_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_code" VARCHAR(20) NOT NULL,
    "route_name" VARCHAR(100) NOT NULL,
    "from_airport" VARCHAR(100) NOT NULL,
    "to_airport" VARCHAR(100) NOT NULL,
    "from_destination_id" UUID,
    "to_destination_id" UUID,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airport_route_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_masters_country_code_key" ON "country_masters"("country_code");

-- CreateIndex
CREATE INDEX "country_masters_country_code_idx" ON "country_masters"("country_code");

-- CreateIndex
CREATE INDEX "country_masters_country_name_idx" ON "country_masters"("country_name");

-- CreateIndex
CREATE INDEX "country_masters_nationality_idx" ON "country_masters"("nationality");

-- CreateIndex
CREATE INDEX "country_masters_is_active_idx" ON "country_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "currency_masters_currency_code_key" ON "currency_masters"("currency_code");

-- CreateIndex
CREATE INDEX "currency_masters_currency_code_idx" ON "currency_masters"("currency_code");

-- CreateIndex
CREATE INDEX "currency_masters_currency_name_idx" ON "currency_masters"("currency_name");

-- CreateIndex
CREATE INDEX "currency_masters_is_active_idx" ON "currency_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "destination_masters_destination_code_key" ON "destination_masters"("destination_code");

-- CreateIndex
CREATE INDEX "destination_masters_destination_code_idx" ON "destination_masters"("destination_code");

-- CreateIndex
CREATE INDEX "destination_masters_destination_name_idx" ON "destination_masters"("destination_name");

-- CreateIndex
CREATE INDEX "destination_masters_city_idx" ON "destination_masters"("city");

-- CreateIndex
CREATE INDEX "destination_masters_is_active_idx" ON "destination_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_masters_hotel_code_key" ON "hotel_masters"("hotel_code");

-- CreateIndex
CREATE INDEX "hotel_masters_hotel_code_idx" ON "hotel_masters"("hotel_code");

-- CreateIndex
CREATE INDEX "hotel_masters_hotel_name_idx" ON "hotel_masters"("hotel_name");

-- CreateIndex
CREATE INDEX "hotel_masters_destination_id_idx" ON "hotel_masters"("destination_id");

-- CreateIndex
CREATE INDEX "hotel_masters_category_idx" ON "hotel_masters"("category");

-- CreateIndex
CREATE INDEX "hotel_masters_is_active_idx" ON "hotel_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_type_masters_service_code_key" ON "service_type_masters"("service_code");

-- CreateIndex
CREATE INDEX "service_type_masters_service_code_idx" ON "service_type_masters"("service_code");

-- CreateIndex
CREATE INDEX "service_type_masters_service_name_idx" ON "service_type_masters"("service_name");

-- CreateIndex
CREATE INDEX "service_type_masters_category_idx" ON "service_type_masters"("category");

-- CreateIndex
CREATE INDEX "service_type_masters_is_active_idx" ON "service_type_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_masters_role_code_key" ON "user_role_masters"("role_code");

-- CreateIndex
CREATE INDEX "user_role_masters_role_code_idx" ON "user_role_masters"("role_code");

-- CreateIndex
CREATE INDEX "user_role_masters_role_name_idx" ON "user_role_masters"("role_name");

-- CreateIndex
CREATE INDEX "user_role_masters_is_active_idx" ON "user_role_masters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "airport_route_masters_route_code_key" ON "airport_route_masters"("route_code");

-- CreateIndex
CREATE INDEX "airport_route_masters_route_code_idx" ON "airport_route_masters"("route_code");

-- CreateIndex
CREATE INDEX "airport_route_masters_route_name_idx" ON "airport_route_masters"("route_name");

-- CreateIndex
CREATE INDEX "airport_route_masters_from_airport_idx" ON "airport_route_masters"("from_airport");

-- CreateIndex
CREATE INDEX "airport_route_masters_to_airport_idx" ON "airport_route_masters"("to_airport");

-- CreateIndex
CREATE INDEX "airport_route_masters_from_destination_id_idx" ON "airport_route_masters"("from_destination_id");

-- CreateIndex
CREATE INDEX "airport_route_masters_to_destination_id_idx" ON "airport_route_masters"("to_destination_id");

-- CreateIndex
CREATE INDEX "airport_route_masters_is_active_idx" ON "airport_route_masters"("is_active");

-- AddForeignKey
ALTER TABLE "hotel_masters" ADD CONSTRAINT "hotel_masters_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destination_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_route_masters" ADD CONSTRAINT "airport_route_masters_from_destination_id_fkey" FOREIGN KEY ("from_destination_id") REFERENCES "destination_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_route_masters" ADD CONSTRAINT "airport_route_masters_to_destination_id_fkey" FOREIGN KEY ("to_destination_id") REFERENCES "destination_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
