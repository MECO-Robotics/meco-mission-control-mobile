import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../../i18n";
import { DropdownField, EditorModal, ModalField, WorkspacePanel } from "../../ui/ui";
import { styles } from "../../ui/styles";
import type { Member, Project, ResponsibleGroup } from "../../types/domain";
import type { AppScreenProps } from "../types";
import { getGroupTasks, getRemainingHours, getTaskMetrics, getVisibleGroups } from "./teamMetrics";

type Draft = { id?: string; name: string; projectIds: string[]; memberIds: string[] };
const buttonStyle = (color: string) => ({ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: color, margin: 3 });

export function TeamsScreen(props: AppScreenProps) {
  const { responsibleGroups, members, projects, tasks, themeColors, mutate, canMentorApprove, openTaskQueueFromTask, setSelectedMemberId, setActiveTab } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const groups = getVisibleGroups(responsibleGroups, archiveFilter);
  const selected = groups.find((group) => group.id === selectedId) ?? groups[0];
  const selectedTasks = useMemo(() => selected ? getGroupTasks(selected, tasks) : [], [selected, tasks]);
  const metrics = selected?.isArchived ? { open: 0, blocked: 0, overdue: 0, remainingHours: 0 } : getTaskMetrics(selectedTasks);
  const groupMembers = selected ? members.filter((member) => selected.memberIds.includes(member.id)) : [];
  const capacity = selected?.isArchived ? 0 : groupMembers.reduce((sum, member) => sum + (member.plannedWeeklyAttendanceHours ?? 0), 0);

  const openEditor = (group?: ResponsibleGroup) => {
    setDraft(group ? { id: group.id, name: group.name, projectIds: [...group.projectIds], memberIds: [...group.memberIds] } : { name: "", projectIds: [], memberIds: [] });
    setError("");
  };
  const toggle = (field: "projectIds" | "memberIds", id: string) => setDraft((current) => current ? { ...current, [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id] } : current);
  const save = async () => {
    if (!draft?.name.trim()) { setError("Enter a team name."); return; }
    if (!canMentorApprove) { setError("Only mentors can manage teams."); return; }
    const group = responsibleGroups.find((item) => item.id === draft.id);
    const payload = { seasonId: group?.seasonId ?? members[0]?.seasonId ?? projects[0]?.seasonId, name: draft.name.trim(), projectIds: draft.projectIds, memberIds: draft.memberIds };
    const ok = await mutate(draft.id ? `/api/responsible-groups/${draft.id}` : "/api/responsible-groups", { method: draft.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
    if (ok) { setDraft(null); await props.syncFromBackend(); } else setError("Could not confirm this team was saved.");
  };
  const archive = async () => {
    if (!selected || !canMentorApprove) return;
    const ok = await mutate(`/api/responsible-groups/${selected.id}`, { method: "PATCH", body: JSON.stringify({ isArchived: !selected.isArchived }) });
    if (ok) await props.syncFromBackend();
  };
  const metricRows = [
    ["Members", String(groupMembers.length)], ["Planned weekly capacity", `${capacity}h`], ["Open tasks", String(metrics.open)], ["Blocked tasks", String(metrics.blocked)], ["Overdue tasks", String(metrics.overdue)], ["Estimated hours remaining", `${metrics.remainingHours.toFixed(1)}h`],
  ];
  return <WorkspacePanel title="Teams" subtitle="Subteams own work through their responsible group; workload and capacity are derived from current records." actions={canMentorApprove ? <Pressable onPress={() => openEditor()} style={buttonStyle(themeColors.blue)}><Text style={{ color: themeColors.blue }}>Add team</Text></Pressable> : null}>
    <DropdownField label="Show teams" value={archiveFilter} onChange={(value) => setArchiveFilter(value === "archived" || value === "all" ? value : "active")} options={[{ id: "active", name: "Active" }, { id: "archived", name: "Archived" }, { id: "all", name: "All teams" }]} />
    {groups.map((group) => <Pressable key={group.id} onPress={() => setSelectedId(group.id)} accessibilityRole="button" style={[buttonStyle(themeColors.border), selected?.id === group.id && { backgroundColor: themeColors.navySurface }]}><Text style={{ color: themeColors.ink }}>{group.name}</Text></Pressable>)}
    {!selected ? <Text style={{ color: themeColors.subtleText }}>No {archiveFilter === "archived" ? "archived " : ""}teams yet.</Text> : <>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{metricRows.map(([label, value]) => <View key={label} style={[buttonStyle(themeColors.border), { minWidth: "44%" }]}><Text style={{ color: themeColors.subtleText }}>{label}</Text><Text style={{ color: themeColors.ink, fontWeight: "700" }}>{value}</Text></View>)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginVertical: 6 }}>
        {canMentorApprove ? <><Pressable onPress={() => openEditor(selected)} style={buttonStyle(themeColors.blue)}><Text style={{ color: themeColors.blue }}>Edit team</Text></Pressable><Pressable onPress={archive} style={buttonStyle(themeColors.border)}><Text style={{ color: themeColors.ink }}>{selected.isArchived ? "Restore" : "Archive"}</Text></Pressable></> : null}
        <Text style={{ alignSelf: "center", color: themeColors.subtleText }}>Projects: {selected.projectIds.map((id) => projects.find((item) => item.id === id)?.name ?? id).join(", ") || "All projects"}</Text>
      </View>
      <Text style={[styles.subsectionLabel, { color: themeColors.ink, marginTop: 8 }]}>Members and assigned workload</Text>
      {groupMembers.map((member) => {
        const assigned = selected?.isArchived ? [] : selectedTasks.filter((task) => task.status !== "complete" && (task.ownerId === member.id || task.assigneeIds.includes(member.id)));
        const remaining = assigned.filter((task) => task.status !== "complete").reduce((sum, task) => sum + getRemainingHours(task), 0);
        return <Pressable key={member.id} onPress={() => { setSelectedMemberId(member.id); setActiveTab("team-people"); }} style={[buttonStyle(themeColors.border), { flexDirection: "row", justifyContent: "space-between" }]}><Text style={{ color: themeColors.ink }}>{member.name}{member.role === "lead" || member.role === "admin" ? " · Lead" : member.role === "mentor" ? " · Mentor" : ""}</Text><Text style={{ color: themeColors.subtleText }}>{assigned.length} tasks · {remaining.toFixed(1)}h / {member.plannedWeeklyAttendanceHours ?? 0}h capacity</Text></Pressable>;
      })}
      <Text style={[styles.subsectionLabel, { color: themeColors.ink, marginTop: 8 }]}>Group tasks</Text>
      {selectedTasks.filter((task) => task.status !== "complete").map((task) => <Pressable key={task.id} onPress={() => openTaskQueueFromTask(task)} style={[buttonStyle(themeColors.border), { flexDirection: "row", justifyContent: "space-between" }]}><Text style={{ color: themeColors.ink, flex: 1 }}>{task.title}{task.isBlocked ? " · Blocked" : ""}</Text><Text style={{ color: themeColors.subtleText }}>{getRemainingHours(task).toFixed(1)}h</Text></Pressable>)}
    </>}
    <EditorModal title={draft?.id ? "Edit team" : "Add team"} visible={Boolean(draft)} onCancel={() => setDraft(null)} onSave={save} saveLabel={draft?.id ? "Update team" : "Add team"}>
      {error ? <Text style={{ color: themeColors.orangeInk }}>{error}</Text> : null}
      <ModalField label="Team name" value={draft?.name ?? ""} onChangeText={(name) => setDraft((current) => current ? { ...current, name } : current)} placeholder="Team name" />
      <Text style={{ color: themeColors.ink, marginTop: 8 }}>Projects</Text>
      <ChoiceList values={projects} selected={draft?.projectIds ?? []} onToggle={(id) => toggle("projectIds", id)} label={(project: Project) => project.name} colors={themeColors} />
      <Text style={{ color: themeColors.ink, marginTop: 8 }}>Members</Text>
      <ChoiceList values={members.filter((member) => member.role !== "external")} selected={draft?.memberIds ?? []} onToggle={(id) => toggle("memberIds", id)} label={(member: Member) => `${member.name}${member.role === "mentor" ? " · Mentor" : member.role === "lead" || member.role === "admin" ? " · Lead" : ""}`} colors={themeColors} />
    </EditorModal>
  </WorkspacePanel>;
}

function ChoiceList<T extends { id: string }>({ values, selected, onToggle, label, colors }: { values: T[]; selected: string[]; onToggle: (id: string) => void; label: (value: T) => string; colors: AppScreenProps["themeColors"] }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{values.map((value) => <Pressable key={value.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(value.id) }} onPress={() => onToggle(value.id)} style={[buttonStyle(selected.includes(value.id) ? colors.blue : colors.border), selected.includes(value.id) && { backgroundColor: colors.navySurface }]}><Text style={{ color: colors.ink }}>{selected.includes(value.id) ? "✓ " : ""}{label(value)}</Text></Pressable>)}</View>;
}
