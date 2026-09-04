import type { AuthResponse } from "@simpleinvoice/contracts";
import { redirect } from "react-router-dom";

import { ApiRequestError, apiRequest } from "./client";

export async function protectedRouteLoader(): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/me");
  } catch (error) {
    if (error instanceof ApiRequestError && error.body.statusCode === 401) {
      throw redirect("/login");
    }
    throw error;
  }
}
