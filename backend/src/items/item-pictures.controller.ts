import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { MAX_PICTURE_BYTES } from './item-picture-rules.js';
import { ItemPicturesService } from './item-pictures.service.js';
import { ITEMS_MODULE } from './items-module-key.js';
import { PictureTooLargeInterceptor } from './picture-too-large.interceptor.js';

// One picture per item. Seeing it needs Items view; uploading or removing it
// counts as editing the item.
@Controller('items/:id/picture')
export class ItemPicturesController {
  constructor(private readonly pictures: ItemPicturesService) {}

  // The screens ask for it as ?v=<pictureVersion>, so a replaced picture has
  // a new URL and the old one can be cached for good.
  @RequireAccess(ITEMS_MODULE, 'view')
  @Get()
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const picture = await this.pictures.get(id);
    return new StreamableFile(picture.bytes, {
      type: picture.contentType,
      length: picture.bytes.length,
      disposition: 'inline',
    });
  }

  /** Stores or replaces the picture (multipart field `file`). */
  @RequireAccess(ITEMS_MODULE, 'edit')
  @Post()
  @UseInterceptors(
    PictureTooLargeInterceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_PICTURE_BYTES, files: 1, fields: 0 } }),
  )
  save(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() upload: { buffer: Buffer } | undefined,
  ): Promise<{ pictureVersion: string }> {
    if (!upload) throw new BadRequestException('Choose a picture to upload');
    return this.pictures.save(id, upload.buffer);
  }

  @RequireAccess(ITEMS_MODULE, 'edit')
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.pictures.remove(id);
  }
}
