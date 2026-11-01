import type { Prisma } from '../generated/prisma/client.js';

// Prisma returns money and quantities as Decimal, which JSON turns into a
// string. API views send plain numbers; the values fit a double exactly at
// the precision the columns allow (2–4 decimals).
export function toNumber(value: Prisma.Decimal): number;
export function toNumber(value: Prisma.Decimal | null): number | null;
export function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}
