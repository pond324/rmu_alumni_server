-- AlterTable
ALTER TABLE "alumni" ADD COLUMN     "import_historyId" TEXT;

-- AlterTable
ALTER TABLE "professor" ADD COLUMN     "import_historyId" TEXT;

-- CreateTable
CREATE TABLE "import_history" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "total_rows" INTEGER NOT NULL,
    "import_type" TEXT NOT NULL,
    "imported_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_history_imported_by_key" ON "import_history"("imported_by");

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_import_historyId_fkey" FOREIGN KEY ("import_historyId") REFERENCES "import_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor" ADD CONSTRAINT "professor_import_historyId_fkey" FOREIGN KEY ("import_historyId") REFERENCES "import_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
