import { PartialType } from '@nestjs/mapped-types';
import type { Type } from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';

// The update DTO of a master: every create field optional, plus the archive
// flag. A record in use is archived instead of deleted.
export function ArchivableUpdate<T>(create: Type<T>) {
  // Typed loosely here so TypeScript accepts a generic base class; the
  // return type below restores the real shape.
  const Base = PartialType(create) as Type<object>;
  class Update extends Base {
    @IsOptional()
    @IsBoolean()
    isArchived?: boolean;
  }
  return Update as Type<Partial<T> & { isArchived?: boolean }>;
}

/** Prisma `where` for a list route: archived records only on request. */
export const archivedFilter = (includeArchived?: boolean) =>
  includeArchived ? {} : { isArchived: false };
