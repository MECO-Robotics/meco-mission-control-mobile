import type {
  AttendanceRecord,
  Escalation,
  Event,
  Meeting,
  QaReview,
  WorkLog,
} from "../../types/domain";

export const offseasonEvents: Event[] = [
  {
    id: "vision-drive-calibration-jun-20",
    title: "Vision Drive Calibration",
    type: "drive-practice",
    startDateTime: "2026-06-20T09:00:00-04:00",
    endDateTime: "2026-06-20T12:00:00-04:00",
    isExternal: false,
    description: "Closed-field practice for camera calibration, autonomous replay, and driver feedback loops.",
    relatedSubsystemIds: ["vision", "controls", "drive", "practice-field"],
  },
  {
    id: "offseason-volunteer-day-jul-11",
    title: "Offseason Volunteer Day",
    type: "demo",
    startDateTime: "2026-07-11T10:00:00-04:00",
    endDateTime: "2026-07-11T14:00:00-04:00",
    isExternal: true,
    description: "Community volunteer event with robot demos, practice-field teardown, and pit safety walkthroughs.",
    relatedSubsystemIds: ["practice-field", "pit-readiness", "drive"],
  },
];

export const offseasonMeetings: Meeting[] = [
  {
    id: "vision-calibration-night",
    title: "Vision calibration night",
    date: "2026-06-18",
    time: "6:00 PM",
    rsvpsYes: 12,
    rsvpsMaybe: 4,
    openSignIns: 2,
  },
];

export const offseasonWorkLogs: WorkLog[] = [
  {
    id: "log-11",
    taskId: "vision-apriltag-recalibration",
    date: "2026-06-01",
    hours: 2.5,
    participantIds: ["noah", "nina", "ethan"],
    notes: "Checked camera transforms against practice lighting and captured drift notes for replay testing.",
  },
  {
    id: "log-12",
    taskId: "practice-field-reset-flow",
    date: "2026-06-02",
    hours: 2,
    participantIds: ["caleb", "samira", "emma"],
    notes: "Laid out taped lanes, timed reset crew flow, and tagged field-kit repairs before scrimmage setup.",
  },
  {
    id: "log-13",
    taskId: "radio-brownout-checklist",
    date: "2026-06-03",
    hours: 1.25,
    participantIds: ["samira", "priya"],
    notes: "Validated radio retention clips and added brownout checks to the pre-match pit card.",
  },
];

export const offseasonAttendanceRecords: AttendanceRecord[] = [
  { id: "att-11", memberId: "nina", date: "2026-06-01", totalHours: 2.5 },
  { id: "att-12", memberId: "caleb", date: "2026-06-02", totalHours: 2 },
  { id: "att-13", memberId: "samira", date: "2026-06-03", totalHours: 1.25 },
];

export const offseasonQaReviews: QaReview[] = [
  {
    id: "qa-8",
    taskId: "vision-apriltag-recalibration",
    subjectId: "vision-apriltag-recalibration",
    subjectType: "task",
    subjectTitle: "Recalibrate AprilTag vision",
    participantIds: ["noah", "nina", "ethan"],
    result: "iteration-worthy",
    mentorApproved: false,
    notes: "Pose estimates are stable near center field, but edge lighting still needs another camera exposure pass.",
  },
  {
    id: "qa-9",
    taskId: "practice-field-reset-flow",
    subjectId: "practice-field-reset-flow",
    subjectType: "task",
    subjectTitle: "Tune practice-field reset flow",
    participantIds: ["caleb", "emma"],
    result: "minor-fix",
    mentorApproved: false,
    notes: "Reset bins and lane tape work, but human-player station labels need clearer numbering before scrimmage.",
  },
];

export const offseasonEscalations: Escalation[] = [
  {
    title: "Practice field reset is not yet at match cadence",
    detail:
      "Reset timing is still above the six-minute target until field labels and volunteer station assignments are cleaned up.",
    severity: "medium",
  },
  {
    title: "Vision calibration needs one more lighting pass",
    detail:
      "AprilTag pose estimates drift near the edge of the taped field when shop doors are open during evening practice.",
    severity: "medium",
  },
];
