import type { CreateInvoiceRequest, CreateInvoiceResponse } from "@simpleinvoice/contracts";

import { apiRequest } from "../api/client";

export function createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResponse> {
  return apiRequest<CreateInvoiceResponse>("/invoices", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
