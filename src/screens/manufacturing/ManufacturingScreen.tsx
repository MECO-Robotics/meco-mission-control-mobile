import { ActionButton } from "../../ui/ActionButton";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  ARCHIVE_FILTER_OPTIONS,
  MANUFACTURING_STATUS_OPTIONS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../../ui/constants";
import { formatDate } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import type { ArchiveFilterMode } from "../../ui/types";

import type { AppScreenProps } from "../types";

export function ManufacturingScreen(props: AppScreenProps) {
  const {
    manufacturingBrowse,
    appResponsiveStyles,
    canMentorApprove,
    editTagStyle,
    members,
    membersById,
    openCreateManufacturingEditor,
    openEditManufacturingEditor,
    patchManufacturingItem,
    subsystems,
    subsystemsById,
  } = props;
  const { filters, updateFilters, rows, summary, materialOptions } = manufacturingBrowse;

  const title =
    filters.view === "all"
      ? "Manufacturing"
      : filters.view === "cnc"
      ? "CNC"
      : filters.view === "prints"
        ? "3D print queue"
        : "Fabrication queue";

  const guidanceKey =
    filters.view === "cnc"
      ? "cnc"
      : filters.view === "prints"
        ? "prints"
        : "fabrication";

  return (
    <>
      <WorkspacePanel
        title={title}
        subtitle="Unified manufacturing rows for part, material, quantity, due date, status, and mentor review."
        actions={
          <ActionButton
            onPress={openCreateManufacturingEditor}
            variant="primary"
            responsiveStyles={appResponsiveStyles}
          >
            Add
          </ActionButton>
        }
      >
        <FilterToolbar>
          <SearchField
            onChangeText={(value) => updateFilters({ search: value })}
            placeholder="Search queue"
            value={filters.search}
          />
          <OptionChipRow
            allLabel="All subsystems"
            onChange={(value) => updateFilters({ subsystemId: value })}
            options={subsystems.map((subsystem) => ({
              id: subsystem.id,
              name: subsystem.name,
            }))}
            value={filters.subsystemId}
          />

          <OptionChipRow
            allLabel="All requesters"
            onChange={(value) => updateFilters({ requesterId: value })}
            options={members.map((member) => ({
              id: member.id,
              name: member.name,
            }))}
            value={filters.requesterId}
          />

          <OptionChipRow
            allLabel="All materials"
            onChange={(value) => updateFilters({ material: value })}
            options={materialOptions}
            value={filters.material}
          />

          <OptionChipRow
            allLabel="All statuses"
            onChange={(value) => updateFilters({ status: value })}
            options={MANUFACTURING_STATUS_OPTIONS}
            value={filters.status}
          />

          <OptionChipRow
            allLabel="Any archive"
            onChange={(value) => updateFilters({ archive: value as ArchiveFilterMode })}
            options={ARCHIVE_FILTER_OPTIONS}
            value={filters.archive}
          />
        </FilterToolbar>

        <SummaryRow chips={summary} />

        {rows.map((item) => {
          const subsystemName = subsystemsById[item.subsystemId]?.name ?? "Unknown";
          const requesterName = item.requestedById
            ? (membersById[item.requestedById]?.name ?? "Unassigned")
            : "Unassigned";
          const canApproveItem = canMentorApprove && !item.mentorReviewed;
          const canStartItem = item.mentorReviewed && item.status === "approved";
          const canCompleteItem = item.mentorReviewed && item.status === "qa";
          const canEditItem = item.status === "requested";

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (canEditItem) {
                  openEditManufacturingEditor(item);
                }
              }}
              style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
            >
              <View style={styles.queueRowHeader}>
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{item.title}</Text>
                  <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                    {subsystemName} - {requesterName}
                  </Text>
                </View>
                <Text style={editTagStyle}>{canEditItem ? "EDIT" : "VIEW"}</Text>
              </View>

              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Material {item.material} | Qty {item.quantity} | Due {formatDate(item.dueDate)}
              </Text>
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Batch {item.batchLabel ?? "Unbatched"} | Mentor {item.mentorReviewed ? "Reviewed" : "Pending"}
              </Text>

              <View style={styles.queuePillRow}>
                <StatusPill label={item.status.replace("-", " ")} value={item.status} />
                <StatusPill label={item.process === "3d-print" ? "3D print" : item.process} value="info" />
              </View>

              <View style={styles.quickActionRow}>
                {canApproveItem ? (
                  <Pressable
                    onPress={() =>
                      patchManufacturingItem(item, {
                        mentorReviewed: true,
                      })
                    }
                    style={[
                      styles.quickActionButton,
                      appResponsiveStyles.quickActionButton,
                      styles.quickActionButtonPrimary,
                    ]}
                  >
                    <Text style={styles.quickActionButtonPrimaryLabel}>Approve</Text>
                  </Pressable>
                ) : null}

                {canStartItem ? (
                  <ActionButton
                    onPress={() => patchManufacturingItem(item, { status: "in-progress" })}
                    variant="quick"
                    responsiveStyles={appResponsiveStyles}
                  >
                    Start
                  </ActionButton>
                ) : null}

                {item.status === "in-progress" ? (
                  <ActionButton
                    onPress={() => patchManufacturingItem(item, { status: "qa" })}
                    variant="quick"
                    responsiveStyles={appResponsiveStyles}
                  >
                    QA
                  </ActionButton>
                ) : null}

                {canCompleteItem ? (
                  <ActionButton
                    onPress={() => patchManufacturingItem(item, { status: "complete" })}
                    variant="quick"
                    responsiveStyles={appResponsiveStyles}
                  >
                    Complete
                  </ActionButton>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {rows.length === 0 ? (
          <EmptyState text="No manufacturing items match the current filters." />
        ) : null}

        <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE[guidanceKey]} />
      </WorkspacePanel>
    </>
  );
}
