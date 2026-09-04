import type { DecimalString } from "./decimal.js";
import type { CurrencyCode } from "./currency.js";
import type { InvoiceDetail } from "./detail.js";

/** Customer input fields for invoice creation. */
export type CreateCustomerInput = {
  readonly fullname: string;
  readonly email: string;
  readonly mobileNumber?: string;
  readonly address?: string;
};

/** Single line-item input for invoice creation. */
export type CreateItemInput = {
  readonly name: string;
  readonly quantity: number;
  readonly rate: DecimalString;
};

/**
 * Invoice creation request - only writable fields, exactly one item.
 */
export type CreateInvoiceRequest = {
  readonly customer: CreateCustomerInput;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly currency: CurrencyCode;
  readonly item: CreateItemInput;
  readonly taxPercent?: DecimalString;
  readonly discount?: DecimalString;
};

/**
 * Invoice creation response - aliases the detail schema.
 * HTTP 201 on success.
 */
export type CreateInvoiceResponse = InvoiceDetail;
