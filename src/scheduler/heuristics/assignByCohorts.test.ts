import { describe, it, expect } from "vitest";
import { assignByCohorts } from "./assignByCohorts";
import type { StudentPreferences, Activity, Assignment } from "../../types";
import { assignByCohorts, getCohorts } from "./assignByCohorts";

describe("assignByCohorts", () => {
  it("should assign students to activities based on their preferences and peer weights", () => {
    const prefs: StudentPreferences[] = [
      {
        identifier: "student1",
        peer: [{ peer: "student2", weight: 3 }],
        activity: [
          { activity: "activity1", weight: 5 },
          { activity: "activity2", weight: 2 },
        ],
      },
      {
        identifier: "student2",
        peer: [{ peer: "student1", weight: 3 }],
        activity: [
          { activity: "activity1", weight: 4 },
          { activity: "activity2", weight: 3 },
        ],
      },
      {
        identifier: "student3",
        peer: [{ peer: "student4", weight: 2 }],
        activity: [
          { activity: "activity1", weight: 1 },
          { activity: "activity2", weight: 4 },
        ],
      },
      {
        identifier: "student4",
        peer: [{ peer: "student3", weight: 2 }],
        activity: [
          { activity: "activity1", weight: 2 },
          { activity: "activity2", weight: 5 },
        ],
      },
    ];

    const activities: Activity[] = [
      { activity: "activity1", capacity: 3 },
      { activity: "activity2", capacity: 3 },
    ];

    const maxCohortSize = 2;
    const schedule: Assignment[] = assignByCohorts(
      prefs,
      activities,
      maxCohortSize
    );

    expect(schedule).toEqual([
      { student: "student1", activity: "activity1" },
      { student: "student2", activity: "activity1" },
      { student: "student3", activity: "activity2" },
      { student: "student4", activity: "activity2" },
    ]);
  });

  describe("assignByCohorts", () => {
    it("should assign students to activities based on their preferences and peer weights", () => {
      const prefs: StudentPreferences[] = [
        {
          identifier: "student1",
          peer: [{ peer: "student2", weight: 3 }],
          activity: [
            { activity: "activity1", weight: 5 },
            { activity: "activity2", weight: 2 },
          ],
        },
        {
          identifier: "student2",
          peer: [{ peer: "student1", weight: 3 }],
          activity: [
            { activity: "activity1", weight: 4 },
            { activity: "activity2", weight: 3 },
          ],
        },
        {
          identifier: "student3",
          peer: [{ peer: "student4", weight: 2 }],
          activity: [
            { activity: "activity1", weight: 1 },
            { activity: "activity2", weight: 4 },
          ],
        },
        {
          identifier: "student4",
          peer: [{ peer: "student3", weight: 2 }],
          activity: [
            { activity: "activity1", weight: 2 },
            { activity: "activity2", weight: 5 },
          ],
        },
      ];

      const activities: Activity[] = [
        { activity: "activity1", capacity: 3 },
        { activity: "activity2", capacity: 3 },
      ];

      const maxCohortSize = 2;
      const schedule: Assignment[] = assignByCohorts(
        prefs,
        activities,
        maxCohortSize
      );

      expect(schedule).toEqual([
        { student: "student1", activity: "activity1" },
        { student: "student2", activity: "activity1" },
        { student: "student3", activity: "activity2" },
        { student: "student4", activity: "activity2" },
      ]);
    });

    it("should throw an error if a cohort cannot fit into any activity", () => {
      const prefs: StudentPreferences[] = [
        {
          identifier: "student1",
          peer: [
            { peer: "student2", weight: 3 },
            { peer: "student3", weight: 2 },
          ],
          activity: [
            { activity: "activity1", weight: 5 },
            { activity: "activity2", weight: 2 },
          ],
        },
        {
          identifier: "student2",
          peer: [
            { peer: "student1", weight: 3 },
            { peer: "student3", weight: 3 },
          ],
          activity: [
            { activity: "activity1", weight: 4 },
            { activity: "activity2", weight: 3 },
          ],
        },
        {
          identifier: "student3",
          peer: [
            { peer: "student2", weight: 3 },
            { peer: "student1", weight: 3 },
          ],
          activity: [
            { activity: "activity1", weight: 1 },
            { activity: "activity2", weight: 4 },
          ],
        },
        {
          identifier: "student4",
          peer: [{ peer: "student3", weight: 2 }],
          activity: [
            { activity: "activity1", weight: 2 },
            { activity: "activity2", weight: 5 },
          ],
        },
      ];

      const activities: Activity[] = [
        { activity: "activity1", capacity: 2 },
        { activity: "activity2", capacity: 2 },
      ];

      const maxCohortSize = 3;

      expect(() => assignByCohorts(prefs, activities, maxCohortSize)).toThrow();
    });
  });

  describe("getCohorts", () => {
    it("should form cohorts based on peer weights and max cohort size", () => {
      const prefs: StudentPreferences[] = [
        {
          identifier: "student1",
          peer: [{ peer: "student2", weight: 3 }],
          activity: [],
        },
        {
          identifier: "student2",
          peer: [{ peer: "student1", weight: 3 }],
          activity: [],
        },
        {
          identifier: "student3",
          peer: [{ peer: "student4", weight: 2 }],
          activity: [],
        },
        {
          identifier: "student4",
          peer: [{ peer: "student3", weight: 2 }],
          activity: [],
        },
      ];

      const maxCohortSize = 2;
      const cohorts = getCohorts(prefs, maxCohortSize);

      expect(cohorts).toEqual([
        ["student1", "student2"],
        ["student3", "student4"],
      ]);
    });

    it("should respect the minimum weight for forming edges", () => {
      const prefs: StudentPreferences[] = [
        {
          identifier: "student1",
          peer: [{ peer: "student2", weight: 1 }],
          activity: [],
        },
        {
          identifier: "student2",
          peer: [{ peer: "student1", weight: 1 }],
          activity: [],
        },
        {
          identifier: "student3",
          peer: [{ peer: "student4", weight: 2 }],
          activity: [],
        },
        {
          identifier: "student4",
          peer: [{ peer: "student3", weight: 2 }],
          activity: [],
        },
      ];

      const maxCohortSize = 2;
      const minWeight = 2;
      const cohorts = getCohorts(prefs, maxCohortSize, minWeight);

      expect(cohorts).toEqual([
        ["student3", "student4"],
        ["student1"],
        ["student2"],
      ]);
    });

    it("should not merge cohorts if it exceeds the max cohort size", () => {
      const prefs: StudentPreferences[] = [
        {
          identifier: "student1",
          peer: [{ peer: "student2", weight: 3 }],
          activity: [],
        },
        {
          identifier: "student2",
          peer: [{ peer: "student1", weight: 3 }],
          activity: [],
        },
        {
          identifier: "student3",
          peer: [{ peer: "student4", weight: 2 }],
          activity: [],
        },
        {
          identifier: "student4",
          peer: [{ peer: "student3", weight: 2 }],
          activity: [],
        },
      ];

      const maxCohortSize = 1;
      const cohorts = getCohorts(prefs, maxCohortSize);

      expect(cohorts).toEqual([
        ["student1"],
        ["student2"],
        ["student3"],
        ["student4"],
      ]);
    });

    it("Should handle non-existent peers without merging cohorts if it exceeds the max cohort size", () => {
      const prefs = [
        {
          identifier: "student1",
          peer: [{ peer: "yeti", weight: 3 }],
          activity: [],
        },
        {
          identifier: "student2",
          peer: [{ peer: "student1", weight: 3 }],
          activity: [],
        },
        {
          identifier: "student3",
          peer: [{ peer: "student4", weight: 2 }],
          activity: [],
        },
        {
          identifier: "student4",
          peer: [{ peer: "student3", weight: 2 }],
          activity: [],
        },
        {
          identifier: "student5",
          peer: [{ peer: "student6", weight: 2 }],
          activity: [],
        },
        {
          identifier: "student6",
          peer: [{ peer: "student6", weight: 2 }],
          activity: [],
        },
        ...[
          8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
          26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
          43, 44, 45, 46, 47,
        ].map((i) => ({
          identifier: `student${i}`,
          peer: [
            { peer: "student1", weight: 3 },
            { peer: "student2", weight: 3 },
            { peer: `student${i - 1}`, weight: 8 },
            { peer: "yeti", weight: 10 },
          ],
          activity: [],
        })),
      ];
      const cohorts = getCohorts(prefs, 8, 1);
      for (let cohort of cohorts) {
        expect(cohort.length).toBeLessThan(9);
      }
    });
  });
});
