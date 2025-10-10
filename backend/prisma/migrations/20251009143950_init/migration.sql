-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'staff', 'party');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('direct', 'b2b');

-- CreateEnum
CREATE TYPE "AccountCurrency" AS ENUM ('SAR', 'INR', 'AED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "UmrahVisaStatus" AS ENUM ('pending', 'processing', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "contact_number" VARCHAR(20),
    "whatsapp_number" VARCHAR(20),
    "address" TEXT,
    "gst_number" VARCHAR(50),
    "customer_type" "CustomerType" NOT NULL,
    "account_currency" "AccountCurrency" NOT NULL,
    "is_supplier" BOOLEAN NOT NULL DEFAULT false,
    "is_customer" BOOLEAN NOT NULL DEFAULT true,
    "login_required" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_type" VARCHAR(50) NOT NULL,
    "party_id" UUID NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umrah_visa_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "passport_number" VARCHAR(50) NOT NULL,
    "nationality" VARCHAR(100) NOT NULL,
    "travel_date_from" DATE NOT NULL,
    "travel_date_to" DATE NOT NULL,
    "passport_expiry" DATE NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender",
    "phone_number" VARCHAR(20),
    "status" "UmrahVisaStatus" NOT NULL DEFAULT 'pending',
    "party_name" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umrah_visa_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "fileSize" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "parties_email_key" ON "parties"("email");

-- CreateIndex
CREATE UNIQUE INDEX "parties_user_id_key" ON "parties"("user_id");

-- CreateIndex
CREATE INDEX "parties_email_idx" ON "parties"("email");

-- CreateIndex
CREATE INDEX "parties_party_name_idx" ON "parties"("party_name");

-- CreateIndex
CREATE INDEX "parties_customer_type_idx" ON "parties"("customer_type");

-- CreateIndex
CREATE INDEX "parties_user_id_idx" ON "parties"("user_id");

-- CreateIndex
CREATE INDEX "services_party_id_idx" ON "services"("party_id");

-- CreateIndex
CREATE INDEX "services_service_type_idx" ON "services"("service_type");

-- CreateIndex
CREATE INDEX "services_status_idx" ON "services"("status");

-- CreateIndex
CREATE INDEX "umrah_visa_details_service_id_idx" ON "umrah_visa_details"("service_id");

-- CreateIndex
CREATE INDEX "umrah_visa_details_status_idx" ON "umrah_visa_details"("status");

-- CreateIndex
CREATE INDEX "umrah_visa_details_party_name_idx" ON "umrah_visa_details"("party_name");

-- CreateIndex
CREATE INDEX "documents_service_id_idx" ON "documents"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_visa_details" ADD CONSTRAINT "umrah_visa_details_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
