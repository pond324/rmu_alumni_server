-- CreateTable
CREATE TABLE "setting" (
    "id" SERIAL NOT NULL,
    "regis_payment_qrcode" TEXT,
    "regis_payment" INTEGER,
    "fac_sheet_link" TEXT,
    "dep_sheet_link" TEXT,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);
