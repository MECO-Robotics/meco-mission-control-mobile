import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import { styles } from "../ui/styles";
import { EditorModal } from "../ui/ui";
import type { Member, Task } from "../types/domain";

import type { AppScreenProps } from "./types";

type TaskReassignModalProps = Pick<AppScreenProps, "appResponsiveStyles" | "membersById"> & {
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
          <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
            <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
              Current owner
            </Text>
            <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
              {task.ownerId ? membersById[task.ownerId]?.name ?? "Unknown owner" : "Unassigned"}
            </Text>
          </View>
          <View style={styles.quickActionRow}>
            <Pressable
              onPress={() => onChangeOwner(null)}
              style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
            >
              <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                Unassigned
              </Text>
            </Pressable>
            {ownerOptions.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => onChangeOwner(member.id)}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  {ownerId === member.id ? `${member.name} selected` : member.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </EditorModal>
  );
}
