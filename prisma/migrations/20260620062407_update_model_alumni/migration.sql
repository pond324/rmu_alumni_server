-- AlterTable
ALTER TABLE "sendTextHistory" ADD COLUMN     "alumni_sender" TEXT;

-- AddForeignKey
ALTER TABLE "sendTextHistory" ADD CONSTRAINT "sendTextHistory_alumni_sender_fkey" FOREIGN KEY ("alumni_sender") REFERENCES "alumni"("alumni_id") ON DELETE SET NULL ON UPDATE CASCADE;
