-- AlterTable
ALTER TABLE "umrah_passengers" ADD COLUMN     "entry_date" DATE,
ADD COLUMN     "exit_date" DATE,
ADD COLUMN     "nationality" VARCHAR(100),
ADD COLUMN     "passport_number" VARCHAR(50),
ADD COLUMN     "visa_number" VARCHAR(50);
