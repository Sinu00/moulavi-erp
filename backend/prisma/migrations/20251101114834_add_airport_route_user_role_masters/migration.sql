-- CreateTable
CREATE TABLE "airport_route_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_code" VARCHAR(20) NOT NULL,
    "route_name" VARCHAR(255) NOT NULL,
    "from_airport" VARCHAR(50) NOT NULL,
    "to_airport" VARCHAR(50) NOT NULL,
    "from_destination_id" UUID,
    "to_destination_id" UUID,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airport_route_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_code" VARCHAR(50) NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "permissions" JSONB NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_masters_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "user_role_masters_role_code_key" ON "user_role_masters"("role_code");

-- CreateIndex
CREATE INDEX "user_role_masters_role_code_idx" ON "user_role_masters"("role_code");

-- CreateIndex
CREATE INDEX "user_role_masters_role_name_idx" ON "user_role_masters"("role_name");

-- CreateIndex
CREATE INDEX "user_role_masters_is_active_idx" ON "user_role_masters"("is_active");

-- AddForeignKey
ALTER TABLE "airport_route_masters" ADD CONSTRAINT "airport_route_masters_from_destination_id_fkey" FOREIGN KEY ("from_destination_id") REFERENCES "location_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_route_masters" ADD CONSTRAINT "airport_route_masters_to_destination_id_fkey" FOREIGN KEY ("to_destination_id") REFERENCES "location_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
