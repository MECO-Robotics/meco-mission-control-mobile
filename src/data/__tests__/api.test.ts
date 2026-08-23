import {
  ApiNetworkError,
  ApiConfigurationError,
  ApiRequestError,
  classifyMobileAuthError,
  getBackendConnectionErrorMessage,
  getMobileAuthErrorMessage,
  requestJson,
  resolveApiBaseUrl,
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
      "Backend API is not reachable at http://localhost:8080. Start the platform server on that host/port, or set EXPO_PUBLIC_API_BASE_URL or the platform-specific API override to the backend URL your device can reach.",
    );
  });

  it("prefers Android-specific API base URLs over stale shared values", () => {
    expect(
      resolveApiBaseUrl("android", {
        EXPO_PUBLIC_API_BASE_URL: "http://192.168.1.174:8080",
        EXPO_PUBLIC_ANDROID_API_BASE_URL: "http://10.0.2.2:8080",
      }, true),
    ).toBe("http://10.0.2.2:8080");
  });

  it("trims trailing slashes from configured API base URLs", () => {
    expect(
      resolveApiBaseUrl("ios", {
        EXPO_PUBLIC_IOS_API_BASE_URL: "http://localhost:8080/",
      }, true),
    ).toBe("http://localhost:8080");
  });

  it("rejects cleartext API URLs in production", () => {
    expect(() =>
      resolveApiBaseUrl(
        "android",
        { EXPO_PUBLIC_API_BASE_URL: "http://10.0.2.2:8080" },
        false,
      ),
    ).toThrow(ApiConfigurationError);
  });

  it("requires an explicit development override for private-LAN HTTP", () => {
    expect(() =>
      resolveApiBaseUrl(
        "ios",
        { EXPO_PUBLIC_API_BASE_URL: "http://192.168.1.50:8080" },
        true,
      ),
    ).toThrow("private-LAN override");

    expect(
      resolveApiBaseUrl(
        "ios",
        {
          EXPO_PUBLIC_ALLOW_INSECURE_PRIVATE_LAN: "true",
          EXPO_PUBLIC_API_BASE_URL: "http://192.168.1.50:8080",
        },
        true,
      ),
    ).toBe("http://192.168.1.50:8080");
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

  it("honors caller cancellation when a timeout is also provided", async () => {
    const callerController = new AbortController();
    const capturedSignal: { current?: AbortSignal } = {};
    global.fetch = jest.fn((_, init) => {
      const fetchSignal = (init as RequestInit | undefined)?.signal;
      if (fetchSignal) {
        capturedSignal.current = fetchSignal;
      }
      return new Promise((_resolve, reject) => {
        fetchSignal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }) as jest.Mock;

    const promise = requestJson(
      "https://api.example.test",
      "/api/bootstrap",
      { signal: callerController.signal },
      "token",
      60_000,
    );
    callerController.abort();

    await expect(promise).rejects.toBeInstanceOf(ApiNetworkError);
    expect(capturedSignal.current?.aborted).toBe(true);
  });

  it("starts aborted when the caller signal was already cancelled", async () => {
    const callerController = new AbortController();
    callerController.abort();
    global.fetch = jest.fn((_, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      expect(signal?.aborted).toBe(true);
      return Promise.reject(new Error("aborted"));
    }) as jest.Mock;

    await expect(
      requestJson(
        "https://api.example.test",
        "/api/bootstrap",
        { signal: callerController.signal },
        "token",
        60_000,
      ),
    ).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it("keeps the timeout active while the response body is being read", async () => {
    jest.useFakeTimers();
    try {
      global.fetch = jest.fn((_, init) => {
        const signal = (init as RequestInit | undefined)?.signal;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            new Promise<string>((_resolve, reject) => {
              signal?.addEventListener("abort", () => reject(new Error("aborted")));
            }),
        } as Response);
      }) as jest.Mock;

      const promise = requestJson(
        "https://api.example.test",
        "/api/bootstrap",
        undefined,
        "token",
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
