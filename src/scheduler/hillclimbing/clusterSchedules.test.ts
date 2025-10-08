import { describe, it, expect, vi } from "vitest";
import { mapFamilyClusters } from "./clusterSchedules";
import { compareSchedules } from "./compareSchedules";
import type { ScheduleInfo } from "../../types";

vi.mock("./compareSchedules");

// Mock `compareSchedules`
vi.mock("./compareSchedules", () => ({
  compareSchedules: vi.fn((a, b) => {
    // Default similarity result to prevent null/undefined issues
    return { assignmentSimilarity: 0.2, cohortSimilarity: 0.2 };
  }),
}));

// Helper to create test ScheduleInfo objects
function createTestScheduleInfo(
  id: string,
  studentIds: string[]
): ScheduleInfo {
  return {
    id,
    schedule: studentIds.map((student) => ({ student, activity: "test" })),
    score: 10,
    alg: "test",
    invalid: null,
    generation: 0,
  };
}

describe("mapFamilyClusters", () => {
  it("should initialize with the first schedule if no clusters exist", () => {
    const schedules: ScheduleInfo[] = [
      createTestScheduleInfo("schedule1", ["alice", "bob"]),
    ];
    const threshold = 5;

    const result = mapFamilyClusters(threshold, schedules);

    expect(result.size).toBe(1);
    expect(result.has(schedules[0].id)).toBe(true);
    expect(result.get(schedules[0].id)).toEqual(new Set([schedules[0].id]));
  });

  it("should add schedules to the best matching family cluster", () => {
    const schedules: ScheduleInfo[] = [
      createTestScheduleInfo("schedule1", ["alice", "bob"]),
      createTestScheduleInfo("schedule2", ["charlie", "dave"]),
    ];
    const threshold = 5;

    vi.mocked(compareSchedules).mockImplementation((a, b) => {
      // schedule2 is similar to schedule1 (above threshold)
      return { assignmentSimilarity: 3, cohortSimilarity: 3 };
    });

    const result = mapFamilyClusters(threshold, schedules);

    expect(result.size).toBe(1);
    expect(result.has(schedules[0].id)).toBe(true);
    expect(result.get(schedules[0].id)).toEqual(
      new Set([schedules[0].id, schedules[1].id])
    );
  });

  it("should create a new cluster if no suitable cluster exists", () => {
    const schedules: ScheduleInfo[] = [
      createTestScheduleInfo("schedule1", ["alice", "bob"]),
      createTestScheduleInfo("schedule2", ["charlie", "dave"]),
    ];
    const threshold = 10; // High threshold - similarity below won't match

    vi.mocked(compareSchedules).mockImplementation((a, b) => {
      // Similarity is 6, below threshold of 10
      return { assignmentSimilarity: 3, cohortSimilarity: 3 };
    });

    const result = mapFamilyClusters(threshold, schedules);

    expect(result.size).toBe(2);
    expect(result.has(schedules[0].id)).toBe(true);
    expect(result.has(schedules[1].id)).toBe(true);
    expect(result.get(schedules[0].id)).toEqual(new Set([schedules[0].id]));
    expect(result.get(schedules[1].id)).toEqual(new Set([schedules[1].id]));
  });

  it("should add schedule to existing cluster if similarity is above threshold", () => {
    const schedules: ScheduleInfo[] = [
      createTestScheduleInfo("schedule1", ["alice", "bob"]),
      createTestScheduleInfo("schedule2", ["charlie", "dave"]),
    ];
    const threshold = 5;
    const existingClusters = new Map<string, Set<string>>([
      [schedules[0].id, new Set([schedules[0].id])],
    ]);

    vi.mocked(compareSchedules).mockImplementation((a, b) => {
      // schedule2 is similar to schedule1 (above threshold)
      return { assignmentSimilarity: 3, cohortSimilarity: 3 };
    });

    const result = mapFamilyClusters(threshold, schedules, existingClusters);

    expect(result.size).toBe(1);
    expect(result.has(schedules[0].id)).toBe(true);
    expect(result.get(schedules[0].id)).toEqual(
      new Set([schedules[0].id, schedules[1].id])
    );
  });
});
