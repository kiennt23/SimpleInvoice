import type { AuthResponse, LoginRequest } from "@simpleinvoice/contracts";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiRequestError, apiRequest } from "./api/client";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError("");
    const form = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(result.data satisfies LoginRequest),
      });
      await navigate("/invoices");
    } catch (error) {
      setApiError(error instanceof ApiRequestError ? error.body.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <h1>Sign in</h1>
        {apiError !== "" && <p role="alert">{apiError}</p>}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" aria-describedby="email-error" />
        {fieldErrors["email"] !== undefined && <p id="email-error">{fieldErrors["email"]}</p>}
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" aria-describedby="password-error" />
        {fieldErrors["password"] !== undefined && (
          <p id="password-error">{fieldErrors["password"]}</p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export function InvoicePlaceholder() {
  return <main aria-label="Invoice List" />;
}

export function HomeRedirect() {
  return <Navigate to="/invoices" replace />;
}
