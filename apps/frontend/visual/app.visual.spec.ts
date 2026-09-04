import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "reviewer@simpleinvoice.local",
  fullname: "SimpleInvoice Reviewer",
};

const listResponse = {
  data: [
    {
      invoiceId: "20000000-0000-4000-8000-000000000001",
      invoiceNumber: "INV-2026-01001",
      customerName: "Paul Singapore",
      invoiceDate: "2026-08-15",
      dueDate: "2026-09-15",
      totalAmount: "2838.00",
      status: "Draft",
    },
    {
      invoiceId: "20000000-0000-4000-8000-000000000002",
      invoiceNumber: "INV-2026-01002",
      customerName: "Aroha Ngata",
      invoiceDate: "2026-07-20",
      dueDate: "2026-08-20",
      totalAmount: "1275.50",
      status: "Overdue",
    },
  ],
  paging: { page: 1, pageSize: 10, total: 2 },
};

const detailResponse = {
  ...listResponse.data[0],
  currency: "AUD",
  taxPercent: "10.00",
  customer: {
    fullname: "Paul Singapore",
    email: "paul@example.com",
    mobileNumber: "+65 8555 0100",
    address: "1 Raffles Place, Singapore",
  },
  item: { name: "Consulting engagement", quantity: 3, rate: "860.0000" },
  subtotal: "2580.00",
  taxAmount: "258.00",
  discount: "0.00",
  totalPaid: "0.00",
  balanceAmount: "2838.00",
};

async function authenticate(page: Page) {
  await page.route("**/auth/me", (route) => route.fulfill({ json: { user } }));
}

test("login page", async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 401,
      json: { statusCode: 401, error: "Unauthorized", message: "Authentication required" },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveScreenshot("login.png", { fullPage: true });
});

test("invoice list page", async ({ page }) => {
  await authenticate(page);
  await page.route(/\/invoices\?/, (route) => route.fulfill({ json: listResponse }));
  await page.goto("/invoices");
  await expect(page.getByRole("link", { name: "Create invoice" })).toBeVisible();
  await expect(page.getByRole("link", { name: "INV-2026-01001" })).toHaveAttribute(
    "href",
    "/invoices/20000000-0000-4000-8000-000000000001",
  );
  await expect(page.getByText("INV-2026-01001")).toBeVisible();
  await expect(page).toHaveScreenshot("invoice-list.png", { fullPage: true });
});

test("expired session redirects to login", async ({ page }) => {
  let authRequestCount = 0;
  await page.route("**/auth/me", (route) => {
    authRequestCount += 1;
    return route.fulfill({ json: { user } });
  });
  await page.route(/\/invoices\?/, (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    if (status === null) return route.fulfill({ json: listResponse });
    return route.fulfill({
      status: 401,
      json: { statusCode: 401, error: "Unauthorized", message: "Authentication required" },
    });
  });
  await page.goto("/invoices");
  await expect(page.getByRole("link", { name: "INV-2026-01001" })).toBeVisible();

  await page.getByRole("combobox", { name: "Status" }).selectOption("Draft");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(authRequestCount).toBe(1);
});

test("invoice detail page", async ({ page }) => {
  await authenticate(page);
  await page.route("**/invoices/20000000-0000-4000-8000-000000000001", (route) => {
    if (route.request().resourceType() === "document") {
      return route.continue();
    }

    return route.fulfill({ json: detailResponse });
  });
  await page.goto("/invoices/20000000-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("heading", { level: 1, name: "Invoice INV-2026-01001" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("invoice-detail.png", { fullPage: true });
});

test("invoice create page", async ({ page }) => {
  await authenticate(page);
  await page.goto("/invoices/new");
  await expect(page.getByRole("heading", { name: "Create invoice" })).toBeVisible();
  await expect(page).toHaveScreenshot("invoice-create.png", { fullPage: true });
});
