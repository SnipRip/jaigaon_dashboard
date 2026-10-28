// SAMPLE DATA for WhatsApp: template wording is a first draft for the client
// to approve; opt-ins and messages are invented. Real opt-ins are recorded
// by the website form in the backend's whatsapp_opt_ins table.
import type { MessageTemplate, OptIn, SentMessage } from "./types";

export const templates: MessageTemplate[] = [
  {
    id: "quotation_sent",
    name: "quotation_sent",
    purpose: "quotation",
    category: "utility",
    language: "en",
    body: "Hello {{1}}, please find quotation {{2}} for {{3}} attached. Rates are valid till {{4}}. Reply here to confirm the order. – Jaigaon Quality Enterprise",
    variables: ["Customer name", "Quotation number", "Amount", "Valid till"],
    withDocument: true,
    status: "approved",
  },
  {
    id: "invoice_issued",
    name: "invoice_issued",
    purpose: "invoice",
    category: "utility",
    language: "en",
    body: "Hello {{1}}, invoice {{2}} for {{3}} is attached. Please quote {{2}} in the payment remarks. Thank you for your business.",
    variables: ["Customer name", "Invoice number", "Amount"],
    withDocument: true,
    status: "approved",
  },
  {
    id: "payment_reminder",
    name: "payment_reminder",
    purpose: "payment-reminder",
    category: "utility",
    language: "en",
    body: "Hello {{1}}, a gentle reminder that {{2}} against invoice {{3}} was due on {{4}}. Please ignore if already paid.",
    variables: ["Customer name", "Amount", "Invoice number", "Due date"],
    withDocument: false,
    status: "pending",
  },
  {
    id: "shipment_update",
    name: "shipment_update",
    purpose: "shipment",
    category: "utility",
    language: "en",
    body: "Hello {{1}}, your goods on vehicle {{2}} are now: {{3}}. Driver {{4}}.",
    variables: ["Customer name", "Vehicle number", "Stage", "Driver phone"],
    withDocument: false,
    status: "draft",
  },
];

export const optIns: OptIn[] = [
  { id: "oi-1", name: "Tashi Construction", phone: "+97577000001", partyId: "tashi-construction", source: "website", at: "2026-10-12T10:42:00+05:30", consentVersion: "2026-10-01", status: "opted-in" },
  { id: "oi-2", name: "Druk Builders", phone: "+97577000002", partyId: "druk-builders", source: "website", at: "2026-10-14T16:05:00+05:30", consentVersion: "2026-10-01", status: "opted-in" },
  { id: "oi-3", name: "Siliguri Infra Projects", phone: "+919800000003", partyId: "siliguri-infra", source: "counter", at: "2026-10-18T12:20:00+05:30", consentVersion: "2026-10-01", status: "opted-in" },
  { id: "oi-4", name: "Guwahati Hardware Mart", phone: "+919800000004", partyId: "guwahati-hardware", source: "website", at: "2026-10-20T09:15:00+05:30", consentVersion: "2026-10-01", status: "opted-out" },
];

export const sentMessages: SentMessage[] = [
  { id: "m-1", at: "2026-10-18T11:02:00+05:30", partyId: "tashi-construction", phone: "+97577000001", templateId: "quotation_sent", document: "QT/2627/0041-R1", status: "read" },
  { id: "m-2", at: "2026-10-21T15:40:00+05:30", partyId: "tashi-construction", phone: "+97577000001", templateId: "invoice_issued", document: "EXP/2627/0004", status: "delivered" },
  { id: "m-3", at: "2026-10-22T10:10:00+05:30", partyId: "druk-builders", phone: "+97577000002", templateId: "quotation_sent", document: "QT/2627/0043", status: "read" },
  { id: "m-4", at: "2026-10-14T12:00:00+05:30", partyId: "siliguri-infra", phone: "+919800000003", templateId: "quotation_sent", document: "QT/2627/0044", status: "failed" },
];
