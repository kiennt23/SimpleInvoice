import type { InvoiceStatus } from "@simpleinvoice/contracts";

/**
 * STATUS-003/004: an invoice is Overdue when its persisted status is not Paid
 * and its due date is strictly before the business date. A due date equal to
 * the business date is not overdue. ISO YYYY-MM-DD strings compare correctly
 * as plain strings.
 */
export function effectiveStatus(
  status: Exclude<InvoiceStatus, "Overdue">,
  dueDate: string,
  businessDate: string,
): InvoiceStatus {
  if (status === "Paid") {
    return "Paid";
  }
  return isOverdue(dueDate, businessDate) ? "Overdue" : status;
}

/** Strict comparison: dueDate == businessDate is not overdue (STATUS-003). */
export function isOverdue(dueDate: string, businessDate: string): boolean {
  return dueDate < businessDate;
}
