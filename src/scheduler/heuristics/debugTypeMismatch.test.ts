import { describe, test } from "vitest";
import { assignByPeer } from "./peerFirstHeuristic";
import { preparePreferencesForScheduling } from "../utils/normalizePreferences";

describe("Debug type mismatch", () => {
  test("investigate what happens with mismatched types", async () => {
    const activities: any[] = [
      { activity: 201, capacity: 10 },
      { activity: 202, capacity: 10 },
    ];

    const studentPreferences: any[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 0 },
          { activity: "202", weight: 0 },
        ],
        peer: [{ peer: "Student2", weight: 50 }],
      },
      {
        identifier: "Student2",
        activity: [
          { activity: "201", weight: 0 },
          { activity: "202", weight: 0 },
        ],
        peer: [{ peer: "Student1", weight: 50 }],
      },
    ];

    console.log("=== Testing Type Mismatch ===");
    console.log(
      "Activities:",
      activities.map((a) => ({ name: a.activity, type: typeof a.activity }))
    );
    console.log(
      "Student preferences:",
      studentPreferences[0].activity.map((a) => ({
        name: a.activity,
        type: typeof a.activity,
      }))
    );
    console.log("Direct comparison: 201 === '201':", 201 === "201");
    console.log("Loose comparison: 201 == '201':", 201 == "201");

    const { studentPreferences: normalized, mode } =
      preparePreferencesForScheduling(studentPreferences, activities);
    console.log("Mode:", mode);
    console.log("Normalized prefs:", normalized[0].activity);

    try {
      const schedule = assignByPeer(studentPreferences, activities);
      console.log("Schedule succeeded:", schedule);

      // Now let's try to score it
      const { scoreSchedule } = await import("../scoring/scoreSchedule");
      const score = scoreSchedule(schedule, studentPreferences, {
        mutualPeerMultiplier: 1,
        nonMutualPeerMultiplier: 0.5,
        noPeerPenalty: 0,
        noActivityPenalty: 0,
      });
      console.log("Score:", score);

      // Let's check if students got their preferred activities
      for (const assignment of schedule) {
        const student = studentPreferences.find(
          (s) => s.identifier === assignment.student
        );
        const hasPreference = student.activity.some(
          (a) => a.activity === assignment.activity
        );
        console.log(
          `${assignment.student} assigned to ${
            assignment.activity
          } (type: ${typeof assignment.activity}), has preference: ${hasPreference}`
        );
      }
    } catch (e: any) {
      console.log("Schedule failed:", e.message);
    }
  });
});
