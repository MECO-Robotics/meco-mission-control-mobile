import { Modal, Pressable, ScrollView, View } from "react-native";

import { Text } from "../i18n";
import {
  ARCHIVE_FILTER_OPTIONS,
  BLOCKER_FILTER_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_SUBTEAM_OPTIONS,
} from "../ui/constants";
import { styles } from "../ui/styles";
import {
  FilterToolbar,
  OptionChipRow,
  SearchField,
  SectionTabs,
} from "../ui/ui";
import type { ArchiveFilterMode, BlockerFilterMode } from "../ui/types";

import type { AppScreenProps } from "./types";

type TaskQueueFilterSheetProps = Pick<
  AppScreenProps,
  | "activeTaskSubteam"
  | "appResponsiveStyles"
  | "members"
  | "setActiveTaskSubteam"
  | "setTaskArchiveFilter"
  | "setTaskBlockerFilter"
  | "setTaskOwnerFilter"
  | "setTaskPriorityFilter"
  | "setTaskSearch"
  | "setTaskStatusFilter"
  | "setTaskSubsystemFilter"
  | "subsystems"
  | "taskArchiveFilter"
  | "taskBlockerFilter"
  | "taskOwnerFilter"
  | "taskPriorityFilter"
  | "taskSearch"
  | "taskStatusFilter"
  | "taskSubsystemFilter"
  | "themeColors"
> & {
  onClose: () => void;
  onReset: () => void;
  visible: boolean;
};

export function TaskQueueFilterSheet({
  activeTaskSubteam,
  appResponsiveStyles,
  members,
  onClose,
  onReset,
  setActiveTaskSubteam,
  setTaskArchiveFilter,
  setTaskBlockerFilter,
  setTaskOwnerFilter,
  setTaskPriorityFilter,
  setTaskSearch,
  setTaskStatusFilter,
  setTaskSubsystemFilter,
  subsystems,
  taskArchiveFilter,
  taskBlockerFilter,
  taskOwnerFilter,
  taskPriorityFilter,
  taskSearch,
  taskStatusFilter,
  taskSubsystemFilter,
  themeColors,
  visible,
}: TaskQueueFilterSheetProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={visible}
    >
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable
          style={[
            styles.taskQueueFilterSheet,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
        >
          <View style={styles.queueRowHeader}>
            <View style={styles.queueRowPrimaryText}>
              <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                Filters
              </Text>
              <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                Narrow the queue by team, owner, status, priority, and flags.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
            >
              <Text
                style={[
                  styles.quickActionButtonLabel,
                  appResponsiveStyles.quickActionButtonLabel,
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.taskQueueFilterSheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.taskQueueFilterGroup}>
              <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
                Subteam
              </Text>
              <SectionTabs
                activeValue={activeTaskSubteam}
                onChange={setActiveTaskSubteam}
                options={TASK_SUBTEAM_OPTIONS}
              />
            </View>

            <FilterToolbar>
              <SearchField
                onChangeText={setTaskSearch}
                placeholder="Search tasks"
                value={taskSearch}
              />

              <OptionChipRow
                allLabel="All subsystems"
                onChange={setTaskSubsystemFilter}
                options={subsystems.map((subsystem) => ({
                  id: subsystem.id,
                  name: subsystem.name,
                }))}
                value={taskSubsystemFilter}
              />

              <OptionChipRow
                allLabel="All owners"
                onChange={setTaskOwnerFilter}
                options={members.map((member) => ({
                  id: member.id,
                  name: member.name,
                }))}
                value={taskOwnerFilter}
              />

              <OptionChipRow
                allLabel="All statuses"
                onChange={setTaskStatusFilter}
                options={TASK_STATUS_OPTIONS}
                value={taskStatusFilter}
              />

              <OptionChipRow
                allLabel="All priorities"
                onChange={setTaskPriorityFilter}
                options={TASK_PRIORITY_OPTIONS}
                value={taskPriorityFilter}
              />

              <OptionChipRow
                allLabel="All flags"
                onChange={(value) => setTaskBlockerFilter(value as BlockerFilterMode)}
                options={BLOCKER_FILTER_OPTIONS}
                value={taskBlockerFilter}
              />

              <OptionChipRow
                allLabel="Any archive"
                onChange={(value) => setTaskArchiveFilter(value as ArchiveFilterMode)}
                options={ARCHIVE_FILTER_OPTIONS}
                value={taskArchiveFilter}
              />
            </FilterToolbar>

            <View style={styles.quickActionRow}>
              <Pressable
                onPress={onReset}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text
                  style={[
                    styles.quickActionButtonLabel,
                    appResponsiveStyles.quickActionButtonLabel,
                  ]}
                >
                  Reset filters
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
