import { describe, it, expect, vi } from "vitest";
import { mapFamilyClusters } from "./clusterSchedules";
import { compareSchedules } from "./compareSchedules";
import type { Schedule } from "../../types";

vi.mock("./compareSchedules");

// Mock `compareSchedules`
vi.mock("./compareSchedules", () => ({
  compareSchedules: vi.fn((a, b) => {
    // Default similarity result to prevent null/undefined issues
    return { assignmentSimilarity: 0.2, cohortSimilarity: 0.2 };
  }),
}));

describe("mapFamilyClusters", () => {
  it("should initialize with the first schedule if no clusters exist", () => {
    const schedules: Schedule[] = [{ id: 1, activity: 1 }];
    const threshold = 5;

    const result = mapFamilyClusters(threshold, schedules);

    expect(result.size).toBe(1);
    expect(result.has(schedules[0])).toBe(true);
    expect(result.get(schedules[0])).toEqual(new Set([schedules[0]]));
  });

  it("should add schedules to the best matching family cluster", () => {
    const schedules: Schedule[] = [{ id: 1 }, { id: 2 }];
    const threshold = 5;

    (compareSchedules as jest.Mock).mockImplementation((a, b) => {
      if (a.id === 1 && b.id === 1) {
        return { assignmentSimilarity: 3, cohortSimilarity: 3 };
      }
      if (a.id === 2 && b.id === 1) {
        return { assignmentSimilarity: 3, cohortSimilarity: 3 };
      }
      return { assignmentSimilarity: 0, cohortSimilarity: 0 };
    });

    const result = mapFamilyClusters(threshold, schedules);

    expect(result.size).toBe(1);
    expect(result.has(schedules[0])).toBe(true);
    console.log("This is a set, right?", result.get(schedules[0]));
    expect(result.get(schedules[0])).toEqual(
      new Set([schedules[0], schedules[1]])
    );
  });

  it("should create a new cluster if no suitable cluster exists", () => {
    const schedules: Schedule[] = [{ id: 1 }, { id: 2 }];
    const threshold = 10;

    (compareSchedules as jest.Mock).mockImplementation((a, b) => {
      return { assignmentSimilarity: 3, cohortSimilarity: 3 };
    });

    const result = mapFamilyClusters(threshold, schedules);

    expect(result.size).toBe(2);
    expect(result.has(schedules[0])).toBe(true);
    expect(result.has(schedules[1])).toBe(true);
    expect(result.get(schedules[0])).toEqual(new Set([schedules[0]]));
    expect(result.get(schedules[1])).toEqual(new Set([schedules[1]]));
  });

  it("should add schedule to existing cluster if similarity is above threshold", () => {
    const schedules: Schedule[] = [{ id: 1 }, { id: 2 }];
    const threshold = 5;
    const existingClusters = new Map<Schedule, Set<Schedule>>([
      [schedules[0], new Set([schedules[0]])],
    ]);

    (compareSchedules as jest.Mock).mockImplementation((a, b) => {
      if (a.id === 2 && b.id === 1) {
        return { assignmentSimilarity: 3, cohortSimilarity: 3 };
      }
      return { assignmentSimilarity: 0, cohortSimilarity: 0 };
    });

    const result = mapFamilyClusters(threshold, schedules, existingClusters);

    expect(result.size).toBe(1);
    expect(result.has(schedules[0])).toBe(true);
    expect(result.get(schedules[0])).toEqual(
      new Set([schedules[0], schedules[1]])
    );
  });
});
