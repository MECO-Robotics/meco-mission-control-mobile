import type { PersistedAuthSession } from "./authSessionStorage";

type ActiveMobileSessionPersistence = {
  clear: () => Promise<void>;
  persist: (session: PersistedAuthSession) => Promise<void>;
};

type CommitActiveMobileSessionOptions = {
  expectedVersion: number;
  getVersion: () => number;
  publish: (session: PersistedAuthSession) => void;
  session: PersistedAuthSession;
};

export class ActiveMobileSessionCoordinator {
  private operation: Promise<void> = Promise.resolve();

  constructor(private readonly persistence: ActiveMobileSessionPersistence) {}

  clear() {
    return this.runExclusive(() => this.persistence.clear());
  }

  commit({
    expectedVersion,
    getVersion,
    publish,
    session,
  }: CommitActiveMobileSessionOptions) {
    return this.runExclusive(async () => {
      await this.persistence.persist(session);
      if (getVersion() !== expectedVersion) {
        await this.persistence.clear().catch(() => undefined);
        return false;
      }

      publish(session);
      return true;
    });
  }

  private runExclusive<T>(operation: () => Promise<T>) {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
