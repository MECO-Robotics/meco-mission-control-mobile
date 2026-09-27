import { buildLanes } from "../../../ui/landscapeTimeline/landscapeTimelineModel";
import { derivePartLifecycleStatus } from "../../../ui/helpers";
import { createElement } from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { mecoSnapshot } from "../../../data/mockData";
import { useAppTheme } from "../../../ui/themeContext";
import { TaskEditorModal } from "../TaskEditorModal";
import { useTaskEditor } from "../useTaskEditor";

const subsystems = ["a", "b", "c"].map((id) => ({ ...mecoSnapshot.subsystems[0], id, name: `Subsystem ${id}` }));
const mechanisms = ["a", "b", "c", "a2"].map((id) => ({
  ...mecoSnapshot.mechanisms[0], id: `m-${id}`, subsystemId: id[0], name: `Mechanism ${id}`,
}));
const parts = mechanisms.map((item) => ({
  ...mecoSnapshot.partInstances[0], id: `p-${item.id}`, mechanismId: item.id,
  subsystemId: item.subsystemId, name: `Part ${item.id}`,
}));
const task = {
  ...mecoSnapshot.tasks[0], subsystemIds: ["a", "b"], mechanismIds: ["m-a", "m-b"],
  partInstanceIds: ["p-m-a", "p-m-b"], workstreamIds: ["work-a", "work-b"], artifactIds: ["doc-a", "doc-b"],
};
const index = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((item) => [item.id, item]));

function setup(taskToEdit = task) {
  const writes: Record<string, unknown>[] = [];
  let editor!: ReturnType<typeof useTaskEditor>;
  function Harness() {
    editor = useTaskEditor({
      tasks: [taskToEdit], taskById: { [taskToEdit.id]: taskToEdit }, taskDependencies: [], mechanisms, partInstances: parts,
      members: mecoSnapshot.members, membersById: index(mecoSnapshot.members), disciplines: mecoSnapshot.disciplines,
      subsystemsById: index(subsystems), taskSubsystemOptions: subsystems,
      activeTaskSubteam: "programming", setActiveTaskSubteam: jest.fn(), refresh: async () => undefined,
      request: async <T,>(path: string, init: RequestInit): Promise<T> => {
        if (path === "/api/bootstrap") return { taskDependencies: [], taskBlockers: [] } as T;
        writes.push(JSON.parse(init.body as string));
        return { item: task } as T;
      },
    });
    return createElement(TaskEditorModal, {
      editor, appResponsiveStyles: { calloutBody: {}, calloutBox: {}, calloutTitle: {} },
      disciplineOptions: mecoSnapshot.disciplines, disciplinesById: index(mecoSnapshot.disciplines),
      eventOptions: [], eventsById: {}, isLandscapeCardLayout: false,
      mechanisms, mechanismsById: index(mechanisms), memberOptions: mecoSnapshot.members,
      partInstances: parts, partInstancesById: index(parts), partDefinitionsById: index(mecoSnapshot.partDefinitions),
      subsystemsById: index(subsystems), taskSubsystemOptions: subsystems, themeColors: useAppTheme().colors,
    });
  }
  const view = render(createElement(Harness));
  act(() => editor.openEditTaskEditor(taskToEdit));
  const choose = (label: string, name: string | RegExp) => {
    fireEvent.press(view.getByRole("button", { name: new RegExp(`^${label}:`) }));
    const option = view.getAllByRole("button", { name }).find((node) => node.props.accessibilityState?.selected !== undefined);
    expect(option).toBeDefined();
    fireEvent.press(option!);
  };
  const save = async () => {
    await act(async () => fireEvent.press(view.getByRole("button", { name: "Update task" })));
    return writes[0];
  };
  return { view, choose, save };
}

test("title-only rendered edit preserves all canonical targets and emits no singular mirrors", async () => {
  const { view, save } = setup();
  fireEvent.changeText(view.getByLabelText("Title"), "Updated title only");
  const payload = await save();
  expect(payload).toMatchObject({
    title: "Updated title only", subsystemIds: task.subsystemIds, mechanismIds: task.mechanismIds,
    partInstanceIds: task.partInstanceIds, workstreamIds: task.workstreamIds, artifactIds: task.artifactIds,
  });
  for (const key of ["subsystemId", "mechanismId", "partInstanceId", "workstreamId", "artifactId"]) {
    expect(payload).not.toHaveProperty(key);
  }
});

test("replacing primary subsystem removes its children while retaining the secondary branch", async () => {
  const { choose, save } = setup();
  choose("Subsystem", "Subsystem c");
  expect(await save()).toMatchObject({
    subsystemIds: ["c", "b"], mechanismIds: ["m-c", "m-b"], partInstanceIds: ["p-m-c", "p-m-b"],
    workstreamIds: task.workstreamIds, artifactIds: task.artifactIds,
  });
});

test("replacing primary mechanism and clearing primary part preserves secondary targets", async () => {
  const { choose, save } = setup();
  choose("Mechanism", "Mechanism a2");
  choose("Part instance", "No part instance");
  expect(await save()).toMatchObject({
    subsystemIds: ["a", "b"], mechanismIds: ["m-a2", "m-b"], partInstanceIds: ["p-m-b"],
  });
});

const primaryMechanismWithoutTaskPart = {
  ...task,
  mechanismIds: ["m-a2", "m-b"],
  partInstanceIds: ["p-m-b"],
};

test("clearing an empty primary part keeps the secondary mechanism part", async () => {
  const { choose, save } = setup(primaryMechanismWithoutTaskPart);
  choose("Part instance", "No part instance");
  expect(await save()).toMatchObject({ mechanismIds: ["m-a2", "m-b"], partInstanceIds: ["p-m-b"] });
});

test("replacing an empty primary part keeps the secondary mechanism part", async () => {
  const { choose, save } = setup(primaryMechanismWithoutTaskPart);
  choose("Part instance", /Part m-a2/);
  expect(await save()).toMatchObject({ mechanismIds: ["m-a2", "m-b"], partInstanceIds: ["p-m-a2", "p-m-b"] });
});

test("clearing a primary part keeps unknown and secondary part IDs", async () => {
  const { choose, save } = setup({ ...primaryMechanismWithoutTaskPart, partInstanceIds: ["unknown-part", "p-m-b"] });
  choose("Part instance", "No part instance");
  expect(await save()).toMatchObject({ partInstanceIds: ["unknown-part", "p-m-b"] });
});

test("clearing primary subsystem promotes the retained secondary branch", async () => {
  const { choose, save } = setup();
  choose("Subsystem", "No subsystem");
  expect(await save()).toMatchObject({
    subsystemIds: ["b"], mechanismIds: ["m-b"], partInstanceIds: ["p-m-b"],
  });
});

test("selecting the current primary does not reset its other targets", async () => {
  const { choose, save } = setup();
  choose("Subsystem", "Subsystem a");
  expect(await save()).toMatchObject({
    subsystemIds: task.subsystemIds, mechanismIds: task.mechanismIds, partInstanceIds: task.partInstanceIds,
  });
});

test("timeline membership and part lifecycle include secondary targets without duplicate lane entries", () => {
  const multi = { ...task, subsystemIds: ["a", "b", "b"], startDate: "2026-09-01", dueDate: "2026-09-15", status: "complete" as const };
  const lanes = buildLanes([multi], subsystems, new Date(2026, 8, 1), 30);
  expect(lanes.find((lane) => lane.id === "b")?.tasks.map((item) => item.task.id)).toEqual([task.id]);
  expect(derivePartLifecycleStatus(parts[1], [multi])).toBe("installed");
});
