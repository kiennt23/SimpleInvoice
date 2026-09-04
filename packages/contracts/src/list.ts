import type { DecimalString } from "./decimal.js";
import type { InvoiceStatus, SortField, SortOrder } from "./status.js";

/** Query parameters for GET /invoices. */
export type ListQuery = {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: SortField;
  readonly ordering?: SortOrder;
  readonly status?: InvoiceStatus;
  readonly keyword?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
};

/** A single row in the invoice list response. */
export type InvoiceListRow = {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly customerName: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly totalAmount: DecimalString;
  readonly status: InvoiceStatus;
};

/** Pagination metadata. */
export type Paging = {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
};

/** List response envelope. */
export type ListResponse = {
  readonly data: readonly InvoiceListRow[];
  readonly paging: Paging;
};
