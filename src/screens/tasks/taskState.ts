import type { Task } from "../../types/domain";

// One authoritative snapshot, synchronously available to async task commands.
export function createTaskState(initial: Task[]) {
  let tasks = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => tasks,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    replace(next: Task[] | ((current: Task[]) => Task[])) {
      tasks = typeof next === "function" ? next(tasks) : next;
      listeners.forEach((listener) => listener());
    },
  };
}
