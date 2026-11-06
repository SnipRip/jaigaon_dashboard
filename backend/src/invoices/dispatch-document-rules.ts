// The papers that follow an invoice and what each must look like. Pure; the
// frontend's features/invoices/dispatch-documents.ts has the same fields for
// the form. A saved document's details are cleaned here: amounts and weights
// become numbers, codes are upper-cased, blanks are dropped.
import type { DispatchDocumentKind, GstTreatment, InvoiceKind } from '../generated/prisma/enums.js';

type FieldType = 'text' | 'amount' | 'count' | 'kg' | 'date' | 'vehicle' | 'port' | 'ack';

interface DocumentRule {
  name: string;
  /** Which invoices take it. */
  for: InvoiceKind[];
  numberPattern?: RegExp;
  numberMessage?: string;
  /** IRN in lower case; other numbers as typed (trimmed). */
  normalise?: (number: string) => string;
  fields: Record<string, FieldType>;
}

export const DOCUMENT_RULES: Record<DispatchDocumentKind, DocumentRule> = {
  E_INVOICE: {
    name: 'E-invoice (IRN)',
    for: ['LOCAL', 'EXPORT'],
    numberPattern: /^[0-9a-f]{64}$/,
    numberMessage: 'The IRN is 64 letters (a–f) and digits',
    normalise: (number) => number.toLowerCase(),
    fields: { ackNo: 'ack' },
  },
  LORRY_CHALLAN: {
    name: 'Lorry hire challan',
    for: ['LOCAL', 'EXPORT'],
    fields: { transporter: 'text', vehicle: 'vehicle', freight: 'amount' },
  },
  EWAY_BILL: {
    name: 'E-way bill',
    for: ['LOCAL', 'EXPORT'],
    numberPattern: /^\d{12}$/,
    numberMessage: 'An e-way bill number is 12 digits',
    fields: { validUntil: 'date' },
  },
  CUSTOMS_INVOICE: { name: 'Customs invoice', for: ['EXPORT'], fields: { fobValue: 'amount' } },
  PACKING_LIST: { name: 'Packing list', for: ['EXPORT'], fields: { packages: 'count', grossKg: 'kg' } },
  SHIPPING_BILL: {
    name: 'Shipping bill',
    for: ['EXPORT'],
    numberPattern: /^\d{6,8}$/,
    numberMessage: 'A shipping bill number is 6 to 8 digits (usually 7)',
    fields: { portCode: 'port' },
  },
  LEO: { name: 'LEO', for: ['EXPORT'], fields: {} },
  BRC: { name: 'BRC / e-BRC', for: ['EXPORT'], fields: { amount: 'amount', bank: 'text' } },
};

const FIELD_FORMATS: Record<FieldType, { pattern: RegExp; message: string }> = {
  text: { pattern: /^.{1,120}$/s, message: 'is up to 120 characters' },
  amount: { pattern: /^\d{1,12}(\.\d{1,2})?$/, message: 'is an amount in rupees' },
  count: { pattern: /^\d{1,6}$/, message: 'is a whole number' },
  kg: { pattern: /^\d{1,9}(\.\d{1,3})?$/, message: 'is a weight in kilograms' },
  date: { pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'is a date (YYYY-MM-DD)' },
  vehicle: { pattern: /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/, message: 'is like WB73E1234, no spaces' },
  port: { pattern: /^[A-Z0-9]{6}$/, message: 'is 6 letters and digits, like INJIGB' },
  ack: { pattern: /^\d{15}$/, message: 'is 15 digits' },
};

/** The name inside a sentence: "e-way bill", but "LEO" and "BRC / e-BRC" stay as they are. */
export const nameInText = (kind: DispatchDocumentKind) => {
  const { name } = DOCUMENT_RULES[kind];
  return /^[A-Z]{2}/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
};

const NUMERIC: FieldType[] = ['amount', 'count', 'kg'];
const UPPER: FieldType[] = ['vehicle', 'port'];

/** B2B invoices and exports get an IRN (turnover above ₹5 crore); consumers and unregistered buyers do not. */
export const needsEinvoice = (kind: InvoiceKind, treatment: GstTreatment) =>
  kind === 'EXPORT' || treatment === 'REGISTERED' || treatment === 'COMPOSITION' || treatment === 'SEZ';

/** Can this kind of paper be attached to this invoice at all? */
export function documentKindProblem(kind: DispatchDocumentKind, invoiceKind: InvoiceKind, treatment: GstTreatment): string | null {
  const rule = DOCUMENT_RULES[kind];
  if (!rule.for.includes(invoiceKind)) return `A ${nameInText(kind)} is for export invoices only`;
  if (kind === 'E_INVOICE' && !needsEinvoice(invoiceKind, treatment)) return 'A sale to a consumer or an unregistered buyer has no IRN';
  return null;
}

/** The number as stored, or why it is wrong. */
export function cleanNumber(kind: DispatchDocumentKind, typed: string): { number: string } | { problem: string } {
  const rule = DOCUMENT_RULES[kind];
  const number = (rule.normalise ?? ((value: string) => value))(typed.trim());
  if (!number) return { problem: 'Enter the document number' };
  if (number.length > 64) return { problem: 'The number is up to 64 characters' };
  if (rule.numberPattern && !rule.numberPattern.test(number)) return { problem: rule.numberMessage ?? 'Check the number' };
  return { number };
}

export type DocumentDetails = Record<string, string | number>;

/** The kind's fields, checked and cleaned; unknown keys are refused, blanks dropped. */
export function cleanDetails(kind: DispatchDocumentKind, typed: Record<string, unknown>): { details: DocumentDetails } | { problem: string } {
  const fields = DOCUMENT_RULES[kind].fields;
  const details: DocumentDetails = {};
  for (const [key, raw] of Object.entries(typed)) {
    const type = fields[key];
    if (!type) return { problem: `A ${nameInText(kind)} has no field "${key}"` };
    if (raw === null || raw === undefined) continue;
    if (typeof raw !== 'string' && typeof raw !== 'number') return { problem: `${key} ${FIELD_FORMATS[type].message}` };
    let value = String(raw).trim();
    if (!value) continue;
    if (UPPER.includes(type)) value = value.toUpperCase();
    if (!FIELD_FORMATS[type].pattern.test(value)) return { problem: `${key} ${FIELD_FORMATS[type].message}` };
    details[key] = NUMERIC.includes(type) ? Number(value) : value;
  }
  return { details };
}

/**
 * Dates: a paper follows its invoice, so it is dated on or after it and not
 * after today. An e-way bill is valid until a day on or after it was made.
 */
export function documentDateProblem(document: { date: string; details: DocumentDetails }, invoiceDate: string, today: string): string | null {
  if (document.date < invoiceDate) return 'The document is dated before the invoice';
  if (document.date > today) return 'The document is dated after today';
  const validUntil = document.details.validUntil;
  if (typeof validUntil === 'string' && validUntil < document.date) return 'Valid until is before the e-way bill date';
  return null;
}
