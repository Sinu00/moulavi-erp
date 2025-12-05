/*
  Warnings:

  - A unique constraint covering the columns `[party_code]` on the table `parties` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "party_code" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "parties_party_code_key" ON "parties"("party_code");

-- CreateIndex
CREATE INDEX "parties_party_code_idx" ON "parties"("party_code");
