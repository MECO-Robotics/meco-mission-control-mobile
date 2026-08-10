type RevokeThenClearOptions = {
  clearLocalState: (serverRevocationConfirmed: boolean) => Promise<void> | void;
  revokeServerState: () => Promise<void>;
};

export async function revokeThenClearMobileSession({
  clearLocalState,
  revokeServerState,
}: RevokeThenClearOptions) {
  let serverRevocationConfirmed = false;
  try {
    await revokeServerState();
    serverRevocationConfirmed = true;
  } catch {
    serverRevocationConfirmed = false;
  }

  await clearLocalState(serverRevocationConfirmed);
  return serverRevocationConfirmed;
}
