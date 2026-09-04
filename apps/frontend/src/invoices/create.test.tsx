import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";

import { InvoiceCreatePage } from "./InvoiceCreatePage";

const fetchMock = vi.fn<typeof fetch>();

function Destination() {
  const location = useLocation();
  return <p>{(location.state as { notification?: string } | null)?.notification}</p>;
}

function renderCreate() {
  const router = createMemoryRouter(
    [
      { path: "/invoices/new", element: <InvoiceCreatePage /> },
      { path: "/invoices", element: <Destination /> },
    ],
    { initialEntries: ["/invoices/new"] },
  );
  render(<RouterProvider router={router} />);
  return router;
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

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Ada Lovelace" } });
  fireEvent.change(screen.getByLabelText("Customer email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Invoice number"), { target: { value: "INV-001" } });
  fireEvent.change(screen.getByLabelText("Invoice date"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-09-30" } });
  fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Consulting" } });
  fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "50.00" } });
}

describe("invoice creation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([375, 1280])("keeps every form group and action available at a %ipx viewport", (width) => {
    setViewport(width);
    renderCreate();

    for (const group of ["Customer", "Invoice", "Item", "Adjustments"]) {
      expect(screen.getByRole("group", { name: group })).toBeVisible();
    }
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Create invoice" })).toBeVisible();
    expect(window.matchMedia("(min-width: 48rem)").matches).toBe(width >= 768);
  });

  it("submits the exact writable payload once and redirects with success feedback", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ invoiceId: "invoice-1" }), { status: 201 }),
    );
    const router = renderCreate();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/invoices"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      customer: { fullname: "Ada Lovelace", email: "ada@example.com" },
      invoiceNumber: "INV-001",
      invoiceDate: "2026-09-01",
      dueDate: "2026-09-30",
      currency: "AUD",
      item: { name: "Consulting", quantity: 2, rate: "50.00" },
      taxPercent: "10",
      discount: "0",
    });
    expect(screen.getByText("Invoice created successfully.")).toBeVisible();
  });

  it("shows field feedback and makes no request for invalid input", async () => {
    renderCreate();
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(await screen.findByText("Customer name is required")).toBeVisible();
    expect(screen.getByText("Enter a valid email address")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the duplicate invoice conflict visible", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statusCode: 409,
          error: "Conflict",
          message: "Invoice number already exists",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    renderCreate();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invoice number already exists");
    expect(screen.getByRole("heading", { name: "Create invoice" })).toBeVisible();
  });
});
