import { describe, test, expect } from "vitest";
import {
  validateActivityTypes,
  validateActivityReferences,
  validatePeerReferences,
  validateCapacity,
  validateData,
} from "./validateData";
import type { Activity, StudentPreferences } from "../../types";

describe("validateActivityTypes", () => {
  test("should detect type mismatch between activities and preferences", () => {
    const activities: any[] = [
      { activity: 201, capacity: 10 },  // number
      { activity: 202, capacity: 10 },
    ];

    const studentPreferences: any[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 10 },  // string
          { activity: "202", weight: 5 },
        ],
        peer: [],
      },
    ];

    const warnings = validateActivityTypes(activities, studentPreferences);
    expect(warnings.length).toBe(1);
    expect(warnings[0].type).toBe("type-mismatch");
    expect(warnings[0].severity).toBe("error");
    expect(warnings[0].message).toContain("number");
    expect(warnings[0].message).toContain("string");
  });

  test("should not warn when types match", () => {
    const activities: Activity[] = [
      { activity: "201", capacity: 10 },
      { activity: "202", capacity: 10 },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 10 },
          { activity: "202", weight: 5 },
        ],
        peer: [],
      },
    ];

    const warnings = validateActivityTypes(activities, studentPreferences);
    expect(warnings.length).toBe(0);
  });
});

describe("validateActivityReferences", () => {
  test("should detect unknown activity references", () => {
    const activities: Activity[] = [
      { activity: "201", capacity: 10 },
      { activity: "202", capacity: 10 },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 10 },
          { activity: "999", weight: 5 },  // doesn't exist!
        ],
        peer: [],
      },
    ];

    const warnings = validateActivityReferences(activities, studentPreferences);
    expect(warnings.length).toBe(1);
    expect(warnings[0].type).toBe("unknown-activity");
    expect(warnings[0].severity).toBe("error");
    expect(warnings[0].details.unknownActivities).toContain("999");
  });

  test("should not warn when all activities exist", () => {
    const activities: Activity[] = [
      { activity: "201", capacity: 10 },
      { activity: "202", capacity: 10 },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 10 },
          { activity: "202", weight: 5 },
        ],
        peer: [],
      },
    ];

    const warnings = validateActivityReferences(activities, studentPreferences);
    expect(warnings.length).toBe(0);
  });
});

describe("validatePeerReferences", () => {
  test("should detect unknown peer references", () => {
    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student1",
        activity: [],
        peer: [
          { peer: "Student2", weight: 50 },
          { peer: "NonExistent", weight: 30 },  // doesn't exist!
        ],
      },
      {
        identifier: "Student2",
        activity: [],
        peer: [],
      },
    ];

    const warnings = validatePeerReferences(studentPreferences);
    expect(warnings.length).toBe(1);
    expect(warnings[0].type).toBe("unknown-peer");
    expect(warnings[0].severity).toBe("warning");
    expect(warnings[0].details.unknownPeers).toContain("NonExistent");
  });
});

describe("validateCapacity", () => {
  test("should detect insufficient capacity", () => {
    const activities: Activity[] = [
      { activity: "201", capacity: 5 },
      { activity: "202", capacity: 5 },
    ];

    const studentPreferences: StudentPreferences[] = Array.from(
      { length: 15 },
      (_, i) => ({
        identifier: `Student${i}`,
        activity: [],
        peer: [],
      })
    );

    const warnings = validateCapacity(activities, studentPreferences);
    expect(warnings.length).toBe(1);
    expect(warnings[0].type).toBe("capacity-insufficient");
    expect(warnings[0].severity).toBe("error");
    expect(warnings[0].details.shortage).toBe(5);
  });
});

describe("validateData (comprehensive)", () => {
  test("should catch the numeric activity bug", () => {
    // Simulating the real-world bug
    const activities: any[] = [
      { activity: 201, capacity: 10 },
      { activity: 202, capacity: 10 },
    ];

    const studentPreferences: any[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 10 },
          { activity: "202", weight: 5 },
        ],
        peer: [],
      },
    ];

    const warnings = validateData(activities, studentPreferences);
    
    // Should detect the type mismatch
    const typeMismatchWarning = warnings.find(w => w.type === "type-mismatch");
    expect(typeMismatchWarning).toBeDefined();
    expect(typeMismatchWarning!.severity).toBe("error");
    
    // Should also detect that the activity references don't match
    const unknownActivityWarning = warnings.find(w => w.type === "unknown-activity");
    expect(unknownActivityWarning).toBeDefined();
    expect(unknownActivityWarning!.severity).toBe("error");
  });
});
