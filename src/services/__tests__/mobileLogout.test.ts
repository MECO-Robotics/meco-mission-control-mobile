import { revokeThenClearMobileSession } from "../mobileLogout";

describe("mobile logout", () => {
  it("confirms server revocation before clearing local identity state", async () => {
    const order: string[] = [];

    await expect(
      revokeThenClearMobileSession({
        revokeServerState: async () => {
          order.push("revoke");
        },
        clearLocalState: async (confirmed) => {
          order.push(`clear:${confirmed}`);
        },
      }),
    ).resolves.toBe(true);
    expect(order).toEqual(["revoke", "clear:true"]);
  });

  it("always clears local state and reports an unconfirmed server logout", async () => {
    const clearLocalState = jest.fn();

    await expect(
      revokeThenClearMobileSession({
        revokeServerState: async () => {
          throw new Error("offline");
        },
        clearLocalState,
      }),
    ).resolves.toBe(false);
    expect(clearLocalState).toHaveBeenCalledWith(false);
  });
});
