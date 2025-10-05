-- AlterTable
ALTER TABLE "public"."Availability" ADD COLUMN     "comment" TEXT;

-- CreateIndex
CREATE INDEX "Availability_eventDateId_idx" ON "public"."Availability"("eventDateId");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "public"."Availability"("userId");
