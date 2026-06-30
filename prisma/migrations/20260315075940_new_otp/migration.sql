/*
  Warnings:

  - You are about to drop the column `continued_study` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `edu_dep` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `edu_faculty` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `edu_level` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `edu_performance` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `edu_university` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `year_end` on the `work_expreriences` table. All the data in the column will be lost.
  - You are about to drop the column `year_start` on the `work_expreriences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "work_expreriences" DROP COLUMN "continued_study",
DROP COLUMN "edu_dep",
DROP COLUMN "edu_faculty",
DROP COLUMN "edu_level",
DROP COLUMN "edu_performance",
DROP COLUMN "edu_university",
DROP COLUMN "year_end",
DROP COLUMN "year_start";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studey_expreriences" (
    "id" SERIAL NOT NULL,
    "edu_level" TEXT,
    "continued_study" BOOLEAN NOT NULL DEFAULT false,
    "edu_faculty" TEXT,
    "edu_dep" TEXT,
    "edu_university" TEXT,
    "year_start" TEXT,
    "year_end" TEXT,
    "edu_performance" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isInThai" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alumniId" TEXT,

    CONSTRAINT "studey_expreriences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin" (
    "admin_id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profile" TEXT,
    "passwordHash" TEXT NOT NULL,
    "canUse" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "tel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "sendTextHistory" (
    "id" SERIAL NOT NULL,
    "alumniId" TEXT,
    "professorId" TEXT,
    "adminId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sendTextHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "alumniId" TEXT,
    "professorId" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_admin_id_key" ON "admin"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_username_key" ON "admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "otp_alumniId_key" ON "otp"("alumniId");

-- CreateIndex
CREATE UNIQUE INDEX "otp_professorId_key" ON "otp"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "otp_adminId_key" ON "otp"("adminId");

-- AddForeignKey
ALTER TABLE "studey_expreriences" ADD CONSTRAINT "studey_expreriences_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni"("alumni_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sendTextHistory" ADD CONSTRAINT "sendTextHistory_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professor"("professor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sendTextHistory" ADD CONSTRAINT "sendTextHistory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professor"("professor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni"("alumni_id") ON DELETE SET NULL ON UPDATE CASCADE;
