import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { ApiRequestError } from "../api/client";
import { fetchInvoiceDetail } from "./detailApi";

export function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoiceDetail(id),
  });

  const backLink = <Link to="/invoices">← Back to invoices</Link>;
  if (query.isPending)
    return (
      <main className="invoice-detail">
        {backLink}
        <p role="status">Loading invoice…</p>
      </main>
    );
  if (query.isError) {
    const notFound = query.error instanceof ApiRequestError && query.error.body.statusCode === 404;
    return (
      <main className="invoice-detail">
        {backLink}
        <h1>{notFound ? "Invoice not found" : "Unable to load invoice"}</h1>
        <p role="alert">
          {notFound ? "The requested invoice could not be found." : "Please try again later."}
        </p>
      </main>
    );
  }

  const invoice = query.data;
  return (
    <main className="invoice-detail">
      {backLink}
      <header>
        <h1>Invoice {invoice.invoiceNumber}</h1>
        <strong>{invoice.status}</strong>
      </header>
      <section>
        <h2>Invoice information</h2>
        <dl>
          <div>
            <dt>Invoice number</dt>
            <dd>{invoice.invoiceNumber}</dd>
          </div>
          <div>
            <dt>Invoice date</dt>
            <dd>{invoice.invoiceDate}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{invoice.dueDate}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{invoice.currency}</dd>
          </div>
          <div>
            <dt>Effective status</dt>
            <dd>{invoice.status}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Customer</h2>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{invoice.customer.fullname}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{invoice.customer.email}</dd>
          </div>
          <div>
            <dt>Mobile number</dt>
            <dd>{invoice.customer.mobileNumber || "—"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{invoice.customer.address || "—"}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Line item</h2>
        <dl>
          <div>
            <dt>Item</dt>
            <dd>{invoice.item.name}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{invoice.item.quantity}</dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd>{invoice.item.rate}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Amounts</h2>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{invoice.subtotal}</dd>
          </div>
          <div>
            <dt>Tax ({invoice.taxPercent}%)</dt>
            <dd>{invoice.taxAmount}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{invoice.discount}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{invoice.totalAmount}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>{invoice.totalPaid}</dd>
          </div>
          <div>
            <dt>Balance</dt>
            <dd>{invoice.balanceAmount}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
