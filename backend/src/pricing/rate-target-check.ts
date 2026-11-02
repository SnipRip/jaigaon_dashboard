import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { targetProblem, type RateTarget } from './pricing-rules.js';

/**
 * The item or category a special rate or slab is for must exist. Without
 * this, a wrong id would reach the database and read as "in use".
 */
export async function assertTarget(
  db: Prisma.TransactionClient,
  target: RateTarget,
): Promise<void> {
  const problem = targetProblem(target);
  if (problem) throw new BadRequestException(problem);
  const found = target.itemId
    ? await db.item.count({ where: { id: target.itemId } })
    : await db.itemCategory.count({ where: { id: target.categoryId! } });
  if (!found) {
    throw new BadRequestException(
      target.itemId
        ? 'That item does not exist'
        : 'That category does not exist',
    );
  }
}
