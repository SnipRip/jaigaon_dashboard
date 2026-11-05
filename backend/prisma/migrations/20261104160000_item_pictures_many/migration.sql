-- Several pictures per item: each gets its own id; the stored picture stays.
-- The 1 MB and type CHECKs from 20261104032204_item_pictures carry over.
ALTER TABLE "ItemPicture" DROP CONSTRAINT "ItemPicture_pkey";

ALTER TABLE "ItemPicture" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ItemPicture" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ItemPicture" RENAME COLUMN "updatedAt" TO "createdAt";
ALTER TABLE "ItemPicture" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ItemPicture" ADD CONSTRAINT "ItemPicture_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "ItemPicture_itemId_createdAt_idx" ON "ItemPicture"("itemId", "createdAt");
