import {
  BadgeCheck,
  Building2,
  Container,
  Landmark,
  ListOrdered,
  Ruler,
  Warehouse,
  ChartColumn,
  CreditCard,
  Database,
  FileText,
  FolderOpen,
  Globe,
  Hash,
  LayoutDashboard,
  MessageCircle,
  Package,
  Receipt,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// The single list of modules from the Scope of Work. The sidebar and the top
// bar title are generated from it.
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line shown under the page title. */
  summary: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Sections follow the work: sell, buy, ship to Bhutan, money, then every
// master in one place (masters-plan.md), then admin.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, summary: "Sales, purchase, profit, stock and shipments at a glance" }],
  },
  {
    label: "Sales",
    items: [
      { href: "/rate-enquiry", label: "Rate enquiry", icon: Search, summary: "Search products, check stock and rates, build a quotation" },
      { href: "/quotations", label: "Quotations", icon: FileText, summary: "Numbering, validity, revisions, status and conversion to invoice" },
      {
        href: "/invoices",
        label: "Sales & invoices",
        icon: Receipt,
        summary: "Local GST invoices and export invoices, with challan, e-way bill, customs papers and BRC attached",
      },
    ],
  },
  {
    label: "Purchases",
    items: [
      {
        href: "/purchases",
        label: "Vendor bills",
        icon: ShoppingCart,
        summary: "Vendor bills with GST and input credit, reverse charge, e-way bills, and freight and labour landed on item cost",
      },
      { href: "/expenses", label: "Expenses", icon: Wallet, summary: "Transport, loading, labour, customs and overheads, and where each cost lands" },
    ],
  },
  {
    label: "Bhutan export",
    items: [
      { href: "/shipments", label: "Shipments", icon: Truck, summary: "Trucks to Bhutan: invoices carried, vehicle, border stage and shipment-wise profit" },
      { href: "/documents", label: "Export documents", icon: FolderOpen, summary: "Shipping bills, LEOs, e-way bills, BRCs and vendor bills in one searchable register" },
      { href: "/ocr-inbox", label: "OCR inbox", icon: ScanLine, summary: "Review extracted data before it updates any record" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { href: "/payments", label: "Payments & outstanding", icon: CreditCard, summary: "Receipts, vendor payments, what is owed, ageing, ledgers and the MSME 45-day rule" },
      { href: "/profit", label: "Actual profit", icon: TrendingUp, summary: "Sales value less purchase cost and allocated expenses, by invoice, shipment, customer and item" },
      { href: "/reports", label: "Reports & MIS", icon: ChartColumn, summary: "Sales, purchase, GST, stock, money and export reports" },
    ],
  },
  {
    label: "Masters",
    items: [
      { href: "/masters", label: "All masters", icon: Database, summary: "Every list the rest of the app picks from, in one place" },
      { href: "/customers", label: "Customers", icon: Users, summary: "Customers in India and Bhutan with GST treatment, place of supply, credit and price level" },
      { href: "/vendors", label: "Vendors", icon: Building2, summary: "Suppliers with GST treatment, whether they give a GST bill, MSME and bank details" },
      { href: "/masters/transporters", label: "Transporters", icon: Truck, summary: "Transporters with their e-way bill ID, and whether they bill as a GTA" },
      { href: "/masters/vehicles", label: "Vehicles", icon: Container, summary: "Own and hired trucks, capacity and driver contact" },
      { href: "/items", label: "Items", icon: Package, summary: "Item master, categories, item groups and variants, units and stock levels" },
      { href: "/masters/brands", label: "Brands", icon: BadgeCheck, summary: "Brands the business stocks, for search and item records" },
      { href: "/masters/units", label: "Units", icon: Ruler, summary: "Units of measure, decimals allowed and the GST unit code" },
      { href: "/masters/godowns", label: "Godowns", icon: Warehouse, summary: "Stores and yards where stock is kept" },
      { href: "/rates", label: "Rates & price levels", icon: Tag, summary: "Item prices, price levels, customer special rates and quantity slabs" },
      { href: "/masters/hsn", label: "HSN / SAC codes", icon: Hash, summary: "Goods and service codes with their GST rate and rate history" },
      { href: "/masters/tax-export", label: "GST & export setup", icon: Globe, summary: "Company GST state, LUT register, IEC, AD code and the export document checklist" },
      { href: "/masters/bank-cash", label: "Bank & cash", icon: Landmark, summary: "Bank accounts and cash books that receipts and payments go through" },
      { href: "/masters/expense-heads", label: "Expense heads", icon: Wallet, summary: "Freight, labour, customs and other heads, with GST behaviour and where each cost lands" },
      { href: "/masters/number-series", label: "Number series", icon: ListOrdered, summary: "Prefix and next number for every document, per financial year" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, summary: "Send messages, message templates, opt-ins and message history" },
      { href: "/users", label: "Users & roles", icon: ShieldCheck, summary: "Staff accounts, role-based access, module permissions and activity history" },
      { href: "/settings", label: "Settings", icon: Settings, summary: "Your profile, password and preferences" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** The most specific page for a path: /masters/hsn is "HSN / SAC codes", not "All masters". */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
}
