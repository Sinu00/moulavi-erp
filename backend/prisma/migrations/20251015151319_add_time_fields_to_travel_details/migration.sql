/*
  Warnings:

  - Added the required column `arrival_time` to the `umrah_travel_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departure_time` to the `umrah_travel_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "umrah_travel_details" ADD COLUMN     "arrival_time" TIME NOT NULL,
ADD COLUMN     "departure_time" TIME NOT NULL;
