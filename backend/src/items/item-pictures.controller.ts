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

// An item's pictures, for sending to clients. Seeing one needs Items view;
// adding or removing one counts as editing the item.
@Controller('items/:id/pictures')
export class ItemPicturesController {
  constructor(private readonly pictures: ItemPicturesService) {}

  // A picture is never replaced, so its URL can be cached for good.
  @RequireAccess(ITEMS_MODULE, 'view')
  @Get(':pictureId')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pictureId', ParseUUIDPipe) pictureId: string,
  ): Promise<StreamableFile> {
    const picture = await this.pictures.get(id, pictureId);
    return new StreamableFile(picture.bytes, {
      type: picture.contentType,
      length: picture.bytes.length,
      disposition: 'inline',
    });
  }

  /** Adds one picture (multipart field `file`); returns its id. */
  @RequireAccess(ITEMS_MODULE, 'edit')
  @Post()
  @UseInterceptors(
    PictureTooLargeInterceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_PICTURE_BYTES, files: 1, fields: 0 } }),
  )
  add(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() upload: { buffer: Buffer } | undefined,
  ): Promise<{ id: string }> {
    if (!upload) throw new BadRequestException('Choose a picture to upload');
    return this.pictures.add(id, upload.buffer);
  }

  @RequireAccess(ITEMS_MODULE, 'edit')
  @Delete(':pictureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pictureId', ParseUUIDPipe) pictureId: string,
  ): Promise<void> {
    return this.pictures.remove(id, pictureId);
  }
}
