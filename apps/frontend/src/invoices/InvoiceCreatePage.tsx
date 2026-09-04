import {
  CURRENCIES,
  type CreateInvoiceRequest,
  type CurrencyCode,
  type DecimalString,
  type ValidationError,
} from "@simpleinvoice/contracts";
import { useState } from "react";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { ApiRequestError } from "../api/client";
import { createInvoice } from "./createApi";

const canonicalDecimal = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  );
}

function decimal(message: string, scale: number, allowZero: boolean) {
  return z
    .string()
    .min(1, message)
    .regex(canonicalDecimal, message)
    .refine(
      (value) => (value.split(".")[1]?.length ?? 0) <= scale,
      `Use at most ${scale} decimal places`,
    )
    .refine((value) => allowZero || Number(value) > 0, message);
}

const formSchema = z
  .object({
    customer: z.object({
      fullname: z.string().trim().min(1, "Customer name is required"),
      email: z.email("Enter a valid email address"),
      mobileNumber: z.string(),
      address: z.string(),
    }),
    invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
    invoiceDate: z.string().refine(validDate, "Enter a valid invoice date"),
    dueDate: z.string().refine(validDate, "Enter a valid due date"),
    currency: z.enum(CURRENCIES.map(({ code }) => code) as [CurrencyCode, ...CurrencyCode[]]),
    item: z.object({
      name: z.string().trim().min(1, "Item name is required"),
      quantity: z
        .string()
        .regex(/^\d+$/, "Quantity must be a whole number from 1 to 1000000")
        .refine(
          (value) => Number(value) >= 1 && Number(value) <= 1_000_000,
          "Quantity must be from 1 to 1000000",
        ),
      rate: decimal("Rate must be a positive amount", 4, false),
    }),
    taxPercent: decimal("Tax percentage must be non-negative", 2, true).refine(
      (value) => Number(value) <= 999.99,
      "Tax percentage must not exceed 999.99",
    ),
    discount: decimal("Discount must be a non-negative amount", 2, true),
  })
  .refine(
    (data) =>
      !validDate(data.invoiceDate) || !validDate(data.dueDate) || data.dueDate >= data.invoiceDate,
    {
      path: ["dueDate"],
      message: "Due date must be on or after invoice date",
    },
  );

type FormValues = z.input<typeof formSchema>;

const resolver: Resolver<FormValues> = async (values) => {
  const result = formSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, unknown> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String);
    let target = errors;
    for (const part of path.slice(0, -1)) {
      target[part] ??= {};
      target = target[part] as Record<string, unknown>;
    }
    const leaf = path.at(-1);
    if (leaf && target[leaf] === undefined) {
      target[leaf] = { type: issue.code, message: issue.message };
    }
  }
  return { values: {}, errors: errors as FieldErrors<FormValues> };
};

const fieldNames = [
  "customer.fullname",
  "customer.email",
  "customer.mobileNumber",
  "customer.address",
  "invoiceNumber",
  "invoiceDate",
  "dueDate",
  "currency",
  "item.name",
  "item.quantity",
  "item.rate",
  "taxPercent",
  "discount",
] as const;

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    defaultValues: {
      customer: { fullname: "", email: "", mobileNumber: "", address: "" },
      invoiceNumber: "",
      invoiceDate: "",
      dueDate: "",
      currency: "AUD",
      item: { name: "", quantity: "1", rate: "" },
      taxPercent: "10",
      discount: "0",
    },
  });

  const message = (name: (typeof fieldNames)[number]) => {
    const parts = name.split(".");
    let value: unknown = errors;
    for (const part of parts) value = (value as Record<string, unknown> | undefined)?.[part];
    return (value as { message?: string } | undefined)?.message;
  };

  async function submit(values: FormValues) {
    setApiError("");
    const request: CreateInvoiceRequest = {
      customer: {
        fullname: values.customer.fullname.trim(),
        email: values.customer.email,
        ...(values.customer.mobileNumber ? { mobileNumber: values.customer.mobileNumber } : {}),
        ...(values.customer.address ? { address: values.customer.address } : {}),
      },
      invoiceNumber: values.invoiceNumber.trim(),
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      currency: values.currency,
      item: {
        name: values.item.name.trim(),
        quantity: Number(values.item.quantity),
        rate: values.item.rate as DecimalString,
      },
      taxPercent: values.taxPercent as DecimalString,
      discount: values.discount as DecimalString,
    };
    try {
      await createInvoice(request);
      await navigate("/invoices", { state: { notification: "Invoice created successfully." } });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const body = error.body as ApiRequestError["body"] | ValidationError;
        if (typeof body.message !== "string") {
          for (const serverMessage of body.message) {
            const field = fieldNames.find((name) => serverMessage.startsWith(name));
            if (field) setError(field, { type: "server", message: serverMessage });
          }
          setApiError("Please correct the highlighted fields.");
        } else {
          setApiError(body.message);
        }
      } else setApiError("Unable to create invoice.");
    }
  }

  const input = (name: (typeof fieldNames)[number], label: string, type = "text") => (
    <label>
      {label}
      <input type={type} aria-invalid={message(name) ? true : undefined} {...register(name)} />
      {message(name) && <span className="field-error">{message(name)}</span>}
    </label>
  );

  return (
    <main className="invoice-create">
      <header>
        <p className="eyebrow">Invoices</p>
        <h1>Create invoice</h1>
      </header>
      {apiError && (
        <p className="form-alert" role="alert">
          {apiError}
        </p>
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <fieldset>
          <legend>Customer</legend>
          <div className="form-grid">
            {input("customer.fullname", "Customer name")}
            {input("customer.email", "Customer email", "email")}
            {input("customer.mobileNumber", "Customer mobile (optional)", "tel")}
            {input("customer.address", "Customer address (optional)")}
          </div>
        </fieldset>
        <fieldset>
          <legend>Invoice</legend>
          <div className="form-grid">
            {input("invoiceNumber", "Invoice number")}
            {input("invoiceDate", "Invoice date", "date")}
            {input("dueDate", "Due date", "date")}
            <label>
              Currency
              <select {...register("currency")}>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Item</legend>
          <div className="form-grid">
            {input("item.name", "Item name")}
            {input("item.quantity", "Quantity", "number")}
            {input("item.rate", "Rate", "text")}
          </div>
        </fieldset>
        <fieldset>
          <legend>Adjustments</legend>
          <div className="form-grid">
            {input("taxPercent", "Tax percentage", "text")}
            {input("discount", "Discount", "text")}
          </div>
        </fieldset>
        <div className="form-actions">
          <button type="button" onClick={() => void navigate("/invoices")}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create invoice"}
          </button>
        </div>
      </form>
    </main>
  );
}
