import type { DecimalString } from "@simpleinvoice/contracts";
import { parseDecimalString } from "@simpleinvoice/contracts";
import { validateCreatePayload, type CreatePayload } from "./validate-create-payload";

function d(value: string): DecimalString {
  const parsed = parseDecimalString(value);
  if (!parsed.ok) {
    throw new Error(`invalid decimal fixture: ${value}`);
  }
  return parsed.value;
}

function validPayload(overrides: Partial<CreatePayload> = {}): CreatePayload {
  return {
    customer: {
      fullname: "Jane Doe",
      email: "jane@example.com",
    },
    invoiceNumber: "INV-2026-0001",
    invoiceDate: "2026-01-10",
    dueDate: "2026-01-20",
    currency: "AUD",
    item: { name: "Consulting", quantity: 2, rate: d("100.00") },
    ...overrides,
  };
}

const BUSINESS_DATE = "2026-01-15";

function errorsOf(payload: CreatePayload, businessDate = BUSINESS_DATE): readonly string[] {
  const result = validateCreatePayload(payload, businessDate);
  if (result.ok) {
    throw new Error("expected validation to fail");
  }
  return result.errors;
}

describe("validateCreatePayload - happy path", () => {
  it("accepts a fully valid payload with defaults omitted", () => {
    const result = validateCreatePayload(validPayload(), BUSINESS_DATE);

    expect(result.ok).toBe(true);
  });

  it("accepts a payload with explicit taxPercent and discount", () => {
    const result = validateCreatePayload(
      validPayload({ taxPercent: d("12.5"), discount: d("10.00") }),
      BUSINESS_DATE,
    );

    expect(result.ok).toBe(true);
  });

  it("accepts quantity at the upper bound 1000000 (CREATE-013 boundary)", () => {
    const result = validateCreatePayload(
      validPayload({ item: { name: "Bulk", quantity: 1000000, rate: d("0.01") } }),
      BUSINESS_DATE,
    );

    expect(result.ok).toBe(true);
  });

  it("accepts a 4-decimal rate of 0.001 (NUMERIC(19,4))", () => {
    const result = validateCreatePayload(
      validPayload({ item: { name: "Micro", quantity: 1, rate: d("0.001") } }),
      BUSINESS_DATE,
    );

    expect(result.ok).toBe(true);
  });

  it("accepts dueDate equal to invoiceDate (on-or-after rule)", () => {
    const result = validateCreatePayload(validPayload({ dueDate: "2026-01-10" }), BUSINESS_DATE);

    expect(result.ok).toBe(true);
  });

  it("normalizes omitted taxPercent to 10 and discount to 0", () => {
    const result = validateCreatePayload(validPayload(), BUSINESS_DATE);

    if (!result.ok) {
      throw new Error("expected validation to pass");
    }
    expect(result.normalized.taxPercent).toBe("10");
    expect(result.normalized.discount).toBe("0");
  });
});

describe("validateCreatePayload - customer and invoice fields", () => {
  it("rejects an empty customer name", () => {
    const errors = errorsOf(
      validPayload({ customer: { fullname: "", email: "jane@example.com" } }),
    );

    expect(errors.some((e) => e.includes("customer.fullname"))).toBe(true);
  });

  it("rejects a malformed customer email", () => {
    const errors = errorsOf(
      validPayload({ customer: { fullname: "Jane", email: "not-an-email" } }),
    );

    expect(errors.some((e) => e.includes("customer.email"))).toBe(true);
  });

  it("rejects an empty invoiceNumber", () => {
    const errors = errorsOf(validPayload({ invoiceNumber: "" }));

    expect(errors.some((e) => e.includes("invoiceNumber"))).toBe(true);
  });

  it("rejects a non-YYYY-MM-DD invoiceDate", () => {
    const errors = errorsOf(validPayload({ invoiceDate: "01/10/2026" }));

    expect(errors.some((e) => e.includes("invoiceDate"))).toBe(true);
  });

  it("rejects a dueDate earlier than invoiceDate (CREATE-004)", () => {
    const errors = errorsOf(validPayload({ invoiceDate: "2026-01-10", dueDate: "2026-01-09" }));

    expect(errors.some((e) => e.includes("dueDate"))).toBe(true);
  });

  it("rejects a currency outside the contracts registry", () => {
    const errors = errorsOf(validPayload({ currency: "EUR" as never }));

    expect(errors.some((e) => e.includes("currency"))).toBe(true);
  });
});

describe("validateCreatePayload - item rules", () => {
  it("rejects quantity 0 with a named error (CREATE-005)", () => {
    const errors = errorsOf(validPayload({ item: { name: "Item", quantity: 0, rate: d("1.00") } }));

    expect(errors.some((e) => e.includes("item.quantity"))).toBe(true);
  });

  it("rejects quantity 1000001 above the bound (CREATE-013)", () => {
    const errors = errorsOf(
      validPayload({ item: { name: "Item", quantity: 1000001, rate: d("1.00") } }),
    );

    expect(errors.some((e) => e.includes("item.quantity"))).toBe(true);
  });

  it("rejects a non-integer quantity", () => {
    const errors = errorsOf(
      validPayload({ item: { name: "Item", quantity: 1.5, rate: d("1.00") } }),
    );

    expect(errors.some((e) => e.includes("item.quantity"))).toBe(true);
  });

  it("rejects rate 0 (CREATE-006: positive)", () => {
    const errors = errorsOf(validPayload({ item: { name: "Item", quantity: 1, rate: d("0") } }));

    expect(errors.some((e) => e.includes("item.rate"))).toBe(true);
  });

  it("rejects a 5-decimal rate as excess scale (MONEY-007: NUMERIC(19,4))", () => {
    const errors = errorsOf(
      validPayload({ item: { name: "Item", quantity: 1, rate: d("0.00001") } }),
    );

    expect(errors.some((e) => e.includes("item.rate"))).toBe(true);
  });

  it("rejects an empty item name", () => {
    const errors = errorsOf(validPayload({ item: { name: "", quantity: 1, rate: d("1.00") } }));

    expect(errors.some((e) => e.includes("item.name"))).toBe(true);
  });
});

describe("validateCreatePayload - decimal syntax and scale (MONEY-005/007)", () => {
  it("rejects exponent notation in taxPercent", () => {
    const errors = errorsOf(validPayload({ taxPercent: "1e2" as never }));

    expect(errors.some((e) => e.includes("taxPercent"))).toBe(true);
  });

  it("rejects whitespace in discount", () => {
    const errors = errorsOf(validPayload({ discount: " 1.00" as never }));

    expect(errors.some((e) => e.includes("discount"))).toBe(true);
  });

  it("rejects discount 0.001 as excess scale (money columns are 2dp)", () => {
    const errors = errorsOf(validPayload({ discount: d("0.001") }));

    expect(errors.some((e) => e.includes("discount"))).toBe(true);
  });

  it("rejects taxPercent 10.001 as excess scale (NUMERIC(5,2))", () => {
    const errors = errorsOf(validPayload({ taxPercent: d("10.001") }));

    expect(errors.some((e) => e.includes("taxPercent"))).toBe(true);
  });

  it("accepts taxPercent 999.99 at the NUMERIC(5,2) storage bound (no invented max)", () => {
    const result = validateCreatePayload(validPayload({ taxPercent: d("999.99") }), BUSINESS_DATE);

    expect(result.ok).toBe(true);
  });

  it("rejects negative taxPercent (CREATE-007)", () => {
    const errors = errorsOf(validPayload({ taxPercent: d("-1") }));

    expect(errors.some((e) => e.includes("taxPercent"))).toBe(true);
  });

  it("rejects negative discount (CREATE-008)", () => {
    const errors = errorsOf(validPayload({ discount: d("-1.00") }));

    expect(errors.some((e) => e.includes("discount"))).toBe(true);
  });
});

describe("validateCreatePayload - discount bound (CREATE-008)", () => {
  it("rejects a discount greater than subtotal plus tax", () => {
    // subtotal 200 + tax 20 = 220; discount 220.01 exceeds it.
    const errors = errorsOf(
      validPayload({
        item: { name: "Item", quantity: 2, rate: d("100.00") },
        discount: d("220.01"),
      }),
    );

    expect(errors.some((e) => e.includes("discount"))).toBe(true);
  });

  it("accepts a discount exactly equal to subtotal plus tax (total 0)", () => {
    const result = validateCreatePayload(
      validPayload({
        item: { name: "Item", quantity: 2, rate: d("100.00") },
        discount: d("220.00"),
      }),
      BUSINESS_DATE,
    );

    expect(result.ok).toBe(true);
  });
});

describe("validateCreatePayload - NUMERIC storage overflow guard", () => {
  it("rejects a subtotal overflowing NUMERIC(19,2) (>= 10^17)", () => {
    const errors = errorsOf(
      validPayload({ item: { name: "Item", quantity: 1000000, rate: d("100000000000000") } }),
    );

    expect(errors.some((e) => e.includes("subtotal"))).toBe(true);
  });

  it("rejects an overflowing taxAmount even when subtotal, discount, and total all fit", () => {
    // Fixture arithmetic (Prisma.Decimal, HALF_UP 2dp), NUMERIC(19,2) limit 10^17:
    //   subtotal    = 1,000,000 x 15,000,000,000          = 15,000,000,000,000,000.00  (1.5e16, < 10^17, storable)
    //   taxAmount   = 15,000,000,000,000,000 x 999.99/100 = 149,998,500,000,000,000.00  (1.499985e17 >= 10^17, OVERFLOWS)
    //   discount    = 80,000,000,000,000,000.00 (8e16, storable; <= subtotal + taxAmount, discount rule passes)
    //   totalAmount = 15,000,000,000,000,000 + 149,998,500,000,000,000 - 80,000,000,000,000,000
    //               = 84,998,500,000,000,000.00          (8.49985e16, < 10^17, storable)
    // Only taxAmount exceeds NUMERIC(19,2) -> the rejection must name taxAmount.
    const errors = errorsOf(
      validPayload({
        item: { name: "Item", quantity: 1000000, rate: d("15000000000") },
        taxPercent: d("999.99"),
        discount: d("80000000000000000.00"),
      }),
    );

    expect(errors.some((e) => e.includes("taxAmount"))).toBe(true);
    expect(errors.some((e) => e.includes("subtotal"))).toBe(false);
    expect(errors.some((e) => e.includes("totalAmount"))).toBe(false);
    expect(errors.some((e) => e.includes("discount"))).toBe(false);
  });

  it("accepts the same payload shape with a small taxPercent, proving the rejection is taxAmount-specific", () => {
    // Same quantity/rate, taxPercent 1.00, discount 0:
    //   taxAmount   = 15,000,000,000,000,000 x 1.00/100 = 150,000,000,000,000.00 (< 10^17)
    //   totalAmount = 15,000,000,000,000,000 + 150,000,000,000,000 = 15,150,000,000,000,000.00 (< 10^17)
    // Everything storable -> payload valid.
    const result = validateCreatePayload(
      validPayload({
        item: { name: "Item", quantity: 1000000, rate: d("15000000000") },
        taxPercent: d("1.00"),
      }),
      BUSINESS_DATE,
    );

    expect(result.ok).toBe(true);
  });

  it("rejects taxPercent 1000 as NUMERIC(5,2) precision overflow", () => {
    const errors = errorsOf(validPayload({ taxPercent: d("1000") }));

    expect(errors.some((e) => e.includes("taxPercent"))).toBe(true);
  });
});
