import { describe, test, expect } from "vitest";
import { scheduleToId } from "./scheduleSaver";
import type { Schedule, Activity } from "../../types";

describe("Peer-only mode canonical schedule IDs", () => {
  test("should generate same ID for permutations of assignments to equal-capacity activities", () => {
    const activities: Activity[] = [
      { activity: "Cabin A", capacity: 10 },
      { activity: "Cabin B", capacity: 10 },
      { activity: "Cabin C", capacity: 10 },
    ];

    // Schedule 1: Group1 → A, Group2 → B, Group3 → C
    const schedule1: Schedule = [
      { student: "Alice", activity: "Cabin A" },
      { student: "Bob", activity: "Cabin A" },
      { student: "Charlie", activity: "Cabin B" },
      { student: "Dave", activity: "Cabin B" },
      { student: "Eve", activity: "Cabin C" },
      { student: "Frank", activity: "Cabin C" },
    ];

    // Schedule 2: Same groups but different cabin assignments (permutation)
    // Group1 → C, Group2 → A, Group3 → B
    const schedule2: Schedule = [
      { student: "Alice", activity: "Cabin C" },
      { student: "Bob", activity: "Cabin C" },
      { student: "Charlie", activity: "Cabin A" },
      { student: "Dave", activity: "Cabin A" },
      { student: "Eve", activity: "Cabin B" },
      { student: "Frank", activity: "Cabin B" },
    ];

    const id1 = scheduleToId(schedule1, activities, true);
    const id2 = scheduleToId(schedule2, activities, true);

    expect(id1).toBe(id2);
  });

  test("should generate DIFFERENT IDs for different groupings even in peer-only mode", () => {
    const activities: Activity[] = [
      { activity: "Cabin A", capacity: 10 },
      { activity: "Cabin B", capacity: 10 },
    ];

    // Schedule 1: Alice+Bob in one cabin, Charlie+Dave in another
    const schedule1: Schedule = [
      { student: "Alice", activity: "Cabin A" },
      { student: "Bob", activity: "Cabin A" },
      { student: "Charlie", activity: "Cabin B" },
      { student: "Dave", activity: "Cabin B" },
    ];

    // Schedule 2: Alice+Charlie in one cabin, Bob+Dave in another (DIFFERENT grouping)
    const schedule2: Schedule = [
      { student: "Alice", activity: "Cabin A" },
      { student: "Charlie", activity: "Cabin A" },
      { student: "Bob", activity: "Cabin B" },
      { student: "Dave", activity: "Cabin B" },
    ];

    const id1 = scheduleToId(schedule1, activities, true);
    const id2 = scheduleToId(schedule2, activities, true);

    expect(id1).not.toBe(id2);
  });

  test("should generate DIFFERENT IDs when activities have different capacities", () => {
    const activities: Activity[] = [
      { activity: "Small Cabin", capacity: 5 },
      { activity: "Large Cabin", capacity: 10 },
    ];

    // Schedule 1: Group1 (Alice+Bob) in small, Group2 (Charlie+Dave) in large
    const schedule1: Schedule = [
      { student: "Alice", activity: "Small Cabin" },
      { student: "Bob", activity: "Small Cabin" },
      { student: "Charlie", activity: "Large Cabin" },
      { student: "Dave", activity: "Large Cabin" },
    ];

    // Schedule 2: SWAP - Group1 in large, Group2 in small
    const schedule2: Schedule = [
      { student: "Alice", activity: "Large Cabin" },
      { student: "Bob", activity: "Large Cabin" },
      { student: "Charlie", activity: "Small Cabin" },
      { student: "Dave", activity: "Small Cabin" },
    ];

    const id1 = scheduleToId(schedule1, activities, true);
    const id2 = scheduleToId(schedule2, activities, true);

    // These SHOULD be different because capacity matters
    expect(id1).not.toBe(id2);
  });

  test("should generate same ID for permutations within same capacity tier", () => {
    const activities: Activity[] = [
      { activity: "Small 1", capacity: 5 },
      { activity: "Small 2", capacity: 5 },
      { activity: "Large 1", capacity: 10 },
      { activity: "Large 2", capacity: 10 },
    ];

    // Schedule 1
    const schedule1: Schedule = [
      { student: "Alice", activity: "Small 1" },
      { student: "Bob", activity: "Small 1" },
      { student: "Charlie", activity: "Small 2" },
      { student: "Dave", activity: "Small 2" },
      { student: "Eve", activity: "Large 1" },
      { student: "Frank", activity: "Large 1" },
      { student: "Grace", activity: "Large 2" },
      { student: "Henry", activity: "Large 2" },
    ];

    // Schedule 2: Swap within each capacity tier
    const schedule2: Schedule = [
      { student: "Alice", activity: "Small 2" },  // Swapped small cabins
      { student: "Bob", activity: "Small 2" },
      { student: "Charlie", activity: "Small 1" },
      { student: "Dave", activity: "Small 1" },
      { student: "Eve", activity: "Large 2" },    // Swapped large cabins
      { student: "Frank", activity: "Large 2" },
      { student: "Grace", activity: "Large 1" },
      { student: "Henry", activity: "Large 1" },
    ];

    const id1 = scheduleToId(schedule1, activities, true);
    const id2 = scheduleToId(schedule2, activities, true);

    expect(id1).toBe(id2);
  });

  test("should NOT canonicalize when isPeerOnlyMode is false", () => {
    const activities: Activity[] = [
      { activity: "Archery", capacity: 10 },
      { activity: "Swimming", capacity: 10 },
    ];

    // In activities mode, these are DIFFERENT schedules
    const schedule1: Schedule = [
      { student: "Alice", activity: "Archery" },
      { student: "Bob", activity: "Swimming" },
    ];

    const schedule2: Schedule = [
      { student: "Alice", activity: "Swimming" },
      { student: "Bob", activity: "Archery" },
    ];

    const id1 = scheduleToId(schedule1, activities, false);
    const id2 = scheduleToId(schedule2, activities, false);

    // These should be DIFFERENT in activities mode
    expect(id1).not.toBe(id2);
  });
});
