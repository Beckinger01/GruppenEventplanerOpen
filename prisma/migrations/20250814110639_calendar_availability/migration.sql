/*
  Warnings:

  - You are about to drop the column `date` on the `EventDate` table. All the data in the column will be lost.
  - You are about to drop the column `eventDateId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[day]` on the table `EventDate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `day` to the `EventDate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('AVAILABLE', 'MAYBE', 'UNAVAILABLE');

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_eventDateId_fkey";

-- DropIndex
DROP INDEX "public"."EventDate_date_key";

-- AlterTable
ALTER TABLE "public"."EventDate" DROP COLUMN "date",
ADD COLUMN     "day" DATE NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "eventDateId";

-- CreateTable
CREATE TABLE "public"."Availability" (
    "userId" INTEGER NOT NULL,
    "eventDateId" INTEGER NOT NULL,
    "status" "public"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("userId","eventDateId")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventDate_day_key" ON "public"."EventDate"("day");

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_eventDateId_fkey" FOREIGN KEY ("eventDateId") REFERENCES "public"."EventDate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
