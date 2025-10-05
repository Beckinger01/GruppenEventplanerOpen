-- AlterTable
ALTER TABLE "public"."GlobalMessages" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "GlobalMessages_createdAt_idx" ON "public"."GlobalMessages"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."GlobalMessages" ADD CONSTRAINT "GlobalMessages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
