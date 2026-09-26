import { Callout } from "../../ui/Callout";
import { ActionButton } from "../../ui/ActionButton";
import { View } from "react-native";

import type { Member, Task } from "../../types/domain";
import { styles } from "../../ui/styles";
import { EditorModal } from "../../ui/ui";

import type { TaskScreenProps } from "../tasks/taskScreenTypes";

type TaskReassignModalProps = Pick<TaskScreenProps, "appResponsiveStyles" | "membersById"> & {
  onCancel: () => void;
  onChangeOwner: (ownerId: string | null) => void;
  onSave: () => void;
  ownerId: string | null;
  ownerOptions: Pick<Member, "id" | "name">[];
  task: Task | null;
};

export function TaskReassignModal({
  appResponsiveStyles,
  membersById,
  onCancel,
  onChangeOwner,
  onSave,
  ownerId,
  ownerOptions,
  task,
}: TaskReassignModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onSave={onSave}
      saveLabel="Reassign"
      title="Reassign task"
      visible={Boolean(task)}
    >
      {task ? (
        <>
          <Callout
            responsiveStyles={appResponsiveStyles}
            title="Current owner"
            body={task.ownerId ? membersById[task.ownerId]?.name ?? "Unknown owner" : "Unassigned"}
          />
          <View style={styles.quickActionRow}>
            <ActionButton onPress={() => onChangeOwner(null)} variant="quick" responsiveStyles={appResponsiveStyles}>Unassigned</ActionButton>
            {ownerOptions.map((member) => (
              <ActionButton key={member.id} onPress={() => onChangeOwner(member.id)} variant="quick" responsiveStyles={appResponsiveStyles}>{ownerId === member.id ? `${member.name} selected` : member.name}</ActionButton>
            ))}
          </View>
        </>
      ) : null}
    </EditorModal>
  );
}
