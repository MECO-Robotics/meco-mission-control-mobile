import type { Subsystem, Task } from "../../types/domain";
import { timelineAccentColors, timelineDisciplineColors } from "../../theme";

export const DAY_WIDTH = 46;
export const VISIBLE_DAY_COUNT = 31;

const LANE_MIN_HEIGHT = 52;
const TASK_BAR_HEIGHT = 26;
const TASK_BAR_GAP = 7;
const TASK_BAR_TOP_PADDING = 10;
const SUBSYSTEM_COLORS = timelineAccentColors.subsystems;
const TASK_COLORS = timelineAccentColors.tasks;

const MOBILE_DISCIPLINE_TIMELINE_COLORS: Record<string, string> = {
  mechanical: timelineDisciplineColors.manufacturing,
  electrical: timelineDisciplineColors.electrical,
  software: timelineDisciplineColors.programming,
  programming: timelineDisciplineColors.programming,
  integration: timelineDisciplineColors.testing,
  "qa-test": timelineDisciplineColors.testing,
};

function getStableColorIndex(value: string, colorCount: number) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash % colorCount;
}

export function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(start: Date, end: Date) {
  return Math.round((parseDate(toDateKey(end)).getTime() - parseDate(toDateKey(start)).getTime()) / 86400000);
}

function getTaskStartDate(task: Task) {
  if (task.startDate) {
    return parseDate(task.startDate);
  }

  const estimatedDays = Math.max(1, Math.min(5, Math.ceil(task.estimatedHours / 4)));
  return addDays(parseDate(task.dueDate), -estimatedDays + 1);
}

export function getTaskDateRange(task: Task) {
  const taskStart = getTaskStartDate(task);
  const taskEnd = parseDate(task.dueDate);

  return taskStart <= taskEnd
    ? { start: taskStart, end: taskEnd }
    : { start: taskEnd, end: taskStart };
}

export function getTimelineDays(anchor: Date) {
  return Array.from({ length: getDaysInMonth(anchor) }, (_value, index) => addDays(anchor, index));
}

export function getDaysInMonth(anchor: Date) {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
}

export function getMonthStartDate(anchor: Date) {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

export function getCalendarDays(monthStart: Date) {
  const firstMonthDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = addDays(firstMonthDay, -firstMonthDay.getDay());

  return Array.from({ length: 42 }, (_value, index) => addDays(gridStart, index));
}

function getTaskDateIndexes(task: Task, monthStart: Date, dayCount: number) {
  const startIndex = daysBetween(monthStart, getTaskStartDate(task));
  const endIndex = daysBetween(monthStart, parseDate(task.dueDate));
  const firstIndex = Math.min(startIndex, endIndex);
  const lastIndex = Math.max(startIndex, endIndex);

  return { firstIndex, lastIndex };
}

export function getLaneTaskRange(task: Task, monthStart: Date, dayCount: number) {
  const { firstIndex, lastIndex } = getTaskDateIndexes(task, monthStart, dayCount);
  if (lastIndex < 0 || firstIndex >= dayCount) {
    return null;
  }

  const visibleFirstIndex = Math.max(0, firstIndex);
  const visibleLastIndex = Math.min(dayCount - 1, lastIndex);

  return {
    left: visibleFirstIndex * DAY_WIDTH + 4,
    width: Math.max(DAY_WIDTH - 8, (visibleLastIndex - visibleFirstIndex + 1) * DAY_WIDTH - 8),
  };
}

export function getTimelineStartDate(tasks: Task[], fallbackStart: Date, dayCount: number) {
  if (tasks.length === 0) {
    return fallbackStart;
  }

  const fallbackEnd = addDays(fallbackStart, dayCount - 1);
  const hasVisibleTask = tasks.some((task) => {
    const { start: firstDate, end: lastDate } = getTaskDateRange(task);

    return firstDate <= fallbackEnd && lastDate >= fallbackStart;
  });

  if (hasVisibleTask) {
    return fallbackStart;
  }

  return tasks.reduce((earliest, task) => {
    const taskStart = getTaskStartDate(task);
    return taskStart < earliest ? taskStart : earliest;
  }, getTaskStartDate(tasks[0]));
}

function getLaneHeight(trackCount: number) {
  if (trackCount <= 1) {
    return LANE_MIN_HEIGHT;
  }

  return Math.max(
    LANE_MIN_HEIGHT,
    TASK_BAR_TOP_PADDING * 2 + trackCount * TASK_BAR_HEIGHT + (trackCount - 1) * TASK_BAR_GAP,
  );
}

function getTaskTimelineColor(task: Task, fallbackIndex: number) {
  return MOBILE_DISCIPLINE_TIMELINE_COLORS[task.disciplineId] ?? TASK_COLORS[fallbackIndex % TASK_COLORS.length];
}

export function buildLanes(tasks: Task[], subsystems: Subsystem[], monthStart: Date, dayCount: number) {
  const subsystemsById = Object.fromEntries(
    subsystems.map((subsystem) => [subsystem.id, subsystem]),
  ) as Record<string, Subsystem>;
  const lanesBySubsystem = new Map<string, { subsystem: Subsystem | null; tasks: Task[] }>(
    subsystems.map((subsystem) => [subsystem.id, { subsystem, tasks: [] }]),
  );

  [...tasks]
    .sort((left, right) => {
      const subsystemDelta = left.subsystemId.localeCompare(right.subsystemId);
      if (subsystemDelta !== 0) {
        return subsystemDelta;
      }

      return (
        getTaskStartDate(left).getTime() - getTaskStartDate(right).getTime() ||
        left.dueDate.localeCompare(right.dueDate)
      );
    })
    .forEach((task) => {
      const lane = lanesBySubsystem.get(task.subsystemId) ?? {
        subsystem: subsystemsById[task.subsystemId] ?? null,
        tasks: [],
      };
      lane.tasks.push(task);
      lanesBySubsystem.set(task.subsystemId, lane);
    });

  return Array.from(lanesBySubsystem.entries()).map(([subsystemId, lane]) => {
    const trackEndIndexes: number[] = [];
    const taskColorOffset = getStableColorIndex(subsystemId, TASK_COLORS.length);
    const visibleTasks = lane.tasks.filter((task) => getLaneTaskRange(task, monthStart, dayCount) !== null);
    const packedTasks = visibleTasks.map((task, taskIndex) => {
      const dateIndexes = getTaskDateIndexes(task, monthStart, dayCount);
      const trackIndex = trackEndIndexes.findIndex((endIndex) => endIndex < dateIndexes.firstIndex);
      const nextTrackIndex = trackIndex >= 0 ? trackIndex : trackEndIndexes.length;
      trackEndIndexes[nextTrackIndex] = dateIndexes.lastIndex;

      return {
        color: getTaskTimelineColor(task, taskColorOffset + taskIndex),
        task,
        top: TASK_BAR_TOP_PADDING + nextTrackIndex * (TASK_BAR_HEIGHT + TASK_BAR_GAP),
      };
    });

    return {
      id: subsystemId,
      color: SUBSYSTEM_COLORS[getStableColorIndex(subsystemId, SUBSYSTEM_COLORS.length)],
      height: getLaneHeight(trackEndIndexes.length),
      subsystem: lane.subsystem,
      tasks: packedTasks,
    };
  });
}

export type PackedLane = ReturnType<typeof buildLanes>[number];

export function expandLanesForViewport<TLane extends ReturnType<typeof buildLanes>[number]>(
  lanes: TLane[],
  viewportHeight: number,
) {
  if (viewportHeight < 700 || lanes.length === 0) {
    return lanes;
  }

  const totalLaneHeight = lanes.reduce((sum, lane) => sum + lane.height, 0);
  const targetLaneHeight = Math.max(
    totalLaneHeight,
    Math.min(viewportHeight - 300, totalLaneHeight + lanes.length * 120),
  );
  const extraHeight = Math.max(0, Math.floor((targetLaneHeight - totalLaneHeight) / lanes.length));

  if (extraHeight === 0) {
    return lanes;
  }

  return lanes.map((lane) => ({
    ...lane,
    height: lane.height + extraHeight,
    tasks: lane.tasks.map((packedTask) => ({
      ...packedTask,
      top: packedTask.top + Math.floor(extraHeight / 2),
    })),
  }));
}
