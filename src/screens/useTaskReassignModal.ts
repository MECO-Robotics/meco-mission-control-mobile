import { useState } from "react";

import type { Task } from "../types/domain";

type UseTaskReassignModalOptions = {
  reassignTask: (task: Task, ownerId: string | null) => Promise<void>;
};

export function useTaskReassignModal({ reassignTask }: UseTaskReassignModalOptions) {
  const [task, setTask] = useState<Task | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const open = (target: Task) => {
    setTask(target);
    setOwnerId(target.ownerId);
  };

  const close = () => {
    setTask(null);
    setOwnerId(null);
  };

  const save = async () => {
    if (!task) {
      return;
    }

    await reassignTask(task, ownerId);
    close();
  };

  return {
    close,
    open,
    ownerId,
    save,
    setOwnerId,
    task,
  };
}
