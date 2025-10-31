/*
  Warnings:

  - You are about to drop the `party_limits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."party_limits" DROP CONSTRAINT "party_limits_party_id_fkey";

-- DropTable
DROP TABLE "public"."party_limits";
