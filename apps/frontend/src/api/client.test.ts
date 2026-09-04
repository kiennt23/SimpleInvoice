import { ApiRequestError, apiRequest, setUnauthorizedHandler } from "./client";

const fetchMock = vi.fn<typeof fetch>();
const unauthorized = {
  statusCode: 401,
  error: "Unauthorized",
  message: "Authentication required",
};

describe("API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    setUnauthorizedHandler(undefined);
    vi.unstubAllGlobals();
  });

  it("notifies the application when a protected request returns 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(unauthorized), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiRequest("/invoices?page=1")).rejects.toBeInstanceOf(ApiRequestError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("keeps invalid login feedback on the login page", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(unauthorized), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiRequest("/auth/login")).rejects.toBeInstanceOf(ApiRequestError);
    expect(handler).not.toHaveBeenCalled();
  });
});
