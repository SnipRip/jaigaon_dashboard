import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { MAX_FILE_BYTES, XLSX_TYPE } from './import-workbook.js';
import { ImportsService, type ImportJobView } from './imports.service.js';

const MASTER = /^[a-z-]{2,40}$/;

const file = ({ fileName, content }: { fileName: string; content: Buffer }) =>
  new StreamableFile(content, { type: XLSX_TYPE, disposition: `attachment; filename="${fileName}"` });

// Permissions are the master's own (checked in the service): downloading
// needs view, importing needs create and edit.
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  // The import dialog polls this every second while a job runs.
  @SkipThrottle()
  @Get('jobs/:id')
  status(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext): Promise<ImportJobView> {
    return this.imports.status(id, auth);
  }

  @Get('jobs/:id/skipped')
  async skipped(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext): Promise<StreamableFile> {
    return file(await this.imports.skippedSheet(id, auth));
  }

  @Get(':master/sheet')
  async sheet(@Param('master') master: string, @CurrentAuth() auth: AuthContext): Promise<StreamableFile> {
    return file(await this.imports.download(checked(master), auth));
  }

  @Get(':master/latest')
  async latest(@Param('master') master: string, @CurrentAuth() auth: AuthContext): Promise<{ job: ImportJobView | null }> {
    return { job: await this.imports.latest(checked(master), auth) };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':master')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }))
  start(
    @Param('master') master: string,
    @UploadedFile() upload: { buffer: Buffer; originalname: string } | undefined,
    @CurrentAuth() auth: AuthContext,
  ): Promise<ImportJobView> {
    if (!upload) throw new BadRequestException('Choose the Excel file to import');
    if (!/\.(xlsx|csv)$/i.test(upload.originalname)) throw new BadRequestException('Upload an Excel workbook (.xlsx) or a CSV file');
    return this.imports.start(checked(master), auth, upload);
  }
}

function checked(master: string) {
  if (!MASTER.test(master)) throw new BadRequestException('Unknown master');
  return master;
}
