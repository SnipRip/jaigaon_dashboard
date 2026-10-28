// SAMPLE DATA for staff and roles: invented people and a first proposal of
// roles for the client to confirm.
import { NAV_ITEMS } from "@/config/navigation";
import type { ActivityEntry, Permission, Role, StaffUser } from "./types";

const ALL: Permission[] = ["view", "create", "edit", "delete"];
const modules = NAV_ITEMS.map((item) => item.href);
/** These permissions on the listed modules, or on every module when none are listed. */
const grant = (permissions: Permission[], only: string[] = modules) => Object.fromEntries(only.map((href) => [href, permissions]));

export const roles: Role[] = [
  { id: "owner", name: "Owner", description: "Everything, including users, roles and settings", access: grant(ALL), locked: true },
  {
    id: "accountant",
    name: "Accountant",
    description: "Bills, expenses, payments, GST and reports; reads sales",
    access: {
      ...grant(["view"]),
      ...grant(["view", "create", "edit"], ["/purchases", "/expenses", "/payments", "/masters", "/masters/hsn", "/masters/tax-export", "/vendors"]),
      "/users": [],
    },
  },
  {
    id: "sales",
    name: "Sales",
    description: "Rate enquiry, quotations, invoices and customers; no costs or profit",
    access: {
      ...grant([]),
      ...grant(["view", "create", "edit"], ["/rate-enquiry", "/quotations", "/invoices", "/customers", "/whatsapp"]),
      ...grant(["view"], ["/dashboard", "/items", "/shipments"]),
    },
  },
  {
    id: "store",
    name: "Store",
    description: "Stock, shipments and documents at the yard",
    access: {
      ...grant([]),
      ...grant(["view", "create", "edit"], ["/items", "/shipments", "/documents", "/ocr-inbox"]),
      ...grant(["view"], ["/dashboard", "/purchases"]),
    },
  },
];

export const staff: StaffUser[] = [
  { id: "admin", displayName: "Admin User", email: "admin@example.com", roleId: "owner", status: "active", lastSeen: "2026-10-28T09:30:00+05:30" },
  { id: "accounts", displayName: "Accounts Desk", email: "accounts@example.com", phone: "+919800000301", roleId: "accountant", status: "active", lastSeen: "2026-10-27T18:10:00+05:30" },
  { id: "sales-1", displayName: "Sales Counter", email: "sales@example.com", phone: "+919800000302", roleId: "sales", status: "active", lastSeen: "2026-10-28T08:55:00+05:30" },
  { id: "yard", displayName: "Yard Supervisor", email: "yard@example.com", phone: "+919800000303", roleId: "store", status: "invited" },
  { id: "old-staff", displayName: "Former Staff", email: "former@example.com", roleId: "sales", status: "disabled", lastSeen: "2026-08-14T17:00:00+05:30" },
];

export const activity: ActivityEntry[] = [
  { at: "2026-10-28T09:12:00+05:30", userId: "sales-1", action: "Created quotation", record: "QT/2627/0046" },
  { at: "2026-10-27T18:02:00+05:30", userId: "accounts", action: "Recorded receipt", record: "RCT/2627/0030" },
  { at: "2026-10-27T16:40:00+05:30", userId: "admin", action: "Changed GST rate history", record: "HSN 6810" },
  { at: "2026-10-26T11:15:00+05:30", userId: "accounts", action: "Attached BRC", record: "EXP/2627/0003" },
  { at: "2026-10-24T10:05:00+05:30", userId: "accounts", action: "Saved bill", record: "PUR/2627/0016" },
];
