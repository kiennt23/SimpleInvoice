import { Prisma } from "../generated/prisma/client";
import type { DecimalString } from "@simpleinvoice/contracts";

export type TotalsInput = {
  readonly quantity: number;
  readonly rate: DecimalString;
  readonly taxPercent: DecimalString;
  readonly discount?: DecimalString;
  readonly totalPaid?: DecimalString;
};

export type Totals = {
  readonly subtotal: Prisma.Decimal;
  readonly taxAmount: Prisma.Decimal;
  readonly totalAmount: Prisma.Decimal;
  readonly balanceAmount: Prisma.Decimal;
};

const MONEY_SCALE = 2;

/**
 * ADR 0003 rounding order, HALF_UP at each documented boundary:
 *   1. subtotal = quantity * rate, rounded to 2dp
 *   2. taxAmount = roundedSubtotal * (taxPercent / 100), rounded to 2dp
 *   3. totalAmount = subtotal + taxAmount - discount
 *   4. balanceAmount = totalAmount - totalPaid
 * Prisma.Decimal only - no JavaScript number touches a monetary value.
 */
export function calculateTotals(input: TotalsInput): Totals {
  const { quantity, taxPercent } = input;
  const rate = new Prisma.Decimal(input.rate);
  const discount = new Prisma.Decimal(input.discount ?? "0");
  const totalPaid = new Prisma.Decimal(input.totalPaid ?? "0");

  const subtotal = rate.mul(quantity).toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP);
  const taxAmount = subtotal
    .mul(taxPercent)
    .div(100)
    .toDecimalPlaces(MONEY_SCALE, Prisma.Decimal.ROUND_HALF_UP);
  const totalAmount = subtotal.plus(taxAmount).minus(discount);
  const balanceAmount = totalAmount.minus(totalPaid);

  return { subtotal, taxAmount, totalAmount, balanceAmount };
}
