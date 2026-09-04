import type { ApiError } from "@simpleinvoice/contracts";

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
    throw new ApiRequestError(body);
  }

  return (await response.json()) as T;
}
