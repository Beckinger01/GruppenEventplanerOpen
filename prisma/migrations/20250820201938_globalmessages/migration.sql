/*
  Warnings:

  - You are about to drop the column `used` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "used";

-- CreateTable
CREATE TABLE "public"."GlobalMessages" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "GlobalMessages_pkey" PRIMARY KEY ("id")
);
