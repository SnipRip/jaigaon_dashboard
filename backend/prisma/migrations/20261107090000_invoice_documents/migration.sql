-- Dispatch documents attached to an invoice (IRN, lorry hire challan, e-way
-- bill, customs invoice, packing list, shipping bill, LEO, BRC), one per kind
-- per invoice. Formats are checked in dispatch-document-rules.ts; the CHECKs
-- below keep the basics true whatever writes the row.
-- CreateEnum
CREATE TYPE "DispatchDocumentKind" AS ENUM ('E_INVOICE', 'LORRY_CHALLAN', 'EWAY_BILL', 'CUSTOMS_INVOICE', 'PACKING_LIST', 'SHIPPING_BILL', 'LEO', 'BRC');

-- CreateTable
CREATE TABLE "InvoiceDocument" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "kind" "DispatchDocumentKind" NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "savedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceDocument_kind_number_idx" ON "InvoiceDocument"("kind", "number");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceDocument_invoiceId_kind_key" ON "InvoiceDocument"("invoiceId", "kind");

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDocument" ADD CONSTRAINT "InvoiceDocument_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Basics on every row.
ALTER TABLE "InvoiceDocument"
  ADD CONSTRAINT "InvoiceDocument_number_check" CHECK (length(btrim("number")) BETWEEN 1 AND 64),
  ADD CONSTRAINT "InvoiceDocument_details_check" CHECK (jsonb_typeof("details") = 'object'),
  ADD CONSTRAINT "InvoiceDocument_irn_check" CHECK ("kind" <> 'E_INVOICE' OR "number" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "InvoiceDocument_eway_check" CHECK ("kind" <> 'EWAY_BILL' OR "number" ~ '^[0-9]{12}$');

-- An IRN and an e-way bill are issued for one invoice only.
CREATE UNIQUE INDEX "InvoiceDocument_one_invoice_key" ON "InvoiceDocument"("kind", "number")
  WHERE "kind" IN ('E_INVOICE', 'EWAY_BILL');
