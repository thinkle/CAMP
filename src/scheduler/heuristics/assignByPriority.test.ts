import { describe, it, expect } from "vitest";
import { assignByPriority } from "./assignByPriority";
import type { StudentPreferences, Activity } from "../../types";

describe("assignByPriority", () => {
  it("assigns highest-weight preference first among all students", () => {
    const prefs: StudentPreferences[] = [
      {
        identifier: "Alice",
        activity: [
          { activity: "Art", weight: 10 },
          { activity: "Music", weight: 5 },
        ],
        peer: [{ peer: "Bob", weight: 6 }],
      },
      {
        identifier: "Bob",
        activity: [
          { activity: "Music", weight: 9 },
          { activity: "Art", weight: 3 },
        ],
        peer: [{ peer: "Alice", weight: 2 }],
      },
    ];
    const activities: Activity[] = [
      { activity: "Art", capacity: 1 },
      { activity: "Music", capacity: 2 },
    ];

    // The combined preference list might look like:
    // - Alice, activity=Art, w=10
    // - Bob, activity=Music, w=9
    // - Alice, peer=Bob, w=6
    // - ...
    // So 'Art'(10) for Alice gets assigned first, but 'Art' has capacity=1.
    // Then Bob tries 'Music'(9) => assigned.
    // Then Alice tries 'peer=Bob'(6), but she's already assigned => skip.

    const schedule = assignByPriority(prefs, activities);
    expect(schedule).toContainEqual({ student: "Alice", activity: "Art" });
    expect(schedule).toContainEqual({ student: "Bob", activity: "Music" });
  });

  it("throws if a student remains unassigned after preferences are exhausted", () => {
    const prefs: StudentPreferences[] = [
      {
        identifier: "studentA",
        activity: [{ activity: "Act1", weight: 10 }],
        peer: [],
      },
      {
        identifier: "studentB",
        activity: [{ activity: "Act1", weight: 9 }],
        peer: [],
      },
      {
        identifier: "studentC",
        activity: [{ activity: "Act1", weight: 8 }],
        peer: [],
      },
    ];
    const activities: Activity[] = [{ activity: "Act1", capacity: 2 }];

    // Only capacity=2 for Act1, but 3 students => one student can't get assigned
    expect(() => assignByPriority(prefs, activities)).toThrowError(
      /No available assignment for student: studentC/
    );
  });
});
