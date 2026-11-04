import { BadgeCheck, BookOpen, Building2, Container, Globe, HandCoins, Hash, Landmark, ListOrdered, MessageCircle, Package, Ruler, Tag, Truck, Users, Wallet, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { HSN_CODES_PATH } from "@/features/hsn/hsn-api";
import { ITEM_GROUPS_PATH, ITEMS_PATH } from "@/features/items/item-paths";
import { LOANS_PATH } from "@/features/loans/loans-api";
import { LEDGERS_PATH } from "@/features/ledgers/ledgers-api";
import { LiveCount } from "@/features/masters/live-count";
import { ACCOUNT_HEADS_PATH, BANK_CASH_PATH, BRANDS_PATH, GODOWNS_PATH, UNITS_PATH } from "@/features/masters/masters-api";
import { MastersHub } from "@/features/masters/masters-hub";
import { transporters, vehicles } from "@/features/masters/sample-data";
import { CONFIGURED_SERIES_PATH } from "@/features/number-series/number-series-api";
import { PARTIES_PATH } from "@/features/parties/parties-api";
import { SPECIAL_RATES_PATH } from "@/features/rates/rates-api";
import { LUTS_PATH } from "@/features/tax-export/luts-api";
import { templates } from "@/features/whatsapp/sample-data";

export const metadata: Metadata = { title: "Masters" };

const live = <T extends { archived?: boolean }>(records: T[]) => records.filter((record) => !record.archived).length;

export default function MastersPage() {
  return (
    <>
      <SampleDataNotice>Customers, vendors, items, brands, units, godowns, HSN codes, special rates, the LUT register, number series, bank & cash accounts, loans and expense & income heads are live. The other counts are still sample data.</SampleDataNotice>
      <MastersHub
        groups={[
          {
            label: "Parties",
            cards: [
              { href: "/customers", title: "Customers", icon: Users, description: "GST treatment, place of supply, Bhutan buyers with export route and credit.", count: <LiveCount path={`${PARTIES_PATH}?role=customer`} noun={["customer", "customers"]} /> },
              { href: "/vendors", title: "Vendors", icon: Building2, description: "Who gives a GST bill and who does not, composition and transporters, MSME and bank details.", count: <LiveCount path={`${PARTIES_PATH}?role=vendor`} noun={["vendor", "vendors"]} /> },
              { href: "/masters/transporters", title: "Transporters", icon: Truck, description: "Transporter ID for e-way bills, and whether they bill freight under reverse charge.", count: `${live(transporters)} transporters` },
              { href: "/masters/vehicles", title: "Vehicles", icon: Container, description: "Own and hired trucks with capacity and driver contact.", count: `${live(vehicles)} vehicles` },
            ],
          },
          {
            label: "Products and stock",
            cards: [
              { href: "/items", title: "Items", icon: Package, description: "Categories, sub-categories, item groups with variants, units and stock levels.", count: (
                  <>
                    <LiveCount path={ITEMS_PATH} noun={["item", "items"]} /> · <LiveCount path={ITEM_GROUPS_PATH} noun={["group", "groups"]} />
                  </>
                ),
              },
              { href: "/masters/brands", title: "Brands", icon: BadgeCheck, description: "Brands we stock, and which we are authorised dealers for.", count: <LiveCount path={BRANDS_PATH} noun={["brand", "brands"]} /> },
              { href: "/masters/units", title: "Units", icon: Ruler, description: "Units of measure with decimals and the GST unit code.", count: <LiveCount path={UNITS_PATH} noun={["unit", "units"]} /> },
              { href: "/masters/godowns", title: "Godowns", icon: Warehouse, description: "Stores and yards where stock is kept.", count: <LiveCount path={GODOWNS_PATH} noun={["godown", "godowns"]} /> },
            ],
          },
          {
            label: "Tax and export",
            cards: [
              { href: "/masters/hsn", title: "HSN / SAC codes", icon: Hash, description: "Every code with its GST rate. Items take their rate from here.", count: <LiveCount path={HSN_CODES_PATH} noun={["code", "codes"]} /> },
              { href: "/masters/tax-export", title: "GST & export setup", icon: Globe, description: "Our GST state, LUT register, IEC, AD code and the documents each export needs.", count: <LiveCount path={LUTS_PATH} noun={["LUT on record", "LUTs on record"]} /> },
            ],
          },
          {
            label: "Pricing",
            cards: [
              { href: "/rates", title: "Special rates", icon: Tag, description: "Customer special rates with validity. They come before the day's rate on the rate sheet.",
                count: (
                  <>
                    <LiveCount path={SPECIAL_RATES_PATH} noun={["special rate", "special rates"]} />
                  </>
                ),
              },
            ],
          },
          {
            label: "Money and numbering",
            cards: [
              { href: "/masters/bank-cash", title: "Bank & cash", icon: Landmark, description: "Bank accounts and cash books that receipts and payments go through.", count: <LiveCount path={BANK_CASH_PATH} noun={["account", "accounts"]} /> },
              { href: "/loans", title: "Loans", icon: HandCoins, description: "Loans we owe and loans, advances and deposits owed to us, with schedules and reminders.", count: <LiveCount path={LOANS_PATH} noun={["loan", "loans"]} /> },
              { href: "/masters/ledgers", title: "Groups & ledgers", icon: BookOpen, description: "Tally's groups and the general ledgers: capital, sales, purchase, GST, TDS, round off, fixed assets.", count: <LiveCount path={LEDGERS_PATH} noun={["ledger", "ledgers"]} /> },
              { href: "/masters/expense-heads", title: "Expense & income heads", icon: Wallet, description: "Freight, labour, overheads and other incomes, each a Tally ledger under Direct or Indirect Expenses or Incomes.", count: <LiveCount path={ACCOUNT_HEADS_PATH} noun={["head", "heads"]} /> },
              { href: "/masters/number-series", title: "Number series", icon: ListOrdered, description: "How every document and code is numbered: pattern, restart, Tally voucher type.", count: <LiveCount path={CONFIGURED_SERIES_PATH} noun={["set up", "set up"]} /> },
            ],
          },
          {
            label: "Templates",
            cards: [
              { href: "/whatsapp", title: "Message templates", icon: MessageCircle, description: "WhatsApp templates for quotations, invoices, reminders and shipments. Quotation terms are set on the quotation.", count: `${templates.length} templates` },
            ],
          },
        ]}
      />
    </>
  );
}
