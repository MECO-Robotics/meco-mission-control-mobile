import type { Member } from "../../types/domain";

export const offseasonMembers: Member[] = [
  {
    id: "samira",
    name: "Samira Haddad",
    role: "lead",
    disciplineId: "electrical",
    plannedWeeklyAttendanceHours: 6,
    plannedAttendanceDays: ["monday", "wednesday", "saturday"],
    plannedAttendanceNotes: "Electrical lead for battery, radio, and pit loadout readiness.",
  },
  {
    id: "caleb",
    name: "Caleb Wright",
    role: "student",
    disciplineId: "mechanical",
    plannedWeeklyAttendanceHours: 4,
    plannedAttendanceDays: ["thursday", "saturday"],
    plannedAttendanceNotes: "Practice-field reset crew and spare bumper repair support.",
  },
  {
    id: "nina",
    name: "Nina Rossi",
    role: "mentor",
    disciplineId: "software",
    plannedWeeklyAttendanceHours: 3,
    plannedAttendanceDays: ["tuesday", "saturday"],
    plannedAttendanceNotes: "Vision calibration and scouting tablet mentor support.",
  },
];
