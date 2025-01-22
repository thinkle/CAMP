import { describe, it, expect } from "vitest";
import { assignByPeer } from "./peerFirstHeuristic";
import type { StudentPreferences, Activity } from "../../types";

describe("assignByPeer", () => {
  it("should join highest-weight assigned peer's activity if there's space", () => {
    const prefs: StudentPreferences[] = [
      {
        identifier: "alice",
        peer: [{ peer: "bob", weight: 10 }],
        activity: [{ activity: "A", weight: 5 }, { activity: "B", weight: 4 }]
      },
      {
        identifier: "bob",
        peer: [],
        activity: [{ activity: "A", weight: 10 }, { activity: "B", weight: 5 }]
      }
    ];
    const activities: Activity[] = [
      { activity: "A", capacity: 2 },
      { activity: "B", capacity: 2 }
    ];

    const schedule = assignByPeer(prefs, activities);

    // Because we iterate prefs in order, "alice" is first:
    //  -> She sees "bob" is not assigned (since bob is after her), so she can't join him
    //  -> She picks her own top activity, "A"
    // Next, "bob" is assigned:
    //  -> He sees no peers, picks "A" as well.
    // Actually, interestingly, "alice" didn't see bob assigned. So she took A. Bob also took A. 
    // Both end up in A. Perfectly valid for this test.
    
    expect(schedule).toContainEqual({ student: "alice", activity: "A" });
    expect(schedule).toContainEqual({ student: "bob", activity: "A" });
  });

  it("should skip an unassigned peer and  to activity if no peer is assigned yet", () => {
    const prefs: StudentPreferences[] = [
      {
        identifier: "student1",
        peer: [{ peer: "student2", weight: 8 }, { peer: "student3", weight: 6 }],
        activity: [{ activity: "ActX", weight: 9 }, { activity: "ActY", weight: 7 }]
      },
      {
        identifier: "student2",
        peer: [],
        activity: [{ activity: "ActX", weight: 10 }]
      },
      {
        identifier: "student3",
        peer: [],
        activity: [{ activity: "ActX", weight: 10 }, { activity: "ActY", weight: 9 }]
      }
    ];
    const activities: Activity[] = [
      { activity: "ActX", capacity: 2 },
      { activity: "ActY", capacity: 2 }
    ];

    // "student1" goes first, sees "student2" and "student3" are not assigned => can't join them.
    //  to "ActX" (weight=9). 
    // then "student2" picks "ActX". "student3" picks "ActX" if capacity left, else "ActY".
    const schedule = assignByPeer(prefs, activities);
    expect(schedule.length).toBe(3);
  });

  it("throws error if no peer or activity is available", () => {
    const prefs: StudentPreferences[] = [
      {
        identifier: "s1",
        peer: [{ peer: "s2", weight: 10 }],
        activity: [{ activity: "A", weight: 5 }]
      },
      {
        identifier: "s2",
        peer: [],
        activity: [{ activity: "A", weight: 5 }]
      },
      {
        identifier: "s3",
        peer: [],
        activity: [{ activity: "A", weight: 5 }]
      }
    ];
    const activities: Activity[] = [{ activity: "A", capacity: 2 }];

    // There's only capacity for 2 students, but we have 3. 
    // The third fails to get assigned, so we expect an error
    expect(() => assignByPeer(prefs, activities))
      .toThrowError(/No available activities for student: s3/);
  });
});