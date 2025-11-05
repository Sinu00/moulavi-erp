/*
  Warnings:

  - You are about to drop the column `reservation_number` on the `umrah_visa_bookings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."umrah_visa_bookings_reservation_number_idx";

-- AlterTable
ALTER TABLE "umrah_visa_bookings" DROP COLUMN "reservation_number";

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "umrah_visa_provider_id" UUID;
