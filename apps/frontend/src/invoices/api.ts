import type { InvoiceListRow, InvoiceStatus, ListResponse, Paging } from "@simpleinvoice/contracts";

import { apiRequest } from "../api/client";

const statuses: readonly InvoiceStatus[] = ["Draft", "Pending", "Paid", "Overdue"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRow(value: unknown): value is InvoiceListRow {
  return (
    isRecord(value) &&
    typeof value["invoiceId"] === "string" &&
    typeof value["invoiceNumber"] === "string" &&
    typeof value["customerName"] === "string" &&
    typeof value["invoiceDate"] === "string" &&
    typeof value["dueDate"] === "string" &&
    typeof value["totalAmount"] === "string" &&
    statuses.includes(value["status"] as InvoiceStatus) &&
    Object.keys(value).length === 7
  );
}

function isPaging(value: unknown): value is Paging {
  return (
    isRecord(value) &&
    Number.isInteger(value["page"]) &&
    Number.isInteger(value["pageSize"]) &&
    Number.isInteger(value["total"]) &&
    Object.keys(value).length === 3
  );
}

export function parseListResponse(value: unknown): ListResponse {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    !Array.isArray(value["data"]) ||
    !value["data"].every(isRow) ||
    !isPaging(value["paging"])
  ) {
    throw new Error("The invoice list response is invalid");
  }
  return { data: value["data"], paging: value["paging"] };
}

export async function fetchInvoiceList(params: URLSearchParams): Promise<ListResponse> {
  const value = await apiRequest<unknown>(`/invoices?${params.toString()}`);
  return parseListResponse(value);
}
