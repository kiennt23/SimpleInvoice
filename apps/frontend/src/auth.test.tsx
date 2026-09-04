import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { protectedRouteLoader } from "./api/auth";
import { InvoicePlaceholder, LoginPage } from "./auth";

const fetchMock = vi.fn<typeof fetch>();

function renderLogin() {
  const router = createMemoryRouter([{ path: "/login", element: <LoginPage /> }], {
    initialEntries: ["/login"],
  });
  render(<RouterProvider router={router} />);
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(min-width: 48rem)" ? width >= 768 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("authentication", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([375, 1280])("keeps the sign-in form usable at a %ipx viewport", (width) => {
    setViewport(width);
    renderLogin();

    expect(screen.getByRole("main")).toHaveClass("app-shell");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
    expect(window.matchMedia("(min-width: 48rem)").matches).toBe(width >= 768);
  });

  it("shows validation feedback and does not submit an invalid form", async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter a valid email address")).toBeVisible();
    expect(screen.getByText("Password is required")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the login page open and shows the API-007 message after failed login", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ statusCode: 401, error: "Unauthorized", message: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
  });

  it("redirects a protected route to login when session bootstrap returns 401", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ statusCode: 401, error: "Unauthorized", message: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const router = createMemoryRouter(
      [
        { path: "/login", element: <LoginPage /> },
        { path: "/invoices", loader: protectedRouteLoader, element: <InvoicePlaceholder /> },
      ],
      { initialEntries: ["/invoices"] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
