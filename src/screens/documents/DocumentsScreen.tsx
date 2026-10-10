import { Linking, Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { styles } from "../../ui/styles";
import { EmptyState, WorkspacePanel } from "../../ui/ui";
import type { AppScreenProps } from "../types";

export function DocumentsScreen({ artifacts, projectsById, appResponsiveStyles }: AppScreenProps) {
  const documents = [...artifacts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return (
    <WorkspacePanel title="Documents" subtitle="Documents, media, and evidence linked across FRC projects and workflows.">
      {documents.map((artifact) => (
        <View key={artifact.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
          <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{artifact.title}</Text>
          <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
            {projectsById[artifact.projectId]?.name ?? "Unknown project"} · {artifact.kind} · {artifact.status}
          </Text>
          {artifact.summary ? <Text style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{artifact.summary}</Text> : null}
          {artifact.targetRefs.map((target, index) => (
            <Text key={`${target.kind}:${target.id}:${index}`} style={appResponsiveStyles.metaLine}>
              {target.kind}: {target.id}
            </Text>
          ))}
          <Pressable accessibilityRole="link" accessibilityLabel={`Open ${artifact.title}`} onPress={() => void Linking.openURL(artifact.uri)}>
            <Text style={[styles.queueRowSubtitle, appResponsiveStyles.metaLine]}>{artifact.uri}</Text>
          </Pressable>
        </View>
      ))}
      {documents.length === 0 ? <EmptyState text="No documents or evidence have been added yet." /> : null}
    </WorkspacePanel>
  );
}
