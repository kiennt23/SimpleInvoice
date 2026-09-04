import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { InvoiceListPage } from "./InvoiceListPage";

const fetchMock = vi.fn<typeof fetch>();
const row = {
  invoiceId: "invoice-1",
  invoiceNumber: "INV-001",
  customerName: "Ada Lovelace",
  invoiceDate: "2026-08-01",
  dueDate: "2026-08-31",
  totalAmount: "110.00",
  status: "Overdue",
};

function response(data: unknown[], paging = { page: 1, pageSize: 10, total: data.length }) {
  return new Response(JSON.stringify({ data, paging }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function renderList(initialEntry = "/invoices") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/invoices", element: <InvoiceListPage /> },
      { path: "/invoices/:id", element: <h1>Invoice detail</h1> },
    ],
    { initialEntries: [initialEntry] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("invoice list", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders server rows and sends URL filters, paging, and sorting", async () => {
    fetchMock.mockResolvedValueOnce(response([row]));
    renderList(
      "/invoices?page=2&pageSize=25&sortBy=totalAmount&ordering=ASC&status=Overdue&keyword=INV&fromDate=2026-01-01&toDate=2026-12-31",
    );

    expect(await screen.findByText("INV-001")).toBeVisible();
    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    const url = String(fetchMock.mock.calls[0]?.[0]);
    const params = new URL(url, "http://example.test").searchParams;
    expect(Object.fromEntries(params)).toEqual({
      page: "2",
      pageSize: "25",
      sortBy: "totalAmount",
      ordering: "ASC",
      status: "Overdue",
      keyword: "INV",
      fromDate: "2026-01-01",
      toDate: "2026-12-31",
    });
  });

  it("navigates an accessible row with the keyboard", async () => {
    fetchMock.mockResolvedValueOnce(response([row]));
    const router = renderList();
    fireEvent.keyDown(await screen.findByLabelText("Open invoice INV-001"), { key: "Enter" });
    await waitFor(() => expect(router.state.location.pathname).toBe("/invoices/invoice-1"));
  });

  it("shows an empty state with the true total beyond the final page", async () => {
    fetchMock.mockResolvedValueOnce(response([], { page: 5, pageSize: 10, total: 12 }));
    renderList("/invoices?page=5");
    expect(await screen.findByText("No invoices found.")).toBeVisible();
    expect(screen.getByText("Page 5 · 12 total")).toBeVisible();
  });

  it("shows an error state when the request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderList();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load invoices.");
  });
});
