/**
 * Invoice status - finite union of all possible effective statuses.
 *
 * The database persists only Draft, Pending, or Paid.
 * Overdue is derived at read time and never stored.
 */
export type InvoiceStatus = "Draft" | "Pending" | "Paid" | "Overdue";

/** Sort fields valid in list queries. */
export type SortField = "invoiceDate" | "dueDate" | "totalAmount";

/** Sort direction. */
export type SortOrder = "ASC" | "DESC";
