/**
 * Decimal string - branded type for monetary and percentage values.
 *
 * Canonical syntax: optional `-`, one or more digits, optional `.` followed
 * by one or more digits.  No exponent, no whitespace, no empty string.
 *
 * Construction requires a parser - no consumer `as` assertion needed.
 */

declare const DECIMAL_BRAND: unique symbol;

export type DecimalString = string & {
  readonly [DECIMAL_BRAND]: typeof DECIMAL_BRAND;
};

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Parse a string into a DecimalString.
 *
 * Returns the branded value on success, or a message on failure.
 * Rejects: empty string, whitespace, exponent notation, multiple dots,
 * trailing/leading non-digit characters other than a leading `-`.
 */
export function parseDecimalString(value: string):
  | {
      readonly ok: true;
      readonly value: DecimalString;
    }
  | {
      readonly ok: false;
      readonly message: string;
    } {
  if (value.length === 0) {
    return { ok: false, message: "Value must not be empty" };
  }
  if (/[eE]/.test(value)) {
    return { ok: false, message: "Exponent notation is not allowed" };
  }
  if (/\s/.test(value)) {
    return { ok: false, message: "Whitespace is not allowed" };
  }
  if (!isDecimalString(value)) {
    return {
      ok: false,
      message: "Value must be a decimal number (digits, optional decimal point)",
    };
  }
  return { ok: true, value };
}

/**
 * Type guard - returns true when `value` is a valid DecimalString.
 */
export function isDecimalString(value: string): value is DecimalString {
  return DECIMAL_PATTERN.test(value) && !/[eE]/.test(value) && !/\s/.test(value);
}
