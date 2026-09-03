/**
 * Supported currency codes - the canonical set.
 * Extend via SOP: adding-a-currency.md.
 */
export type CurrencyCode = "AUD" | "USD" | "GBP";

/** A single entry in the canonical currency registry. */
export type CurrencyEntry = {
  readonly code: CurrencyCode;
  /** Number of decimal places for the minor unit (always 2 for current set). */
  readonly minorUnits: number;
  /** Display symbol only - never persisted or used in calculations. */
  readonly symbol: string;
};

/**
 * Canonical currency registry - single readonly source of truth.
 *
 * - `code`: ISO 4217 currency code
 * - `minorUnits`: decimal places for the minor unit
 * - `symbol`: display symbol (A$, $, £) - never persisted
 */
export const CURRENCIES: readonly CurrencyEntry[] = [
  { code: "AUD", minorUnits: 2, symbol: "A$" },
  { code: "USD", minorUnits: 2, symbol: "$" },
  { code: "GBP", minorUnits: 2, symbol: "£" },
];
