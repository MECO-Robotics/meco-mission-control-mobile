import type { Task } from "../../../../types/domain";

export type TaskSeed = Pick<Task, "id" | "title" | "summary"> & Partial<Omit<Task, "id" | "title" | "summary">>;
