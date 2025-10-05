-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "eventDateId" INTEGER;

-- CreateTable
CREATE TABLE "public"."EventDate" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "EventDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventDate_date_key" ON "public"."EventDate"("date");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_eventDateId_fkey" FOREIGN KEY ("eventDateId") REFERENCES "public"."EventDate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
