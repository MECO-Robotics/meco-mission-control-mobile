import type { Mechanism, Requirement, Subsystem } from "../../types/domain";

export const offseasonSubsystems: Subsystem[] = [
  {
    id: "practice-field",
    name: "Practice Field",
    description: "Portable field elements, driver drills, reset crew flow, and safety boundaries.",
    isCore: false,
    parentSubsystemId: null,
    responsibleEngineerId: "caleb",
    mentorIds: ["emma"],
    risks: ["Field element wear", "Reset timing drift"],
  },
];

export const offseasonMechanisms: Mechanism[] = [
  {
    id: "practice-grid",
    subsystemId: "practice-field",
    name: "Practice Grid",
    description: "Portable taped lanes, reset bins, driver station boundary, and drill timing aids.",
  },
  {
    id: "vision-calibration",
    subsystemId: "vision",
    name: "Vision Calibration",
    description: "Camera mounting, AprilTag target checks, and pose-estimator regression notes.",
  },
];

export const offseasonRequirements: Requirement[] = [
  {
    id: "field-req-1",
    subsystemId: "practice-field",
    title: "Practice field must support six-minute match cycles.",
    description: "Reset flow, taped boundaries, and spare game pieces must keep drills on schedule.",
    moscowPriority: "should",
    status: "planned",
  },
  {
    id: "vision-req-1",
    subsystemId: "vision",
    title: "Vision calibration must remain stable across practice lighting.",
    description: "Camera transforms and tag detection notes must be documented before scrimmage.",
    moscowPriority: "should",
    status: "in-progress",
  },
];
