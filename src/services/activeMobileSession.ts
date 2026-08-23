import type { PersistedAuthSession } from "./authSessionStorage";

type CommitActiveMobileSessionOptions = {
  clearPersisted: () => Promise<void>;
  expectedVersion: number;
  getVersion: () => number;
  persist: (session: PersistedAuthSession) => Promise<void>;
  publish: (session: PersistedAuthSession) => void;
  session: PersistedAuthSession;
};

export async function commitActiveMobileSession({
  clearPersisted,
  expectedVersion,
  getVersion,
  persist,
  publish,
  session,
}: CommitActiveMobileSessionOptions) {
  await persist(session);
  if (getVersion() !== expectedVersion) {
    await clearPersisted().catch(() => undefined);
    return false;
  }

  publish(session);
  return true;
}
