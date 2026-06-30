-- AlterTable
ALTER TABLE "setting" ADD COLUMN     "allowedNotifyAlumniEditRegis" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedNotifyAlumniRegis" BOOLEAN NOT NULL DEFAULT true;
