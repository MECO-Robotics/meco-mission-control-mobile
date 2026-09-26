import { Modal, Pressable, ScrollView, View } from "react-native";

import { Text } from "../../i18n";
import {
  ARCHIVE_FILTER_OPTIONS,
  BLOCKER_FILTER_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_SUBTEAM_OPTIONS,
} from "../../ui/constants";
import { styles } from "../../ui/styles";
import {
  FilterToolbar,
  OptionChipRow,
  SearchField,
  SectionTabs,
} from "../../ui/ui";
import type { ArchiveFilterMode, BlockerFilterMode } from "../../ui/types";

import type { TaskScreenProps } from "../tasks/taskScreenTypes";

type TaskQueueFilterSheetProps = Pick<
  TaskScreenProps,
  | "queue"
  | "activeTaskSubteam"
  | "appResponsiveStyles"
  | "members"
  | "setActiveTaskSubteam"
  | "subsystems"
  | "themeColors"
> & {
  onClose: () => void;
  visible: boolean;
};

export function TaskQueueFilterSheet({
  queue,
  activeTaskSubteam,
  appResponsiveStyles,
  members,
  onClose,
  setActiveTaskSubteam,
  subsystems,
  themeColors,
  visible,
}: TaskQueueFilterSheetProps) {
  const { filters, setFilter, resetFilters } = queue;
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
                onChangeText={(value) => setFilter("taskSearch", value)}
                placeholder="Search tasks"
                value={filters.taskSearch}
              />

              <OptionChipRow
                allLabel="All subsystems"
                onChange={(value) => setFilter("taskSubsystemFilter", value)}
                options={subsystems.map((subsystem) => ({
                  id: subsystem.id,
                  name: subsystem.name,
                }))}
                value={filters.taskSubsystemFilter}
              />

              <OptionChipRow
                allLabel="All owners"
                onChange={(value) => setFilter("taskOwnerFilter", value)}
                options={members.map((member) => ({
                  id: member.id,
                  name: member.name,
                }))}
                value={filters.taskOwnerFilter}
              />

              <OptionChipRow
                allLabel="All statuses"
                onChange={(value) => setFilter("taskStatusFilter", value)}
                options={TASK_STATUS_OPTIONS}
                value={filters.taskStatusFilter}
              />

              <OptionChipRow
                allLabel="All priorities"
                onChange={(value) => setFilter("taskPriorityFilter", value)}
                options={TASK_PRIORITY_OPTIONS}
                value={filters.taskPriorityFilter}
              />

              <OptionChipRow
                allLabel="All flags"
                onChange={(value) => setFilter("taskBlockerFilter", value as BlockerFilterMode)}
                options={BLOCKER_FILTER_OPTIONS}
                value={filters.taskBlockerFilter}
              />

              <OptionChipRow
                allLabel="Any archive"
                onChange={(value) => setFilter("taskArchiveFilter", value as ArchiveFilterMode)}
                options={ARCHIVE_FILTER_OPTIONS}
                value={filters.taskArchiveFilter}
              />
            </FilterToolbar>

            <View style={styles.quickActionRow}>
              <Pressable
                onPress={resetFilters}
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
