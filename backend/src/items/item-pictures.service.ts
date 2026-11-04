import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { pictureProblem, pictureType } from './item-picture-rules.js';

export interface ItemPictureFile {
  contentType: string;
  bytes: Uint8Array;
}

// Item pictures live in their own table (see ItemPicture in schema.prisma for
// why the database and not a folder). Deleting the item deletes its picture
// through the cascade.
@Injectable()
export class ItemPicturesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(itemId: string): Promise<ItemPictureFile> {
    const picture = await this.prisma.itemPicture.findUnique({
      where: { itemId },
      select: { contentType: true, bytes: true },
    });
    if (!picture) throw new NotFoundException('This item has no picture');
    return picture;
  }

  /** Stores or replaces the picture; returns the version the picture URL carries. */
  async save(itemId: string, upload: Uint8Array): Promise<{ pictureVersion: string }> {
    const problem = pictureProblem(upload);
    if (problem) throw new BadRequestException(problem);
    // A missing item is a 404 here, not a foreign-key 409 from the upsert.
    await this.prisma.item.findUniqueOrThrow({ where: { id: itemId }, select: { id: true } });

    // Copied into a plain Uint8Array: multer's Buffer may share a larger pool.
    const data = { contentType: pictureType(upload)!, bytes: Uint8Array.from(upload) };
    const picture = await this.prisma.itemPicture.upsert({
      where: { itemId },
      create: { itemId, ...data },
      update: data,
      select: { updatedAt: true },
    });
    return { pictureVersion: picture.updatedAt.toISOString() };
  }

  async remove(itemId: string): Promise<void> {
    await this.prisma.itemPicture.deleteMany({ where: { itemId } });
  }
}
