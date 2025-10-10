import { describe, it, expect } from "vitest";
import { healMinimumSize } from "./healMinimumSize";
import type { Schedule, Activity, StudentPreferences } from "../../types";

let studentCounter = 1;

function makeStudents(
  n: number,
  prefs: { activity: string; weight: number }[],
  mutualPeerPrefs = false,
  weightPeer = (index: number) => 100
): StudentPreferences[] {
  const students: StudentPreferences[] = [];
  for (let i = 0; i < n; i++) {
    students.push({
      identifier: `student${studentCounter++}`,
      activity: prefs,
      peer: [],
    });
  }
  if (mutualPeerPrefs) {
    // Make all students prefer each other as peers
    for (let i = 0; i < students.length; i++) {
      for (let j = 0; j < students.length; j++) {
        if (i !== j) {
          students[i].peer.push({
            peer: students[j].identifier,
            weight: weightPeer(j),
          });
        }
      }
    }
  }

  return students;
}
describe("healMinimumSize", () => {
  const activities: Activity[] = [
    { activity: "Art", capacity: 10, minSize: 3 },
    { activity: "Music", capacity: 10, minSize: 3 },
    { activity: "Sports", capacity: 10, minSize: 3 },
  ];

  it("should return schedule unchanged when all activities meet minimum", () => {
    studentCounter = 1;

    const prefs = makeStudents(3, [
      { activity: "Art", weight: 100 },
      { activity: "Music", weight: 50 },
    ]);

    const schedule: Schedule = prefs.map((p) => ({
      student: p.identifier,
      activity: "Art",
    }));

    const healed = healMinimumSize(schedule, prefs, activities);
    expect(healed).toEqual(schedule);
  });

  it("should recruit students to undersized activity when they prefer it", () => {
    studentCounter = 1;

    // 2 students strongly prefer Art
    const artLovers = makeStudents(2, [
      { activity: "Art", weight: 100 },
      { activity: "Music", weight: 50 },
    ]);

    // 1 student prefers Art slightly over Music - can be recruited
    const flexStudent = makeStudents(1, [
      { activity: "Art", weight: 100 },
      { activity: "Music", weight: 90 },
    ]);

    // 3 students strongly prefer Music
    const musicLovers = makeStudents(3, [
      { activity: "Music", weight: 100 },
      { activity: "Art", weight: 50 },
    ]);

    const allPrefs = [...artLovers, ...flexStudent, ...musicLovers];

    // Art has only 2 students (below min of 3)
    // Music has 4 students (above min of 3), but flexStudent prefers Art
    const schedule: Schedule = [
      ...artLovers.map((p) => ({ student: p.identifier, activity: "Art" })),
      ...flexStudent.map((p) => ({ student: p.identifier, activity: "Music" })),
      ...musicLovers.map((p) => ({ student: p.identifier, activity: "Music" })),
    ];

    const healed = healMinimumSize(schedule, allPrefs, activities);
    expect(healed).not.toBeNull();

    const artCount = healed!.filter((a) => a.activity === "Art").length;
    const musicCount = healed!.filter((a) => a.activity === "Music").length;

    expect(artCount).toBeGreaterThanOrEqual(3); // Should meet minimum
    expect(musicCount).toBeGreaterThanOrEqual(3); // Should still meet minimum
  });

  it("should disband activity if can't recruit enough students", () => {
    studentCounter = 1;

    // For this test, Art has no minimum so students can be reassigned there
    const testActivities: Activity[] = [
      { activity: "Art", capacity: 10 }, // No minimum
      { activity: "Music", capacity: 10, minSize: 3 },
      { activity: "Sports", capacity: 10, minSize: 3 },
    ];

    // 2 students prefer Sports (but not strongly enough to resist disbanding)
    const sportsStudent1 = makeStudents(1, [
      { activity: "Sports", weight: 100 },
      { activity: "Music", weight: 50 },
    ]);

    const sportsStudent2 = makeStudents(1, [
      { activity: "Sports", weight: 100 },
      { activity: "Art", weight: 50 },
    ]);

    // 3 students strongly prefer Music over Sports
    const musicLovers = makeStudents(3, [
      { activity: "Music", weight: 100 },
      { activity: "Sports", weight: 20 },
    ]);

    const allPrefs = [...sportsStudent1, ...sportsStudent2, ...musicLovers];

    // Sports has only 2 students (below min), can't recruit from Music
    const schedule: Schedule = [
      ...sportsStudent1.map((p) => ({
        student: p.identifier,
        activity: "Sports",
      })),
      ...sportsStudent2.map((p) => ({
        student: p.identifier,
        activity: "Sports",
      })),
      ...musicLovers.map((p) => ({ student: p.identifier, activity: "Music" })),
    ];

    const healed = healMinimumSize(schedule, allPrefs, testActivities);
    expect(healed).not.toBeNull();

    // Sports should be disbanded
    const sportsCount = healed!.filter((a) => a.activity === "Sports").length;
    expect(sportsCount).toBe(0);

    // Students should be reassigned to their next preferences
    const student1Assignment = healed!.find(
      (a) => a.student === sportsStudent1[0].identifier
    );
    const student2Assignment = healed!.find(
      (a) => a.student === sportsStudent2[0].identifier
    );
    expect(student1Assignment?.activity).toBe("Music");
    expect(student2Assignment?.activity).toBe("Art");
  });

  it("should not break source activity minimum when recruiting", () => {
    studentCounter = 1;

    // 2 students prefer Art
    const artLovers = makeStudents(2, [
      { activity: "Art", weight: 100 },
      { activity: "Music", weight: 50 },
    ]);

    // 3 students prefer Music slightly over Art
    const musicLovers = makeStudents(3, [
      { activity: "Music", weight: 100 },
      { activity: "Art", weight: 90 },
    ]);

    const allPrefs = [...artLovers, ...musicLovers];

    // Art has 2 (needs 3), Music has 3 (exactly at minimum)
    // Can't recruit from Music without breaking its minimum
    const schedule: Schedule = [
      ...artLovers.map((p) => ({ student: p.identifier, activity: "Art" })),
      ...musicLovers.map((p) => ({ student: p.identifier, activity: "Music" })),
    ];

    const healed = healMinimumSize(schedule, allPrefs, activities);

    if (healed) {
      const musicCount = healed.filter((a) => a.activity === "Music").length;
      // Music should still meet minimum (wasn't raided)
      expect(musicCount).toBeGreaterThanOrEqual(3);
    }
  });

  it("should return null if healing is impossible", () => {
    studentCounter = 1;

    const limitedActivities: Activity[] = [
      { activity: "Art", capacity: 3, minSize: 3 },
      { activity: "Music", capacity: 3, minSize: 3 },
    ];

    // 2 students only want Art
    const artLovers = makeStudents(2, [{ activity: "Art", weight: 100 }]);

    // 3 students only want Music
    const musicLovers = makeStudents(3, [{ activity: "Music", weight: 100 }]);

    const allPrefs = [...artLovers, ...musicLovers];

    // Art has 2 (needs 3), Music is full at 3
    // Can't fix Art without breaking Music or exceeding Music's capacity
    const schedule: Schedule = [
      ...artLovers.map((p) => ({ student: p.identifier, activity: "Art" })),
      ...musicLovers.map((p) => ({ student: p.identifier, activity: "Music" })),
    ];

    const healed = healMinimumSize(schedule, allPrefs, limitedActivities);
    expect(healed).toBeNull();
  });

  it("should handle activities with no minimum size", () => {
    studentCounter = 1;

    const mixedActivities: Activity[] = [
      { activity: "Art", capacity: 10, minSize: 3 },
      { activity: "Music", capacity: 10 }, // No minimum
      { activity: "Sports", capacity: 10, minSize: 3 },
    ];

    // 1 student prefers Art
    const artLover = makeStudents(1, [
      { activity: "Art", weight: 100 },
      { activity: "Music", weight: 50 },
    ]);

    // 1 student prefers Music
    const musicLover = makeStudents(1, [
      { activity: "Music", weight: 100 },
      { activity: "Art", weight: 90 },
    ]);

    // 3 students prefer Sports
    const sportsLovers = makeStudents(3, [
      { activity: "Sports", weight: 100 },
      { activity: "Music", weight: 50 },
    ]);

    const allPrefs = [...artLover, ...musicLover, ...sportsLovers];

    // Art has 1 (needs 3), Music has 1 (no min), Sports has 3 (OK)
    const schedule: Schedule = [
      ...artLover.map((p) => ({ student: p.identifier, activity: "Art" })),
      ...musicLover.map((p) => ({ student: p.identifier, activity: "Music" })),
      ...sportsLovers.map((p) => ({
        student: p.identifier,
        activity: "Sports",
      })),
    ];

    const healed = healMinimumSize(schedule, allPrefs, mixedActivities);
    expect(healed).not.toBeNull();

    // Music can have any size, so it's OK
    const musicCount = healed!.filter((a) => a.activity === "Music").length;
    expect(musicCount).toBeGreaterThanOrEqual(0);

    // Art should either meet minimum or be disbanded
    const artCount = healed!.filter((a) => a.activity === "Art").length;
    expect(artCount === 0 || artCount >= 3).toBe(true);
  });

  it("should heal imbalanced schedule with flexible students", () => {
    // Reset counter for predictable student IDs
    studentCounter = 1;

    const testActivities: Activity[] = [
      { activity: "Art", capacity: 12, minSize: 5 },
      { activity: "Music", capacity: 12, minSize: 5 },
    ];

    // 3 students who strongly prefer Music
    const musicLovers = makeStudents(3, [
      { activity: "Music", weight: 100 },
      { activity: "Art", weight: 20 },
    ]);

    // 3 students who strongly prefer Art
    const artLovers = makeStudents(3, [
      { activity: "Art", weight: 100 },
      { activity: "Music", weight: 20 },
    ]);

    // 6 students who are flexible (like both equally)
    const flexible = makeStudents(6, [
      { activity: "Art", weight: 80 },
      { activity: "Music", weight: 80 },
    ]);

    const allPrefs = [...musicLovers, ...artLovers, ...flexible];

    // Initial schedule: 9 in Art (3 art lovers + 6 flexible), 3 in Music (music lovers)
    // Art meets minimum (9 >= 5), but Music is below minimum (3 < 5)
    const schedule: Schedule = [
      ...artLovers.map((p) => ({ student: p.identifier, activity: "Art" })),
      ...flexible.map((p) => ({ student: p.identifier, activity: "Art" })),
      ...musicLovers.map((p) => ({ student: p.identifier, activity: "Music" })),
    ];

    const healed = healMinimumSize(schedule, allPrefs, testActivities);
    expect(healed).not.toBeNull();

    const artCount = healed!.filter((a) => a.activity === "Art").length;
    const musicCount = healed!.filter((a) => a.activity === "Music").length;

    // Both should meet minimum
    expect(artCount).toBeGreaterThanOrEqual(5);
    expect(musicCount).toBeGreaterThanOrEqual(5);

    // The 3 art lovers should stay in Art
    for (const artLover of artLovers) {
      const assignment = healed!.find((a) => a.student === artLover.identifier);
      expect(assignment?.activity).toBe("Art");
    }

    // The 3 music lovers should stay in Music
    for (const musicLover of musicLovers) {
      const assignment = healed!.find(
        (a) => a.student === musicLover.identifier
      );
      expect(assignment?.activity).toBe("Music");
    }

    // Some flexible students should have moved to Music
    const flexibleInMusic = flexible.filter((f) =>
      healed!.find((a) => a.student === f.identifier && a.activity === "Music")
    );
    expect(flexibleInMusic.length).toBeGreaterThanOrEqual(2); // Need at least 2 to reach min of 5
  });
});
