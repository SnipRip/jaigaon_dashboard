import { Injectable } from '@nestjs/common';
import { isoDate, todayInIndia } from '../common/dates.js';
import { toNumber } from '../common/decimal.js';
import { canAccess } from '../common/guards/access.guard.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
import { stockOnHand } from '../items/item-costs.js';
import { inherited } from '../items/item-rules.js';
import { QUOTATIONS_MODULE } from '../quotations/quotations.controller.js';
import { quotationLabel } from '../sale-pricing/sale-rules.js';
import { PAYMENTS_MODULE } from '../settlements/settlements.controller.js';
import { SettlementsService } from '../settlements/settlements.service.js';
import type { RateEnquiryQueryDto } from './dto/rate-enquiry-query.dto.js';
import { LINE_ITEM_SELECT, LineRateOptionsService } from './line-rate-options.service.js';
import type { RateEnquiryCustomerView, RateEnquiryView } from './rate-enquiry-views.js';

const unitOf = { defaultUnit: { select: { symbol: true } } } as const;

// Rate enquiry (SOW section 4): search every live item, see its stock and the
// rate it would go at for this customer today. Rates come from the same
// LineRateOptionsService a quotation line uses (special rate → the day's
// price list), so the enquiry and the quotation it turns into always agree.
@Injectable()
export class RateEnquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lineOptions: LineRateOptionsService,
    private readonly settlements: SettlementsService,
  ) {}

  async enquiry(auth: AuthContext, query: RateEnquiryQueryDto): Promise<RateEnquiryView> {
    const date = query.date ?? todayInIndia();
    const items = await this.prisma.item.findMany({
      where: { isArchived: false },
      orderBy: [{ name: 'asc' }, { sku: 'asc' }],
      select: {
        ...LINE_ITEM_SELECT,
        name: true,
        sku: true,
        reorderLevel: true,
        brand: { select: { name: true } },
        unit: { select: { symbol: true } },
        group: { select: unitOf },
        category: { select: { name: true, ...unitOf } },
        subCategory: { select: { name: true, ...unitOf } },
      },
    });
    // forItems checks the party is a customer before anything is read about it.
    const options = await this.lineOptions.forItems(items, { partyId: query.partyId, date });
    const customer = query.partyId ? await this.customerFacts(auth, query.partyId) : null;
    return {
      date,
      partyId: query.partyId ?? null,
      customer,
      items: items.map((item, index) => ({
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        unit: inherited(item.unit?.symbol, item.group?.defaultUnit?.symbol, item.subCategory?.defaultUnit?.symbol, item.category.defaultUnit?.symbol),
        categoryId: item.categoryId,
        categoryName: item.category.name,
        subCategoryName: item.subCategory?.name ?? null,
        brandName: item.brand?.name ?? null,
        stock: stockOnHand(item),
        reorderLevel: toNumber(item.reorderLevel),
        options: options[index],
      })),
    };
  }

  /** Outstanding and the last quotation, each only when the role may open that screen. */
  private async customerFacts(auth: AuthContext, partyId: string): Promise<RateEnquiryCustomerView> {
    const may = (module: string) => canAccess(auth, module, 'view');
    const [documents, quotation] = await Promise.all([
      may(PAYMENTS_MODULE) ? this.settlements.documents('RECEIPT', partyId) : null,
      may(QUOTATIONS_MODULE)
        ? this.prisma.quotation.findFirst({
            where: { partyId, status: { in: ['SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED'] } },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            select: { id: true, number: true, revision: true, date: true },
          })
        : undefined,
    ]);
    const facts: RateEnquiryCustomerView = {};
    if (documents) facts.outstanding = Math.round(documents.reduce((sum, document) => sum + document.balance, 0) * 100) / 100;
    if (quotation !== undefined) {
      facts.lastQuotation = quotation && { id: quotation.id, number: quotationLabel(quotation.number, quotation.revision), date: isoDate(quotation.date) };
    }
    return facts;
  }
}
