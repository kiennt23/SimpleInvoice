import { Prisma } from "../generated/prisma/client";
import {
  CURRENCIES,
  isDecimalString,
  type CurrencyCode,
  type DecimalString,
} from "@simpleinvoice/contracts";
import { calculateTotals } from "./money";

/**
 * Raw creation payload as received at the API boundary. Decimal fields are
 * plain strings here - they are parsed (not assumed) by this validator.
 */
export type CreatePayload = {
  readonly customer: {
    readonly fullname: string;
    readonly email: string;
    readonly mobileNumber?: string;
    readonly address?: string;
  };
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly currency: string;
  readonly item: {
    readonly name: string;
    readonly quantity: number;
    readonly rate: string;
  };
  readonly taxPercent?: string;
  readonly discount?: string;
};

export type NormalizedCreatePayload = {
  readonly customer: CreatePayload["customer"];
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly currency: CurrencyCode;
  readonly item: {
    readonly name: string;
    readonly quantity: number;
    readonly rate: DecimalString;
  };
  readonly taxPercent: DecimalString;
  readonly discount: DecimalString;
};

export type ValidateCreateResult =
  | { readonly ok: true; readonly normalized: NormalizedCreatePayload }
  | { readonly ok: false; readonly errors: readonly string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUANTITY_MIN = 1;
const QUANTITY_MAX = 1000000;
const RATE_SCALE_MAX = 4;
const MONEY_SCALE_MAX = 2;
const TAX_PERCENT_SCALE_MAX = 2;

// NUMERIC(19,2) stores at most 17 integer digits: |value| < 10^17.
const MONEY_LIMIT = new Prisma.Decimal("100000000000000000");
// NUMERIC(5,2) stores at most 3 integer digits: |value| < 10^3.
const TAX_PERCENT_LIMIT = new Prisma.Decimal("1000");

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseField(
  errors: string[],
  field: string,
  value: string,
  maxScale: number,
): Prisma.Decimal | undefined {
  if (!isDecimalString(value)) {
    errors.push(
      `${field} must be a canonical decimal string (no exponent, whitespace, or extra symbols)`,
    );
    return undefined;
  }
  const parsed = new Prisma.Decimal(value);
  if (parsed.dp() > maxScale) {
    errors.push(`${field} must not exceed ${maxScale} decimal places`);
    return undefined;
  }
  return parsed;
}

function fitsNumeric(
  value: Prisma.Decimal,
  limit: Prisma.Decimal,
  field: string,
  errors: string[],
): boolean {
  if (value.abs().gte(limit)) {
    errors.push(`${field} exceeds the maximum storable value`);
    return false;
  }
  return true;
}

/**
 * Pure creation-payload validation (CREATE-004..008, MONEY-005/007, DATA-003).
 * Returns every violation as an API-006 message string; the API layer maps a
 * failed result to HTTP 400 before any persistence happens.
 */
export function validateCreatePayload(
  payload: CreatePayload,
  _businessDate: string,
): ValidateCreateResult {
  const errors: string[] = [];

  if (payload.customer.fullname.trim().length === 0) {
    errors.push("customer.fullname is required");
  }
  if (!EMAIL_PATTERN.test(payload.customer.email)) {
    errors.push("customer.email must be a valid email address");
  }
  if (payload.invoiceNumber.trim().length === 0) {
    errors.push("invoiceNumber is required");
  }

  const invoiceDateValid = isDateOnly(payload.invoiceDate);
  if (!invoiceDateValid) {
    errors.push("invoiceDate must be a YYYY-MM-DD date");
  }
  if (!isDateOnly(payload.dueDate)) {
    errors.push("dueDate must be a YYYY-MM-DD date");
  } else if (invoiceDateValid && payload.dueDate < payload.invoiceDate) {
    errors.push("dueDate must be on or after invoiceDate");
  }

  const currency = CURRENCIES.find((entry) => entry.code === payload.currency);
  if (currency === undefined) {
    errors.push("currency must be one of the supported codes (AUD, USD, GBP)");
  }

  if (payload.item.name.trim().length === 0) {
    errors.push("item.name is required");
  }
  if (
    !Number.isInteger(payload.item.quantity) ||
    payload.item.quantity < QUANTITY_MIN ||
    payload.item.quantity > QUANTITY_MAX
  ) {
    errors.push(`item.quantity must be an integer between ${QUANTITY_MIN} and ${QUANTITY_MAX}`);
  }

  const rate = parseField(errors, "item.rate", payload.item.rate, RATE_SCALE_MAX);
  if (rate !== undefined && rate.lte(0)) {
    errors.push("item.rate must be positive");
  }

  const taxPercent = parseField(
    errors,
    "taxPercent",
    payload.taxPercent ?? "10",
    TAX_PERCENT_SCALE_MAX,
  );
  if (taxPercent !== undefined && taxPercent.lt(0)) {
    errors.push("taxPercent must be non-negative");
  }

  const discount = parseField(errors, "discount", payload.discount ?? "0", MONEY_SCALE_MAX);
  if (discount !== undefined && discount.lt(0)) {
    errors.push("discount must be non-negative");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // All fields parsed - the non-undefined assertions below hold by construction.
  const totals = calculateTotals({
    quantity: payload.item.quantity,
    rate: payload.item.rate as DecimalString,
    taxPercent: (payload.taxPercent ?? "10") as DecimalString,
    discount: (payload.discount ?? "0") as DecimalString,
  });

  if (discount !== undefined && totals.subtotal.plus(totals.taxAmount).lt(discount)) {
    errors.push("discount must not exceed subtotal plus taxAmount");
  }

  for (const [field, value] of [
    ["subtotal", totals.subtotal],
    ["taxAmount", totals.taxAmount],
    ["discount", discount ?? new Prisma.Decimal(0)],
    ["totalAmount", totals.totalAmount],
    ["totalPaid", new Prisma.Decimal(0)],
    ["balanceAmount", totals.balanceAmount],
  ] as const) {
    fitsNumeric(value, MONEY_LIMIT, field, errors);
  }
  if (taxPercent !== undefined) {
    fitsNumeric(taxPercent, TAX_PERCENT_LIMIT, "taxPercent", errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    normalized: {
      customer: payload.customer,
      invoiceNumber: payload.invoiceNumber,
      invoiceDate: payload.invoiceDate,
      dueDate: payload.dueDate,
      currency: payload.currency as CurrencyCode,
      item: {
        name: payload.item.name,
        quantity: payload.item.quantity,
        rate: payload.item.rate as DecimalString,
      },
      taxPercent: (payload.taxPercent ?? "10") as DecimalString,
      discount: (payload.discount ?? "0") as DecimalString,
    },
  };
}
