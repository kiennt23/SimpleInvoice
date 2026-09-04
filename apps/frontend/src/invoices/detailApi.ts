import { CURRENCIES, type InvoiceDetail, type InvoiceStatus } from "@simpleinvoice/contracts";

import { apiRequest } from "../api/client";

const statuses: readonly InvoiceStatus[] = ["Draft", "Pending", "Paid", "Overdue"];
const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []) {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isDecimal(value: unknown): value is string {
  return typeof value === "string" && decimalPattern.test(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  );
}

function isCustomer(value: unknown) {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["fullname", "email"], ["mobileNumber", "address"]) &&
    typeof value["fullname"] === "string" &&
    typeof value["email"] === "string" &&
    (value["mobileNumber"] === undefined || typeof value["mobileNumber"] === "string") &&
    (value["address"] === undefined || typeof value["address"] === "string")
  );
}

function isItem(value: unknown) {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["name", "quantity", "rate"]) &&
    typeof value["name"] === "string" &&
    Number.isInteger(value["quantity"]) &&
    (value["quantity"] as number) > 0 &&
    isDecimal(value["rate"])
  );
}

export function parseInvoiceDetail(value: unknown): InvoiceDetail {
  const keys = [
    "invoiceId",
    "invoiceNumber",
    "customerName",
    "invoiceDate",
    "dueDate",
    "totalAmount",
    "status",
    "currency",
    "taxPercent",
    "customer",
    "item",
    "subtotal",
    "taxAmount",
    "discount",
    "totalPaid",
    "balanceAmount",
  ];
  if (
    !isRecord(value) ||
    !hasExactKeys(value, keys) ||
    typeof value["invoiceId"] !== "string" ||
    typeof value["invoiceNumber"] !== "string" ||
    typeof value["customerName"] !== "string" ||
    !isDate(value["invoiceDate"]) ||
    !isDate(value["dueDate"]) ||
    !statuses.includes(value["status"] as InvoiceStatus) ||
    !CURRENCIES.some(({ code }) => code === value["currency"]) ||
    !isDecimal(value["taxPercent"]) ||
    !isCustomer(value["customer"]) ||
    !isItem(value["item"]) ||
    !["subtotal", "taxAmount", "discount", "totalAmount", "totalPaid", "balanceAmount"].every(
      (key) => isDecimal(value[key]),
    )
  ) {
    throw new Error("The invoice detail response is invalid");
  }
  return value as InvoiceDetail;
}

export async function fetchInvoiceDetail(id: string): Promise<InvoiceDetail> {
  const value = await apiRequest<unknown>(`/invoices/${encodeURIComponent(id)}`);
  return parseInvoiceDetail(value);
}
