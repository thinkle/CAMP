import { describe, expect, test } from "vitest";
import { Activity, StudentPreferences } from "../../types";
import {
  CapacityError,
  DuplicateError,
  scoreSchedule,
  validateSchedule,
} from "./scoreSchedule";

describe("Validate Schedule", () => {
  const validSchedule = [
    { activity: "Activity 1", student: "Student 1" },
    { activity: "Activity 1", student: "Student 2" },
    { activity: "Activity 2", student: "Student 3" },
    { activity: "Activity 2", student: "Student 4" },
  ];
  const activities: Activity[] = [
    { activity: "Activity 1", capacity: 2 },
    { activity: "Activity 2", capacity: 2 },
  ];
  const overbookedSchedule = [
    { activity: "Activity 1", student: "Student 1" },
    { activity: "Activity 1", student: "Student 2" },
    { activity: "Activity 1", student: "Student 3" },
    { activity: "Activity 2", student: "Student 4" },
  ];
  const dupedSchedule = [
    { activity: "Activity 1", student: "Student 1" },
    { activity: "Activity 1", student: "Student 1" },
    { activity: "Activity 2", student: "Student 3" },
    { activity: "Activity 2", student: "Student 4" },
  ];

  test("Valid schedule should return null", () => {
    expect(validateSchedule(validSchedule, activities)).toBe(null);
  });

  test("Overbooked schedule should return CapacityError", () => {
    expect(validateSchedule(overbookedSchedule, activities)).toBe(
      CapacityError
    );
  });

  test("Schedule with duplicate student should return DuplicateError", () => {
    expect(validateSchedule(dupedSchedule, activities)).toBe(DuplicateError);
  });
});

describe("Score schedules using summed preferences", () => {
  test("Activity scores sum correctly", () => {
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      { activity: "Activity 2", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];
    // score should be...
    // 1 -> 1
    // 2 -> 3
    // 3 -> 60
    // 4 -> 80
    // total -> 144
    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student 1",
        activity: [
          { activity: "Activity 1", weight: 1 },
          { activity: "Activity 2", weight: 20 },
        ],
        peer: [],
      },
      {
        identifier: "Student 2",
        activity: [
          { activity: "Activity 1", weight: 3 },
          { activity: "Activity 2", weight: 40 },
        ],
        peer: [],
      },
      {
        identifier: "Student 3",
        activity: [
          { activity: "Activity 1", weight: 5 },
          { activity: "Activity 2", weight: 60 },
        ],
        peer: [],
      },
      {
        identifier: "Student 4",
        activity: [
          { activity: "Activity 1", weight: 7 },
          { activity: "Activity 2", weight: 80 },
        ],
        peer: [],
      },
    ];
    expect(scoreSchedule(schedule, studentPreferences)).toBe(144);
  });
  test("Peer scores sum correctly", () => {
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      { activity: "Activity 2", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];
    // 11 + 12 + 13 + 14 -> 50
    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student 1",
        activity: [],
        peer: [
          { peer: "Student 2", weight: 11 },
          { peer: "Student 3", weight: 20 },
        ],
      },
      {
        identifier: "Student 2",
        activity: [],
        peer: [
          { peer: "Student 1", weight: 12 },
          { peer: "Student 3", weight: 40 },
        ],
      },
      {
        identifier: "Student 3",
        activity: [],
        peer: [
          { peer: "Student 4", weight: 13 },
          { peer: "Student 2", weight: 60 },
        ],
      },
      {
        identifier: "Student 4",
        activity: [],
        peer: [
          { peer: "Student 3", weight: 14 },
          { peer: "Student 2", weight: 80 },
        ],
      },
    ];
    expect(scoreSchedule(schedule, studentPreferences)).toBe(50);
  });

  test("Mixed scores sum correctly", () => {
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      { activity: "Activity 2", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];
    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student 1",
        activity: [
          { activity: "Activity 1", weight: 1 },
          { activity: "Activity 2", weight: 20 },
        ],
        peer: [
          { peer: "Student 2", weight: 11 },
          { peer: "Student 3", weight: 20 },
        ],
      },
      {
        identifier: "Student 2",
        activity: [
          { activity: "Activity 1", weight: 3 },
          { activity: "Activity 2", weight: 40 },
        ],
        peer: [
          { peer: "Student 1", weight: 12 },
          { peer: "Student 3", weight: 40 },
        ],
      },
      {
        identifier: "Student 3",
        activity: [
          { activity: "Activity 1", weight: 5 },
          { activity: "Activity 2", weight: 60 },
        ],
        peer: [
          { peer: "Student 4", weight: 13 },
          { peer: "Student 2", weight: 60 },
        ],
      },
      {
        identifier: "Student 4",
        activity: [
          { activity: "Activity 1", weight: 7 },
          { activity: "Activity 2", weight: 80 },
        ],
        peer: [
          { peer: "Student 3", weight: 14 },
          { peer: "Student 2", weight: 80 },
        ],
      },
    ];
    expect(scoreSchedule(schedule, studentPreferences)).toBe(194);
  });
});
