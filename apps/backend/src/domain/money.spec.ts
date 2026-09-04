import { Prisma } from "../generated/prisma/client";
import { parseDecimalString, type DecimalString } from "@simpleinvoice/contracts";
import { calculateTotals } from "./money";

function d(value: string): DecimalString {
  const parsed = parseDecimalString(value);
  if (!parsed.ok) {
    throw new Error(`invalid decimal fixture: ${value}`);
  }
  return parsed.value;
}

describe("calculateTotals", () => {
  it("computes the HALF_UP boundary case: qty 1, rate 0.05, tax 10% -> 0.05 / 0.01 / 0.06", () => {
    const totals = calculateTotals({ quantity: 1, rate: d("0.05"), taxPercent: d("10") });

    expect(totals.subtotal.toFixed(2)).toBe("0.05");
    expect(totals.taxAmount.toFixed(2)).toBe("0.01");
    expect(totals.totalAmount.toFixed(2)).toBe("0.06");
    expect(totals.balanceAmount.toFixed(2)).toBe("0.06");
  });

  it("rounds the subtotal HALF_UP at the half-cent (0.125 -> 0.13, not banker's rounding)", () => {
    const totals = calculateTotals({ quantity: 1, rate: d("0.125"), taxPercent: d("0") });

    expect(totals.subtotal.toFixed(2)).toBe("0.13");
  });

  it("derives tax from the rounded subtotal, never from the raw product", () => {
    // 0.145 rounds to subtotal 0.15; tax on the ROUNDED subtotal is 0.015 -> 0.02.
    // Tax computed from the raw product (0.0145) would round to 0.01 instead.
    const totals = calculateTotals({ quantity: 1, rate: d("0.145"), taxPercent: d("10") });

    expect(totals.subtotal.toFixed(2)).toBe("0.15");
    expect(totals.taxAmount.toFixed(2)).toBe("0.02");
    expect(totals.totalAmount.toFixed(2)).toBe("0.17");
  });

  it("rounds taxAmount HALF_UP at the half-cent (tax 0.025 -> 0.03)", () => {
    const totals = calculateTotals({ quantity: 1, rate: d("0.25"), taxPercent: d("10") });

    expect(totals.taxAmount.toFixed(2)).toBe("0.03");
    expect(totals.totalAmount.toFixed(2)).toBe("0.28");
  });

  it("stays exact where binary floating point would drift (3 x 0.1 = 0.30)", () => {
    const totals = calculateTotals({ quantity: 3, rate: d("0.1"), taxPercent: d("0") });

    expect(totals.subtotal.toFixed(2)).toBe("0.30");
  });

  it("subtracts the discount from totalAmount", () => {
    const totals = calculateTotals({
      quantity: 2,
      rate: d("10.00"),
      taxPercent: d("10"),
      discount: d("3.00"),
    });

    expect(totals.totalAmount.toFixed(2)).toBe("19.00");
  });

  it("computes balanceAmount as totalAmount minus totalPaid", () => {
    const totals = calculateTotals({
      quantity: 1,
      rate: d("100.00"),
      taxPercent: d("10"),
      discount: d("0.00"),
      totalPaid: d("40.50"),
    });

    expect(totals.balanceAmount.toFixed(2)).toBe("69.50");
  });

  it("defaults discount and totalPaid to zero", () => {
    const totals = calculateTotals({ quantity: 1, rate: d("100.00"), taxPercent: d("10") });

    expect(totals.totalAmount.toFixed(2)).toBe("110.00");
    expect(totals.balanceAmount.toFixed(2)).toBe("110.00");
  });

  it("accepts a 4-decimal rate and computes it exactly (1000 x 0.001)", () => {
    const totals = calculateTotals({ quantity: 1000, rate: d("0.001"), taxPercent: d("10") });

    expect(totals.subtotal.toFixed(2)).toBe("1.00");
    expect(totals.taxAmount.toFixed(2)).toBe("0.10");
    expect(totals.totalAmount.toFixed(2)).toBe("1.10");
  });

  it("returns Prisma.Decimal values, not numbers", () => {
    const totals = calculateTotals({ quantity: 1, rate: d("1.00"), taxPercent: d("10") });

    expect(totals.subtotal).toBeInstanceOf(Prisma.Decimal);
    expect(totals.taxAmount).toBeInstanceOf(Prisma.Decimal);
    expect(totals.totalAmount).toBeInstanceOf(Prisma.Decimal);
    expect(totals.balanceAmount).toBeInstanceOf(Prisma.Decimal);
  });

  it("keeps exact precision far beyond Number.MAX_SAFE_INTEGER", () => {
    const totals = calculateTotals({
      quantity: 1000000,
      rate: d("10000000000000"),
      taxPercent: d("10"),
    });

    expect(totals.subtotal.toFixed(2)).toBe("10000000000000000000.00");
  });
});
