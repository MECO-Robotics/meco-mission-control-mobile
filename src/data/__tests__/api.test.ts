import {
  ApiNetworkError,
  ApiRequestError,
  classifyMobileAuthError,
  getBackendConnectionErrorMessage,
  getMobileAuthErrorMessage,
  requestJson,
} from "../api";

function mockFetch(response: Partial<Response>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(""),
    ...response,
  } as Response);
}

describe("mobile auth API fail-safe handling", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("classifies authenticated 401 bootstrap failures as expired sessions", async () => {
    mockFetch({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue(JSON.stringify({ message: "Token expired" })),
    });

    await expect(
      requestJson("https://api.example.test", "/api/bootstrap", undefined, "old-token"),
    ).rejects.toMatchObject({ message: "Token expired", status: 401 });

    const error = new ApiRequestError("Token expired", 401, null);
    expect(classifyMobileAuthError(error, "authenticated")).toBe("expired-session");
    expect(getMobileAuthErrorMessage("expired-session")).toBe(
      "Your session expired. Sign in again.",
    );
    expect(classifyMobileAuthError(error)).toBe("unknown");
  });

  it("does not classify permission 403 responses as expired sessions", () => {
    const error = new ApiRequestError("Only the assignee can start this task.", 403, {
      code: "forbidden",
      message: "Only the assignee can start this task.",
    });

    expect(classifyMobileAuthError(error, "authenticated")).toBe("unknown");
  });

  it("classifies explicit 403 auth expiry payloads as expired sessions", () => {
    const error = new ApiRequestError("Token expired", 403, {
      code: "token_expired",
      message: "Token expired",
    });

    expect(classifyMobileAuthError(error, "authenticated")).toBe("expired-session");
  });

  it("classifies network loss without clearing the session", async () => {
    const networkError = new TypeError("Network request failed");
    global.fetch = jest.fn().mockRejectedValue(networkError);

    await expect(
      requestJson("https://api.example.test", "/api/bootstrap", undefined, "token"),
    ).rejects.toBeInstanceOf(ApiNetworkError);

    expect(
      classifyMobileAuthError(new ApiNetworkError(networkError), "authenticated"),
    ).toBe("network-unavailable");
    expect(getMobileAuthErrorMessage("network-unavailable")).toBe(
      "Network unavailable. Check your connection and try again.",
    );
  });

  it("classifies auth config load failures as auth config unavailable", () => {
    const error = new ApiNetworkError(new TypeError("Network request failed"));

    expect(classifyMobileAuthError(error, "auth-config")).toBe(
      "auth-config-unavailable",
    );
    expect(getMobileAuthErrorMessage("auth-config-unavailable")).toBe(
      "Authentication service is unavailable. Check the backend auth configuration and try again.",
    );
  });

  it("builds actionable backend connection guidance", () => {
    expect(getBackendConnectionErrorMessage("http://localhost:8080")).toBe(
      "Backend API is not reachable at http://localhost:8080. Start the platform server on that host/port, or set EXPO_PUBLIC_API_BASE_URL to the backend URL your device can reach.",
    );
  });

  it("aborts hanging requests when a timeout is provided", async () => {
    jest.useFakeTimers();
    try {
      global.fetch = jest.fn((_, init) => {
        return new Promise((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        });
      }) as jest.Mock;

      const promise = requestJson(
        "https://api.example.test",
        "/api/auth/email/start",
        undefined,
        undefined,
        1,
      );

      const expectation = expect(promise).rejects.toBeInstanceOf(ApiNetworkError);
      await jest.advanceTimersByTimeAsync(5);
      await expectation;
    } finally {
      jest.useRealTimers();
    }
  });
});
