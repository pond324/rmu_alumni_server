-- AlterTable
ALTER TABLE "setting" ADD COLUMN     "allowedAdminAccount" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedAlumniAccount" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedPersonelAccount" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "skipAlumniDuplicate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "skipPersonelDuplicate" BOOLEAN NOT NULL DEFAULT true;
