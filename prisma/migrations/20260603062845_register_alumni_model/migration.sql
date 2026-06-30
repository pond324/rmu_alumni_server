-- CreateTable
CREATE TABLE "regis_alumni" (
    "id" SERIAL NOT NULL,
    "alumni_id" TEXT,
    "email" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "slip_payment_url" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regis_alumni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regis_alumni_alumni_id_key" ON "regis_alumni"("alumni_id");

-- AddForeignKey
ALTER TABLE "regis_alumni" ADD CONSTRAINT "regis_alumni_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "alumni"("alumni_id") ON DELETE SET NULL ON UPDATE CASCADE;
