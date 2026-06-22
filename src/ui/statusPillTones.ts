import { statusToneColors, workflowStatusToneColors } from "../theme";

export const explicitStatusPillTones: Record<string, { backgroundColor: string; color: string }> = {
  "not-started": {
    backgroundColor: workflowStatusToneColors.notStarted.surface,
    color: workflowStatusToneColors.notStarted.ink,
  },
  planned: {
    backgroundColor: workflowStatusToneColors.notStarted.surface,
    color: workflowStatusToneColors.notStarted.ink,
  },
  "in-progress": {
    backgroundColor: workflowStatusToneColors.inProgress.surface,
    color: workflowStatusToneColors.inProgress.ink,
  },
  "waiting-for-qa": {
    backgroundColor: workflowStatusToneColors.waitingForQa.surface,
    color: workflowStatusToneColors.waitingForQa.ink,
  },
  qa: {
    backgroundColor: workflowStatusToneColors.waitingForQa.surface,
    color: workflowStatusToneColors.waitingForQa.ink,
  },
  complete: {
    backgroundColor: workflowStatusToneColors.complete.surface,
    color: workflowStatusToneColors.complete.ink,
  },
  critical: {
    backgroundColor: statusToneColors.danger.surface,
    color: statusToneColors.danger.ink,
  },
  high: {
    backgroundColor: workflowStatusToneColors.highPriority.surface,
    color: workflowStatusToneColors.highPriority.ink,
  },
  medium: {
    backgroundColor: statusToneColors.warning.surface,
    color: statusToneColors.warning.ink,
  },
  low: {
    backgroundColor: statusToneColors.neutral.surface,
    color: statusToneColors.neutral.ink,
  },
  blocked: {
    backgroundColor: workflowStatusToneColors.blocked.surface,
    color: workflowStatusToneColors.blocked.ink,
  },
  warning: {
    backgroundColor: statusToneColors.warning.surface,
    color: statusToneColors.warning.ink,
  },
  waiting: {
    backgroundColor: workflowStatusToneColors.dependencyWait.surface,
    color: workflowStatusToneColors.dependencyWait.ink,
  },
  requested: {
    backgroundColor: workflowStatusToneColors.highPriority.surface,
    color: workflowStatusToneColors.highPriority.ink,
  },
};
