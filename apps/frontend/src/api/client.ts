import type { ApiError } from "@simpleinvoice/contracts";

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export class ApiRequestError extends Error {
  constructor(readonly body: ApiError) {
    super(body.message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(path: `/${string}`, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiError;
    if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me") {
      unauthorizedHandler?.();
    }
    throw new ApiRequestError(body);
  }

  return (await response.json()) as T;
}
