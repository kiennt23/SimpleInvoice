import type { InvoiceStatus, SortField, SortOrder } from "@simpleinvoice/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { fetchInvoiceList } from "./api";

const statuses: readonly InvoiceStatus[] = ["Draft", "Pending", "Paid", "Overdue"];
const defaults = { page: "1", pageSize: "10", sortBy: "invoiceDate", ordering: "DESC" } as const;

function requestParams(searchParams: URLSearchParams) {
  const result = new URLSearchParams();
  for (const key of [
    "page",
    "pageSize",
    "sortBy",
    "ordering",
    "status",
    "keyword",
    "fromDate",
    "toDate",
  ] as const) {
    const value = searchParams.get(key) ?? defaults[key as keyof typeof defaults];
    if (value) result.set(key, value);
  }
  return result;
}

export function InvoiceListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = requestParams(searchParams);
  const queryString = params.toString();
  const query = useQuery({
    queryKey: ["invoices", queryString],
    queryFn: () => fetchInvoiceList(params),
  });

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  }

  const page = Number(params.get("page"));
  const pageSize = Number(params.get("pageSize"));

  return (
    <main className="invoice-list">
      <header className="invoice-list-header">
        <h1>Invoices</h1>
        <Link className="primary-action" to="/invoices/new">
          Create invoice
        </Link>
      </header>
      {(location.state as { notification?: string } | null)?.notification && (
        <p className="success-notification" role="status">
          {(location.state as { notification: string }).notification}
        </p>
      )}
      <form className="invoice-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Search{" "}
          <input
            value={searchParams.get("keyword") ?? ""}
            onChange={(event) => update({ keyword: event.target.value, page: "1" })}
          />
        </label>
        <label>
          Status{" "}
          <select
            value={searchParams.get("status") ?? ""}
            onChange={(event) => update({ status: event.target.value, page: "1" })}
          >
            <option value="">All</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          From{" "}
          <input
            type="date"
            value={searchParams.get("fromDate") ?? ""}
            onChange={(event) => update({ fromDate: event.target.value, page: "1" })}
          />
        </label>
        <label>
          To{" "}
          <input
            type="date"
            value={searchParams.get("toDate") ?? ""}
            onChange={(event) => update({ toDate: event.target.value, page: "1" })}
          />
        </label>
        <label>
          Sort by{" "}
          <select
            value={params.get("sortBy") ?? defaults.sortBy}
            onChange={(event) => update({ sortBy: event.target.value as SortField, page: "1" })}
          >
            <option value="invoiceDate">Invoice date</option>
            <option value="dueDate">Due date</option>
            <option value="totalAmount">Total</option>
          </select>
        </label>
        <label>
          Order{" "}
          <select
            value={params.get("ordering") ?? defaults.ordering}
            onChange={(event) => update({ ordering: event.target.value as SortOrder, page: "1" })}
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </label>
        <label>
          Page size{" "}
          <select
            value={String(pageSize)}
            onChange={(event) => update({ pageSize: event.target.value, page: "1" })}
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>
        </label>
      </form>

      {query.isPending && <p role="status">Loading invoices…</p>}
      {query.isError && <p role="alert">Unable to load invoices.</p>}
      {query.data && query.data.data.length === 0 && <p>No invoices found.</p>}
      {query.data && query.data.data.length > 0 && (
        <div className="invoice-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice number</th>
                <th>Customer</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((invoice) => (
                <tr key={invoice.invoiceId}>
                  <td>
                    <Link to={`/invoices/${invoice.invoiceId}`}>{invoice.invoiceNumber}</Link>
                  </td>
                  <td>{invoice.customerName}</td>
                  <td>{invoice.invoiceDate}</td>
                  <td>{invoice.dueDate}</td>
                  <td>{invoice.totalAmount}</td>
                  <td>{invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && (
        <nav className="pagination" aria-label="Invoice pages">
          <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            Previous
          </button>
          <span>
            Page {query.data.paging.page} · {query.data.paging.total} total
          </span>
          <button
            disabled={page * pageSize >= query.data.paging.total}
            onClick={() => update({ page: String(page + 1) })}
          >
            Next
          </button>
        </nav>
      )}
    </main>
  );
}
