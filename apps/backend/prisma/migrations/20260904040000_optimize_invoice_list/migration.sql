-- Support case-insensitive substring search on invoice number and customer name.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Invoice_invoiceNumber_trgm_idx"
ON "Invoice" USING GIN ("invoiceNumber" gin_trgm_ops);

CREATE INDEX "Invoice_customerName_trgm_idx"
ON "Invoice" USING GIN ("customerName" gin_trgm_ops);

-- Support the allowed list sort fields and their deterministic UUID tie-breaker.
CREATE INDEX "Invoice_invoiceDate_invoiceId_idx" ON "Invoice"("invoiceDate", "invoiceId");
CREATE INDEX "Invoice_dueDate_invoiceId_idx" ON "Invoice"("dueDate", "invoiceId");
CREATE INDEX "Invoice_totalAmount_invoiceId_idx" ON "Invoice"("totalAmount", "invoiceId");
