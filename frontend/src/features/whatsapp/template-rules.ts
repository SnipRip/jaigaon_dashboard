// Template text rules. No React.
import type { MessageTemplate } from "./types";

/** Placeholder numbers used in a body, in order: "Hi {{1}}, {{2}}" → [1, 2]. */
export const placeholdersIn = (body: string) => [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])))].sort((a, b) => a - b);

/** Meta needs placeholders numbered 1, 2, 3 … with no gaps. */
export const placeholdersInOrder = (body: string) => placeholdersIn(body).every((number, index) => number === index + 1);

export const fillTemplate = (template: Pick<MessageTemplate, "body">, values: string[]) =>
  template.body.replace(/\{\{(\d+)\}\}/g, (match, number: string) => values[Number(number) - 1] || match);

/** Meta's template name rule. */
export const TEMPLATE_NAME = /^[a-z0-9_]{1,512}$/;

export const PURPOSES: { value: MessageTemplate["purpose"]; label: string }[] = [
  { value: "quotation", label: "Quotation" },
  { value: "invoice", label: "Invoice" },
  { value: "payment-reminder", label: "Payment reminder" },
  { value: "shipment", label: "Shipment update" },
  { value: "general", label: "General" },
];

export const TEMPLATE_STATUS_TEXT: Record<MessageTemplate["status"], string> = {
  approved: "Approved by Meta",
  pending: "Waiting for Meta",
  rejected: "Rejected by Meta",
  draft: "Draft, not submitted",
};
