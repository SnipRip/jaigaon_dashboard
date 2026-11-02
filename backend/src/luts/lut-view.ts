import { isoDate } from '../common/dates.js';
import type { Lut } from '../generated/prisma/client.js';

/** An LUT as the API returns it: dates as YYYY-MM-DD. */
export interface LutView {
  id: string;
  financialYear: string;
  arn: string;
  adCode: string | null;
  validFrom: string;
  validTo: string;
}

export const toLutView = (lut: Lut): LutView => ({
  id: lut.id,
  financialYear: lut.financialYear,
  arn: lut.arn,
  adCode: lut.adCode,
  validFrom: isoDate(lut.validFrom),
  validTo: isoDate(lut.validTo),
});
