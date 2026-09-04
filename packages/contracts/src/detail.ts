import type { DecimalString } from "./decimal.js";
import type { InvoiceStatus } from "./status.js";
import type { CurrencyCode } from "./currency.js";

/** Customer snapshot - immutable copy at creation time. */
export type CustomerSnapshot = {
  readonly fullname: string;
  readonly email: string;
  readonly mobileNumber?: string;
  readonly address?: string;
};

/** A single line item. */
export type LineItem = {
  readonly name: string;
  readonly quantity: number;
  readonly rate: DecimalString;
};

/**
 * Full invoice detail - row fields at top level plus monetary breakdown,
 * customer snapshot, and line item.
 */
export type InvoiceDetail = {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly customerName: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly totalAmount: DecimalString;
  readonly status: InvoiceStatus;
  readonly currency: CurrencyCode;
  readonly taxPercent: DecimalString;
  readonly customer: CustomerSnapshot;
  readonly item: LineItem;
  readonly subtotal: DecimalString;
  readonly taxAmount: DecimalString;
  readonly discount: DecimalString;
  readonly totalPaid: DecimalString;
  readonly balanceAmount: DecimalString;
};
