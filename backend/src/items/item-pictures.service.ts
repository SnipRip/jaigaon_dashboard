import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { MAX_PICTURES_PER_ITEM, TOO_MANY_PICTURES, pictureProblem, pictureType } from './item-picture-rules.js';

export interface ItemPictureFile {
  contentType: string;
  bytes: Uint8Array;
}

// Item pictures live in their own table (see ItemPicture in schema.prisma for
// why the database and not a folder). Deleting the item deletes its pictures
// through the cascade.
@Injectable()
export class ItemPicturesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(itemId: string, pictureId: string): Promise<ItemPictureFile> {
    const picture = await this.prisma.itemPicture.findFirst({
      where: { id: pictureId, itemId },
      select: { contentType: true, bytes: true },
    });
    if (!picture) throw new NotFoundException('This picture does not exist');
    return picture;
  }

  /** Adds a picture to the item; returns its id, which the picture URL carries. */
  async add(itemId: string, upload: Uint8Array): Promise<{ id: string }> {
    const problem = pictureProblem(upload);
    if (problem) throw new BadRequestException(problem);
    // Copied into a plain Uint8Array: multer's Buffer may share a larger pool.
    const data = { itemId, contentType: pictureType(upload)!, bytes: Uint8Array.from(upload) };

    return this.prisma.$transaction(async (tx) => {
      // Locks the item row, so two uploads at once cannot both pass the count.
      // No row is a 404 here, not a foreign-key 409 from the insert.
      const found = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Item" WHERE id = ${itemId}::uuid FOR UPDATE`;
      if (found.length === 0) throw new NotFoundException('This item does not exist');
      if ((await tx.itemPicture.count({ where: { itemId } })) >= MAX_PICTURES_PER_ITEM) {
        throw new BadRequestException(TOO_MANY_PICTURES);
      }
      return tx.itemPicture.create({ data, select: { id: true } });
    });
  }

  async remove(itemId: string, pictureId: string): Promise<void> {
    await this.prisma.itemPicture.deleteMany({ where: { id: pictureId, itemId } });
  }
}
