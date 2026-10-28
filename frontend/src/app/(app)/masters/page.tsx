import { BadgeCheck, Building2, Container, Globe, Hash, Landmark, ListOrdered, MessageCircle, Package, Ruler, Tag, Truck, Users, Wallet, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { hsnCodes } from "@/features/hsn/sample-data";
import { itemGroups, items } from "@/features/items/sample-data";
import { MastersHub } from "@/features/masters/masters-hub";
import { brands, expenseHeads, godowns, moneyAccounts, numberSeries, transporters, units, vehicles } from "@/features/masters/sample-data";
import { parties } from "@/features/parties/sample-data";
import { priceLevels, specialRates } from "@/features/rates/sample-data";
import { lutRegister } from "@/features/tax-export/sample-data";
import { templates } from "@/features/whatsapp/sample-data";

export const metadata: Metadata = { title: "Masters" };

const count = (role: "customer" | "vendor") => parties.filter((party) => party.roles.includes(role)).length;
const live = <T extends { archived?: boolean }>(records: T[]) => records.filter((record) => !record.archived).length;
const hsn = hsnCodes.filter((code) => code.kind === "HSN").length;
const sac = hsnCodes.filter((code) => code.kind === "SAC").length;

export default function MastersPage() {
  return (
    <>
      <SampleDataNotice />
      <MastersHub
        groups={[
          {
            label: "Parties",
            cards: [
              { href: "/customers", title: "Customers", icon: Users, description: "GST treatment, place of supply, Bhutan buyers with export route, credit and price level.", count: `${count("customer")} customers` },
              { href: "/vendors", title: "Vendors", icon: Building2, description: "Who gives a GST bill and who does not, composition and transporters, MSME and bank details.", count: `${count("vendor")} vendors` },
              { href: "/masters/transporters", title: "Transporters", icon: Truck, description: "Transporter ID for e-way bills, and whether they bill freight under reverse charge.", count: `${live(transporters)} transporters` },
              { href: "/masters/vehicles", title: "Vehicles", icon: Container, description: "Own and hired trucks with capacity and driver contact.", count: `${live(vehicles)} vehicles` },
            ],
          },
          {
            label: "Products and stock",
            cards: [
              { href: "/items", title: "Items", icon: Package, description: "Categories, sub-categories, item groups with variants, units and stock levels.", count: `${items.length} items · ${itemGroups.length} groups` },
              { href: "/masters/brands", title: "Brands", icon: BadgeCheck, description: "Brands we stock, and which we are authorised dealers for.", count: `${live(brands)} brands` },
              { href: "/masters/units", title: "Units", icon: Ruler, description: "Units of measure with decimals and the GST unit code.", count: `${live(units)} units` },
              { href: "/masters/godowns", title: "Godowns", icon: Warehouse, description: "Stores and yards where stock is kept.", count: `${live(godowns)} godowns` },
            ],
          },
          {
            label: "Tax and export",
            cards: [
              { href: "/masters/hsn", title: "HSN / SAC codes", icon: Hash, description: "Every code with its GST rate. Items take their rate from here.", count: `${hsn} HSN · ${sac} SAC` },
              { href: "/masters/tax-export", title: "GST & export setup", icon: Globe, description: "Our GST state, LUT register, IEC, AD code and the documents each export needs.", count: `${lutRegister.length} LUTs on record` },
            ],
          },
          {
            label: "Pricing",
            cards: [
              { href: "/rates", title: "Price levels & special rates", icon: Tag, description: "Retail, contractor, dealer and Bhutan levels; customer special rates; quantity slabs.", count: `${live(priceLevels)} levels · ${live(specialRates)} special rates` },
            ],
          },
          {
            label: "Money and numbering",
            cards: [
              { href: "/masters/bank-cash", title: "Bank & cash", icon: Landmark, description: "Bank accounts and cash books that receipts and payments go through.", count: `${live(moneyAccounts)} accounts` },
              { href: "/masters/expense-heads", title: "Expense heads", icon: Wallet, description: "Freight, labour, customs and overheads, with GST behaviour and where each cost lands.", count: `${live(expenseHeads)} heads` },
              { href: "/masters/number-series", title: "Number series", icon: ListOrdered, description: "Prefix and next number for every document, per financial year.", count: `${live(numberSeries)} series` },
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
