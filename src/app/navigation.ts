import type { ViewTab } from "../ui/types";

export const NAVIGATION = [
  { value: "home", label: "Home", views: [{ value: "home", label: "Home" }] },
  { value: "work", label: "Work", views: [
    { value: "work-tasks", label: "Tasks" },
    { value: "work-schedule", label: "Schedule" },
    { value: "work-risks", label: "Risks" },
    { value: "work-activity", label: "Activity" },
  ] },
  { value: "resources", label: "Resources", views: [
    { value: "resources-materials", label: "Materials" },
    { value: "resources-parts", label: "Parts" },
    { value: "resources-purchases", label: "Purchases" },
    { value: "resources-manufacturing", label: "Manufacturing" },
    { value: "resources-structure", label: "Structure" },
  ] },
  { value: "team", label: "Team", views: [
    { value: "team-people", label: "People" },
    { value: "team-attendance", label: "Attendance" },
  ] },
] satisfies { value: string; label: string; views: { value: ViewTab; label: string }[] }[];

export function getNavigationSection(view: ViewTab) {
  return NAVIGATION.find((section) => section.views.some((item) => item.value === view))!;
}
