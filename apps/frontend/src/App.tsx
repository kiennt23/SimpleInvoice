import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { protectedRouteLoader } from "./api/auth";
import { setUnauthorizedHandler } from "./api/client";
import { HomeRedirect, LoginPage } from "./auth";
import { InvoiceCreatePage } from "./invoices/InvoiceCreatePage";
import { InvoiceDetailPage } from "./invoices/InvoiceDetailPage";
import { InvoiceListPage } from "./invoices/InvoiceListPage";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    loader: protectedRouteLoader,
    shouldRevalidate: () => false,
    element: <Outlet />,
    children: [
      { path: "/invoices", element: <InvoiceListPage /> },
      { path: "/invoices/new", element: <InvoiceCreatePage /> },
      { path: "/invoices/:id", element: <InvoiceDetailPage /> },
    ],
  },
  { path: "/", element: <HomeRedirect /> },
]);

setUnauthorizedHandler(() => void router.navigate("/login"));

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
