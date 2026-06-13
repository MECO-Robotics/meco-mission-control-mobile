import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import {
  ARCHIVE_FILTER_OPTIONS,
  MANUFACTURING_STATUS_OPTIONS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../ui/constants";
import { formatDate } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";
import type { ArchiveFilterMode } from "../ui/types";

import type { AppScreenProps } from "./types";

export function ManufacturingScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    canMentorApprove,
    editTagStyle,
    filteredManufacturing,
    manufacturingArchiveFilter,
    manufacturingMaterialFilter,
    manufacturingMaterialOptions,
    manufacturingRequesterFilter,
    manufacturingSearch,
    manufacturingStatusFilter,
    manufacturingSubsystemFilter,
    manufacturingSummary,
    manufacturingView,
    members,
    membersById,
    openCreateManufacturingEditor,
    openEditManufacturingEditor,
    patchManufacturingItem,
    setManufacturingArchiveFilter,
    setManufacturingMaterialFilter,
    setManufacturingRequesterFilter,
    setManufacturingSearch,
    setManufacturingStatusFilter,
    setManufacturingSubsystemFilter,
    subsystems,
    subsystemsById,
  } = props;

  const title =
    manufacturingView === "cnc"
      ? "CNC"
      : manufacturingView === "prints"
        ? "3D print queue"
        : "Fabrication queue";

  const guidanceKey =
    manufacturingView === "cnc"
      ? "cnc"
      : manufacturingView === "prints"
        ? "prints"
        : "fabrication";

  return (
    <>
      <WorkspacePanel
        title={title}
        subtitle="Unified manufacturing rows for part, material, quantity, due date, status, and mentor review."
        actions={
          <Pressable onPress={openCreateManufacturingEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
          </Pressable>
        }
      >
        <FilterToolbar>
          <SearchField
            onChangeText={setManufacturingSearch}
            placeholder="Search queue"
            value={manufacturingSearch}
          />
          <OptionChipRow
            allLabel="All subsystems"
            onChange={setManufacturingSubsystemFilter}
            options={subsystems.map((subsystem) => ({
              id: subsystem.id,
              name: subsystem.name,
            }))}
            value={manufacturingSubsystemFilter}
          />

          <OptionChipRow
            allLabel="All requesters"
            onChange={setManufacturingRequesterFilter}
            options={members.map((member) => ({
              id: member.id,
              name: member.name,
            }))}
            value={manufacturingRequesterFilter}
          />

          <OptionChipRow
            allLabel="All materials"
            onChange={setManufacturingMaterialFilter}
            options={manufacturingMaterialOptions}
            value={manufacturingMaterialFilter}
          />

          <OptionChipRow
            allLabel="All statuses"
            onChange={setManufacturingStatusFilter}
            options={MANUFACTURING_STATUS_OPTIONS}
            value={manufacturingStatusFilter}
          />

          <OptionChipRow
            allLabel="Any archive"
            onChange={(value) => setManufacturingArchiveFilter(value as ArchiveFilterMode)}
            options={ARCHIVE_FILTER_OPTIONS}
            value={manufacturingArchiveFilter}
          />
        </FilterToolbar>

        <SummaryRow chips={manufacturingSummary} />

        {filteredManufacturing.map((item) => {
          const subsystemName = subsystemsById[item.subsystemId]?.name ?? "Unknown";
          const requesterName = item.requestedById
            ? (membersById[item.requestedById]?.name ?? "Unassigned")
            : "Unassigned";
          const canApproveItem = canMentorApprove && !item.mentorReviewed;
          const canStartItem =
            item.mentorReviewed &&
            (item.status === "requested" || item.status === "approved");
          const canCompleteItem = item.status !== "complete";

          return (
            <Pressable
              key={item.id}
              onPress={() => openEditManufacturingEditor(item)}
              style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
            >
              <View style={styles.queueRowHeader}>
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{item.title}</Text>
                  <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                    {subsystemName} - {requesterName}
                  </Text>
                </View>
                <Text style={editTagStyle}>EDIT</Text>
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
                        status: item.status === "requested" ? "approved" : item.status,
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
                  <Pressable
                    onPress={() =>
                      patchManufacturingItem(item, {
                        status: item.status === "qa" ? "qa" : "in-progress",
                      })
                    }
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                  >
                    <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                      Start
                    </Text>
                  </Pressable>
                ) : null}

                {item.status === "in-progress" ? (
                  <Pressable
                    onPress={() => patchManufacturingItem(item, { status: "qa" })}
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                  >
                    <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                      QA
                    </Text>
                  </Pressable>
                ) : null}

                {canCompleteItem ? (
                  <Pressable
                    onPress={() =>
                      patchManufacturingItem(item, {
                        mentorReviewed: true,
                        status: "complete",
                      })
                    }
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                  >
                    <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                      Complete
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {filteredManufacturing.length === 0 ? (
          <EmptyState text="No manufacturing items match the current filters." />
        ) : null}

        <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE[guidanceKey]} />
      </WorkspacePanel>
    </>
  );
}
