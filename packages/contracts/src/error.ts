/**
 * Non-validation error shape (API-007).
 * Used for 401, 403, 404, 409, and 500 responses.
 */
export type ApiError = {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
};

/**
 * Validation error shape (API-006).
 * Used for 400 responses with field-level messages.
 */
export type ValidationError = {
  readonly statusCode: number;
  readonly error: string;
  readonly message: readonly string[];
};
