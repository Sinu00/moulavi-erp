-- CreateEnum
CREATE TYPE "PartyDocumentType" AS ENUM ('gst_certificate', 'pan_card', 'aadhaar_card', 'other');

-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "aadhaar_number" VARCHAR(50),
ADD COLUMN     "pan_number" VARCHAR(50),
ADD COLUMN     "supplier_service_types" JSONB;

-- CreateTable
CREATE TABLE "party_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "contact_name" VARCHAR(255) NOT NULL,
    "contact_number" VARCHAR(20) NOT NULL,
    "department" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "document_type" "PartyDocumentType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "party_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "party_contacts_party_id_idx" ON "party_contacts"("party_id");

-- CreateIndex
CREATE INDEX "party_documents_party_id_idx" ON "party_documents"("party_id");

-- CreateIndex
CREATE INDEX "party_documents_document_type_idx" ON "party_documents"("document_type");

-- CreateIndex
CREATE INDEX "party_documents_is_deleted_idx" ON "party_documents"("is_deleted");

-- AddForeignKey
ALTER TABLE "party_contacts" ADD CONSTRAINT "party_contacts_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_documents" ADD CONSTRAINT "party_documents_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
