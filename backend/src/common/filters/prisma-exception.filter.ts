import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client.js';

// Turns the database errors a user can cause into clear 404 / 409 answers,
// so services need no try/catch around every write. Anything else falls
// through to Nest's default handler (a logged 500).
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = toHttpException(error);
    super.catch(mapped ?? error, host);
  }
}

export function toHttpException(
  error: Prisma.PrismaClientKnownRequestError,
): HttpException | null {
  switch (error.code) {
    case 'P2002':
      return new ConflictException(`That ${uniqueFields(error)} is already used`);
    case 'P2003':
      return new ConflictException('This record is in use. Archive it instead.');
    case 'P2025':
      return new NotFoundException('Record not found');
    default:
      return null;
  }
}

// Column names as a person reads them; any other column shows as named.
const FIELD_LABELS: Record<string, string> = {
  arn: 'ARN',
  financialYear: 'financial year',
  gstin: 'GSTIN',
  sku: 'SKU',
  transin: 'TRANSIN',
  skuPrefix: 'SKU prefix',
  uqc: 'UQC',
};

// The pg adapter reports the index ("Item_sku_key"), not the fields; Prisma's
// own engine reports `target`. Foreign-key parts (parentId) are left out of
// the message, so "That name is already used" reads naturally.
function uniqueFields(error: Prisma.PrismaClientKnownRequestError): string {
  const meta = error.meta as
    | {
        target?: unknown;
        modelName?: string;
        driverAdapterError?: { cause?: { constraint?: { fields?: unknown; index?: unknown } } };
      }
    | undefined;
  const constraint = meta?.driverAdapterError?.cause?.constraint;
  let fields: unknown = meta?.target ?? constraint?.fields;
  if (!Array.isArray(fields) && typeof constraint?.index === 'string' && meta?.modelName) {
    const match = new RegExp(`^${meta.modelName}_(.+)_key$`).exec(constraint.index);
    fields = match ? match[1].split('_') : null;
  }
  const names = Array.isArray(fields)
    ? fields
        .map(String)
        .filter((field) => !field.endsWith('Id'))
        .map((field) => FIELD_LABELS[field] ?? field)
    : [];
  return names.length > 0 ? names.join(' and ') : 'name';
}
