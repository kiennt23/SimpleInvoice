import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { InvoiceDetailPage } from "./InvoiceDetailPage";

const fetchMock = vi.fn<typeof fetch>();
const detail = {
  invoiceId: "invoice-14",
  invoiceNumber: "INV-014",
  customerName: "Grace Hopper",
  invoiceDate: "2026-08-01",
  dueDate: "2026-08-31",
  totalAmount: "106.05",
  status: "Overdue",
  currency: "USD",
  taxPercent: "7.50",
  customer: {
    fullname: "Grace Hopper",
    email: "grace@example.com",
    mobileNumber: "+1 555 014",
    address: "14 Compiler Way",
  },
  item: { name: "Consulting", quantity: 3, rate: "33.3500" },
  subtotal: "100.05",
  taxAmount: "7.50",
  discount: "1.50",
  totalPaid: "20.00",
  balanceAmount: "86.05",
};

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/invoices", element: <h1>Invoices</h1> },
      { path: "/invoices/:id", element: <InvoiceDetailPage /> },
    ],
    { initialEntries: ["/invoices/invoice-14"] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(min-width: 48rem)" ? width >= 768 : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("invoice detail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([375, 1280])("keeps all detail sections available at a %ipx viewport", async (width) => {
    setViewport(width);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }));
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Invoice INV-014" })).toBeVisible();
    for (const heading of ["Invoice information", "Customer", "Line item", "Amounts"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getByRole("link", { name: /Back to invoices/ })).toBeVisible();
    expect(window.matchMedia("(min-width: 48rem)").matches).toBe(width >= 768);
  });

  it("renders the complete server detail without calculating monetary values", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }));
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Invoice INV-014" })).toBeVisible();
    for (const value of [
      "2026-08-01",
      "2026-08-31",
      "USD",
      "Grace Hopper",
      "grace@example.com",
      "+1 555 014",
      "14 Compiler Way",
      "Consulting",
      "33.3500",
      "100.05",
      "1.50",
      "106.05",
      "20.00",
      "86.05",
    ])
      expect(screen.getByText(value)).toBeVisible();
    expect(screen.getAllByText("Overdue")).toHaveLength(2);
    expect(screen.getByText("Tax (7.50%)")).toBeVisible();
    expect(screen.getByText("7.50", { selector: "dd" })).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getByRole("link", { name: /Back to invoices/ })).toHaveAttribute(
      "href",
      "/invoices",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/invoices/invoice-14",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("renders the dedicated not-found state for a 404", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statusCode: 404,
          error: "Not Found",
          message: "Invoice not found",
        }),
        { status: 404 },
      ),
    );
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Invoice not found" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The requested invoice could not be found.",
    );
    expect(screen.getByRole("link", { name: /Back to invoices/ })).toBeVisible();
  });
});
