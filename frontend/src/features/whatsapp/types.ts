// WhatsApp Business (SOW 6): message templates Meta must approve, opt-ins
// (consent comes from the website form), and the messages sent.

export type TemplatePurpose = "quotation" | "invoice" | "payment-reminder" | "shipment" | "general";

export interface MessageTemplate {
  id: string;
  /** Meta's template name: lower case and underscores. */
  name: string;
  purpose: TemplatePurpose;
  category: "utility" | "marketing";
  language: "en" | "hi" | "bn";
  /** Text with {{1}}, {{2}} … placeholders. */
  body: string;
  /** What each placeholder holds, in order. */
  variables: string[];
  /** A PDF goes with it (quotation, invoice). */
  withDocument: boolean;
  status: "approved" | "pending" | "rejected" | "draft";
}

export interface OptIn {
  id: string;
  name: string;
  /** E.164 */
  phone: string;
  partyId?: string;
  source: "website" | "counter";
  at: string;
  consentVersion: string;
  status: "opted-in" | "opted-out";
}

export interface SentMessage {
  id: string;
  at: string;
  partyId: string;
  phone: string;
  templateId: string;
  /** e.g. QT/2627/0043 */
  document?: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
}
