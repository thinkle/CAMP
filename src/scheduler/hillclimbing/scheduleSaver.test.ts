import { describe, it, expect } from "vitest";
import { scheduleToId, idToSchedule } from "./scheduleSaver";
interface Activity {
  activity: string;
}

interface Student {
  identifier: string;
}

interface ScheduleItem {
  student: string;
  activity: string;
}

type Schedule = ScheduleItem[];

describe("scheduleSaver", () => {
  const activities: Activity[] = [
    { activity: "Math" },
    { activity: "Science" },
    { activity: "History" },
  ];

  const students: Student[] = [
    { identifier: "student1" },
    { identifier: "student2" },
    { identifier: "student3" },
    { identifier: "student4" },
  ];

  const schedule: Schedule = [
    { student: "student1", activity: "Math" },
    { student: "student2", activity: "Science" },
    { student: "student3", activity: "History" },
    { student: "student4", activity: "Math" },
  ];

  it("should generate a unique ID for a given schedule", () => {
    const id = scheduleToId(schedule, activities);
    expect(id).toBeTruthy();
  });

  it("should generate the same ID for the same schedule regardless of order", () => {
    const scheduleShuffled: Schedule = [
      { student: "student3", activity: "History" },
      { student: "student4", activity: "Math" },
      { student: "student2", activity: "Science" },
      { student: "student1", activity: "Math" },
    ];
    const id1 = scheduleToId(schedule, activities);
    const id2 = scheduleToId(scheduleShuffled, activities);
    expect(id1).toBe(id2);
  });

  it("should generate a schedule from a unique ID", () => {
    const id = scheduleToId(schedule, activities);
    const generatedSchedule = idToSchedule(id, students, activities);
    expect(generatedSchedule).toEqual(expect.arrayContaining(schedule));
    expect(schedule).toEqual(expect.arrayContaining(generatedSchedule));
  });

  it("should throw an error for an invalid ID", () => {
    const invalidId = "invalidId";
    expect(() => idToSchedule(invalidId, students, activities)).toThrow();
  });

  it("should parse ID back into schedule successfully", () => {
    const id = scheduleToId(schedule, activities);
    const generatedSchedule = idToSchedule(id, students, activities);
    expect(generatedSchedule).toEqual(schedule);
  });
});
