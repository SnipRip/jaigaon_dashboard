import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import { toHttpException } from '../common/filters/prisma-exception.filter.js';
import { canAccess } from '../common/guards/access.guard.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import type { ModuleAction } from '../common/types/module-permissions.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma, type ImportJob } from '../generated/prisma/client.js';
import { ImportStatus } from '../generated/prisma/enums.js';
import {
  isEmptyRow,
  locateColumns,
  RowProblem,
  rowValues,
  type CellValue,
  type ImportColumn,
} from './import-cells.js';
import {
  fingerprintOf,
  PROBLEM_HEADER,
  readUpload,
  RECORD_ID_HEADER,
  sheetHeaders,
  writeSheet,
  type UploadedSheet,
} from './import-workbook.js';
import { ImporterRegistry } from './importer-registry.js';
import type { ImportContext, MasterImporter } from './master-importer.js';
import { RefBook } from './ref-book.js';

/** A job as the API returns it. */
export interface ImportJobView {
  id: string;
  master: string;
  fileName: string;
  totalRows: number;
  /** Rows read so far. */
  doneRows: number;
  created: number;
  updated: number;
  skipped: number;
  status: ImportJob['status'];
  error: string | null;
  /** Set when this upload carried on a stopped import: the first row it read (Excel numbering). */
  resumedFromRow: number | null;
  updatedAt: Date;
}

const toView = (job: ImportJob, resumedFrom: number | null = null): ImportJobView => ({
  id: job.id,
  master: job.master,
  fileName: job.fileName,
  totalRows: job.totalRows,
  doneRows: job.nextRow,
  created: job.created,
  updated: job.updated,
  skipped: job.skipped,
  status: job.status,
  error: job.error,
  resumedFromRow: resumedFrom,
  updatedAt: job.updatedAt,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Excel shows the headings as row 1, so data row i is row i + 2. */
const excelRow = (index: number) => index + 2;
/** Finished jobs (and their skipped rows) are kept this long. */
const KEEP_DAYS = 30;

type Archivable = { id: string; isArchived?: boolean };

const ARCHIVED_COLUMN: ImportColumn<Archivable> = {
  header: 'Archived',
  field: 'isArchived',
  kind: 'yesno',
  hint: 'Yes hides the record from pickers; it stays on old documents.',
  value: (record) => (record.isArchived ? 'Yes' : 'No'),
};

const columnsOf = (importer: MasterImporter) =>
  (importer.archivable ? [...importer.columns, ARCHIVED_COLUMN] : importer.columns) as ImportColumn<Archivable>[];

/** The reason a row was not saved, as the user should read it. */
function reasonOf(error: unknown): string {
  if (error instanceof RowProblem) return error.message;
  const http =
    error instanceof HttpException
      ? error
      : error instanceof Prisma.PrismaClientKnownRequestError
        ? toHttpException(error)
        : null;
  if (http) {
    const body = http.getResponse();
    const message = typeof body === 'string' ? body : (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('; ');
    return typeof message === 'string' ? message : http.message;
  }
  return 'This row could not be saved (unexpected error); check its values';
}

// Imports run as jobs. The upload is read whole (it is small next to memory),
// the job row is created, and the rows are saved one by one in the
// background while the screen polls the job. The job's `nextRow` moves on
// with every row, so a stopped job (server restart, crash) carries on from
// that exact row when the same rows are uploaded again. A row is matched to
// its stored record (record ID, else name / SKU / GSTIN) before saving, so
// running a row twice updates it rather than adding a duplicate.
@Injectable()
export class ImportsService implements OnModuleInit {
  private readonly logger = new Logger(ImportsService.name);
  /** Jobs running in this process. */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ImporterRegistry,
  ) {}

  // A job still marked running at start-up was cut short by a restart.
  async onModuleInit() {
    await this.prisma.importJob.updateMany({
      where: { status: ImportStatus.RUNNING },
      data: { status: ImportStatus.STOPPED, error: 'The server restarted during this import' },
    });
    await this.prisma.importJob.deleteMany({
      where: { status: ImportStatus.DONE, updatedAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } },
    });
  }

  private importerFor(key: string, auth: AuthContext, actions: ModuleAction[]) {
    const importer = this.registry.get(key);
    if (!actions.every((action) => canAccess(auth, importer.module, action))) {
      throw new ForbiddenException(`You do not have permission to ${actions.includes('create') ? 'import' : 'download'} ${importer.title}`);
    }
    return importer;
  }

  /** The master's records as a sheet: edit it, add rows, upload it back. */
  async download(key: string, auth: AuthContext): Promise<{ fileName: string; content: Buffer }> {
    const importer = this.importerFor(key, auth, ['view']);
    const context: ImportContext = { auth, refs: await new RefBook(this.prisma).load(importer.refs) };
    const columns = columnsOf(importer);
    const records = (await importer.list(context)) as Archivable[];
    const rows = records.map((record) => [...columns.map((column) => column.value(record, context.refs)), record.id]);
    return {
      fileName: `${importer.title.replace(/\s+/g, '-')}.xlsx`,
      content: await writeSheet(importer.title, sheetHeaders(columns), columns, rows),
    };
  }

  /**
   * The newest import of this master: still running (show its progress),
   * stopped (offer carrying on) or done (its skipped rows stay downloadable
   * after the dialog was closed).
   */
  async latest(key: string, auth: AuthContext): Promise<ImportJobView | null> {
    this.importerFor(key, auth, ['create', 'edit']);
    const job = await this.prisma.importJob.findFirst({ where: { master: key }, orderBy: { updatedAt: 'desc' } });
    return job ? toView(job) : null;
  }

  async start(key: string, auth: AuthContext, file: { buffer: Buffer; originalname: string }): Promise<ImportJobView> {
    const importer = this.importerFor(key, auth, ['create', 'edit']);
    let sheet: UploadedSheet;
    try {
      sheet = await readUpload(file.buffer, file.originalname);
    } catch (error) {
      throw new BadRequestException(reasonOf(error));
    }
    const positions = locateColumns(columnsOf(importer), sheet.headers);
    if (positions.size === 0) {
      throw new BadRequestException(
        `None of the headings match the ${importer.title} sheet. Download the sheet from this screen and fill that in.`,
      );
    }
    if (sheet.rows.length === 0) throw new BadRequestException('The sheet has headings but no rows.');

    const fingerprint = fingerprintOf(key, sheet);
    const stopped = await this.prisma.importJob.findFirst({
      where: { master: key, fingerprint, status: { not: ImportStatus.DONE } },
      orderBy: { updatedAt: 'desc' },
    });
    // Uploaded again while it is still running: show the same job.
    if (stopped && this.running.has(stopped.id)) return toView(stopped);

    const job = stopped
      ? await this.prisma.importJob.update({
          where: { id: stopped.id },
          data: { status: ImportStatus.RUNNING, error: null, fileName: file.originalname },
        })
      : await this.prisma.importJob.create({
          data: {
            master: key,
            fileName: file.originalname,
            fingerprint,
            headers: sheet.headers,
            totalRows: sheet.rows.length,
            userId: auth.userId,
          },
        });
    this.running.add(job.id);
    void this.run(job, importer, sheet, positions, auth);
    return toView(job, stopped ? excelRow(job.nextRow) : null);
  }

  async status(id: string, auth: AuthContext): Promise<ImportJobView> {
    const job = await this.prisma.importJob.findUniqueOrThrow({ where: { id } });
    this.importerFor(job.master, auth, ['create', 'edit']);
    return toView(job);
  }

  /** The skipped rows as uploaded, with the reason beside each: fix and upload this sheet. */
  async skippedSheet(id: string, auth: AuthContext): Promise<{ fileName: string; content: Buffer }> {
    const job = await this.prisma.importJob.findUniqueOrThrow({
      where: { id },
      include: { skippedRows: { orderBy: { rowNumber: 'asc' } } },
    });
    const importer = this.importerFor(job.master, auth, ['create', 'edit']);
    const headers = (job.headers as string[]).filter((header) => header !== PROBLEM_HEADER);
    const rows = job.skippedRows.map((row) => [...(row.cells as CellValue[]).slice(0, headers.length), row.reason]);
    return {
      fileName: `${importer.title.replace(/\s+/g, '-')}-skipped-rows.xlsx`,
      content: await writeSheet(`Skipped ${importer.title}`, [...headers, PROBLEM_HEADER], columnsOf(importer), rows),
    };
  }

  private async run(
    job: ImportJob,
    importer: MasterImporter,
    sheet: UploadedSheet,
    positions: Map<string, number>,
    auth: AuthContext,
  ) {
    const columns = columnsOf(importer);
    const idIndex = sheet.headers.findIndex((header) => header.toLowerCase() === RECORD_ID_HEADER.toLowerCase());
    try {
      const context: ImportContext = { auth, refs: await new RefBook(this.prisma).load(importer.refs) };
      const resolve = context.refs.idOf.bind(context.refs);
      for (let index = job.nextRow; index < sheet.rows.length; index++) {
        const cells = sheet.rows[index];
        let outcome: 'created' | 'updated' | 'empty';
        try {
          outcome = isEmptyRow(cells)
            ? 'empty'
            : await this.saveRow(importer, rowValues(columns, positions, cells, resolve), idIndex >= 0 ? cells[idIndex] : null, positions, context);
        } catch (error) {
          const reason = reasonOf(error);
          if (!(error instanceof RowProblem || error instanceof HttpException || error instanceof Prisma.PrismaClientKnownRequestError)) {
            this.logger.error(`Import ${job.id} row ${excelRow(index)}`, error as Error);
          }
          // The skipped row and the moved cursor commit together; a repeat
          // after a restart finds the row already listed.
          await this.prisma.$transaction([
            this.prisma.importSkippedRow.upsert({
              where: { jobId_rowNumber: { jobId: job.id, rowNumber: excelRow(index) } },
              create: { jobId: job.id, rowNumber: excelRow(index), cells: cells.map(jsonCell), reason },
              update: { reason, cells: cells.map(jsonCell) },
            }),
            this.prisma.importJob.update({ where: { id: job.id }, data: { nextRow: index + 1, skipped: { increment: 1 } } }),
          ]);
          continue;
        }
        await this.prisma.importJob.update({
          where: { id: job.id },
          data: {
            nextRow: index + 1,
            ...(outcome === 'created' && { created: { increment: 1 } }),
            ...(outcome === 'updated' && { updated: { increment: 1 } }),
          },
        });
      }
      await this.prisma.importJob.update({ where: { id: job.id }, data: { status: ImportStatus.DONE } });
    } catch (error) {
      // The database went away or similar: stop where we are; the same file carries on.
      this.logger.error(`Import ${job.id} stopped`, error as Error);
      await this.prisma.importJob
        .update({ where: { id: job.id }, data: { status: ImportStatus.STOPPED, error: 'The import stopped unexpectedly' } })
        .catch(() => undefined);
    } finally {
      this.running.delete(job.id);
    }
  }

  private async saveRow(
    importer: MasterImporter,
    values: Record<string, unknown>,
    recordIdCell: CellValue,
    positions: Map<string, number>,
    context: ImportContext,
  ): Promise<'created' | 'updated'> {
    const recordId = recordIdCell === null ? '' : String(recordIdCell).trim();
    if (recordId && !UUID.test(recordId)) throw new RowProblem('Record ID was changed; clear it to add the row as a new record');
    const id = recordId || (await importer.findExisting(values, context));
    if (id) {
      await importer.update(id, values, context);
      return 'updated';
    }
    // A new record: a blank Yes / No means No, and archiving waits until it exists.
    const { isArchived, ...fields } = values;
    for (const column of importer.columns) {
      if (column.kind === 'yesno' && positions.has(column.field) && fields[column.field] === undefined) fields[column.field] = false;
    }
    const created = await importer.create(fields, context);
    if (isArchived === true) await importer.update(created, { isArchived: true }, context);
    return 'created';
  }
}

/** Cells as JSON for the skipped-rows table (dates as ISO text, read back as dates by Excel users). */
const jsonCell = (cell: CellValue) => (cell instanceof Date ? cell.toISOString().slice(0, 10) : cell);
