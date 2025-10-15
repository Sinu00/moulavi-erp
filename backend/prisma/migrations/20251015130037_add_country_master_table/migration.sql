/*
  Warnings:

  - You are about to drop the column `account_currency` on the `parties` table. All the data in the column will be lost.
  - Added the required column `account_currency_id` to the `parties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "parties" DROP COLUMN "account_currency",
ADD COLUMN     "account_currency_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "country_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_code" VARCHAR(3) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_masters_country_code_key" ON "country_masters"("country_code");

-- CreateIndex
CREATE INDEX "country_masters_country_code_idx" ON "country_masters"("country_code");

-- CreateIndex
CREATE INDEX "country_masters_country_name_idx" ON "country_masters"("country_name");

-- CreateIndex
CREATE INDEX "country_masters_is_active_idx" ON "country_masters"("is_active");

-- CreateIndex
CREATE INDEX "parties_account_currency_id_idx" ON "parties"("account_currency_id");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_account_currency_id_fkey" FOREIGN KEY ("account_currency_id") REFERENCES "currency_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
