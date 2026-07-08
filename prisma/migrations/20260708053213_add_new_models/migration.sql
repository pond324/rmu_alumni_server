-- CreateTable
CREATE TABLE "faculty" (
    "faculty_id" TEXT NOT NULL,
    "faculty_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("faculty_id")
);

-- CreateTable
CREATE TABLE "std_departments" (
    "department_id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "std_departments_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "edu_level" (
    "edu_levelId" TEXT NOT NULL,
    "edu_level_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edu_level_pkey" PRIMARY KEY ("edu_levelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "faculty_faculty_id_key" ON "faculty"("faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "std_departments_department_id_key" ON "std_departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "edu_level_edu_levelId_key" ON "edu_level"("edu_levelId");

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("faculty_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "std_departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_edu_levelId_fkey" FOREIGN KEY ("edu_levelId") REFERENCES "edu_level"("edu_levelId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor" ADD CONSTRAINT "professor_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("faculty_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor" ADD CONSTRAINT "professor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "std_departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "std_departments" ADD CONSTRAINT "std_departments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("faculty_id") ON DELETE RESTRICT ON UPDATE CASCADE;
