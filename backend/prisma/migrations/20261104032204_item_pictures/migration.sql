-- CreateTable
CREATE TABLE "ItemPicture" (
    "itemId" UUID NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemPicture_pkey" PRIMARY KEY ("itemId")
);

-- AddForeignKey
ALTER TABLE "ItemPicture" ADD CONSTRAINT "ItemPicture_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The same limits the upload route checks (src/items/item-picture-rules.ts):
-- JPEG, PNG or WebP, at most 1 MB.
ALTER TABLE "ItemPicture" ADD CONSTRAINT "ItemPicture_contentType_check"
  CHECK ("contentType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "ItemPicture" ADD CONSTRAINT "ItemPicture_size_check"
  CHECK (octet_length("bytes") BETWEEN 1 AND 1048576);
