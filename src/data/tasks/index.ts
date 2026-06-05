import { electricalTasks } from "./electricalTasks";
import { mechanicalTasks } from "./mechanicalTasks";
import { programmingOffseasonTasks } from "./programmingOffseasonTasks";
import { programmingTasks } from "./programmingTasks";

export const tasks = [
  ...programmingTasks,
  ...programmingOffseasonTasks,
  ...mechanicalTasks,
  ...electricalTasks,
];
