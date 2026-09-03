-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "invoiceId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerMobileNumber" TEXT,
    "customerAddress" TEXT,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(19,2) NOT NULL,
    "taxAmount" DECIMAL(19,2) NOT NULL,
    "discount" DECIMAL(19,2) NOT NULL,
    "totalAmount" DECIMAL(19,2) NOT NULL,
    "totalPaid" DECIMAL(19,2) NOT NULL,
    "balanceAmount" DECIMAL(19,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("invoiceId")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckpoint (hand-added; not expressible in schema.prisma)
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_status" CHECK ("status" IN ('Draft', 'Pending', 'Paid'));
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_dueDate_gte_invoiceDate" CHECK ("dueDate" >= "invoiceDate");
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_taxPercent_nonNegative" CHECK ("taxPercent" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_discount_nonNegative" CHECK ("discount" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_subtotal_nonNegative" CHECK ("subtotal" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_taxAmount_nonNegative" CHECK ("taxAmount" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_totalAmount_nonNegative" CHECK ("totalAmount" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_totalPaid_nonNegative" CHECK ("totalPaid" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "CK_Invoice_balanceAmount_nonNegative" CHECK ("balanceAmount" >= 0);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "CK_InvoiceItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "CK_InvoiceItem_rate_positive" CHECK ("rate" > 0);
