import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { protectedRouteLoader } from "./api/auth";
import { HomeRedirect, InvoicePlaceholder, LoginPage } from "./auth";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/invoices", loader: protectedRouteLoader, element: <InvoicePlaceholder /> },
  { path: "/", element: <HomeRedirect /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
