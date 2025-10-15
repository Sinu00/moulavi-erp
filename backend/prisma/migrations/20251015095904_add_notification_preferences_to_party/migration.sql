-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "email_notification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketing_notification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sms_notification" BOOLEAN NOT NULL DEFAULT true;
