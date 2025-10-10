import { describe, expect, test } from "vitest";
import { Activity, StudentPreferences } from "../../types";
import {
  CapacityError,
  DuplicateError,
  MinimumSizeError,
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

  test("Schedule below minimum size should return MinimumSizeError", () => {
    const activitiesWithMin: Activity[] = [
      { activity: "Activity 1", capacity: 10, minSize: 3 },
      { activity: "Activity 2", capacity: 10, minSize: 2 },
    ];
    const underMinSchedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      // Only 2 students in Activity 1, but minimum is 3
      { activity: "Activity 2", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];
    expect(validateSchedule(underMinSchedule, activitiesWithMin)).toBe(
      MinimumSizeError
    );
  });

  test("Empty activity should not trigger minimum size error", () => {
    const activitiesWithMin: Activity[] = [
      { activity: "Activity 1", capacity: 10, minSize: 3 },
      { activity: "Activity 2", capacity: 10, minSize: 2 },
    ];
    const emptyActivitySchedule = [
      // Activity 1 is empty - should be fine
      { activity: "Activity 2", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];
    expect(validateSchedule(emptyActivitySchedule, activitiesWithMin)).toBe(
      null
    );
  });

  test("Schedule meeting minimum size should be valid", () => {
    const activitiesWithMin: Activity[] = [
      { activity: "Activity 1", capacity: 10, minSize: 3 },
      { activity: "Activity 2", capacity: 10, minSize: 2 },
    ];
    const validMinSchedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      { activity: "Activity 1", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
      { activity: "Activity 2", student: "Student 5" },
    ];
    expect(validateSchedule(validMinSchedule, activitiesWithMin)).toBe(null);
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

  test("Low score threshold penalty applied correctly", () => {
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      { activity: "Activity 2", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];
    // Student 1 gets 50 points (top friend) - above threshold, no penalty
    // Student 2 gets 5 points (other peer) - below threshold of 25, penalty of 100
    // Student 3 gets 50 points (top friend) - above threshold, no penalty
    // Student 4 gets 5 points (other peer) - below threshold of 25, penalty of 100
    // Total = 50 + 5 + 50 + 5 - 100 - 100 = -90
    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student 1",
        activity: [],
        peer: [{ peer: "Student 2", weight: 50 }], // Top friend
      },
      {
        identifier: "Student 2",
        activity: [],
        peer: [{ peer: "Student 1", weight: 5 }], // Other peer
      },
      {
        identifier: "Student 3",
        activity: [],
        peer: [{ peer: "Student 4", weight: 50 }], // Top friend
      },
      {
        identifier: "Student 4",
        activity: [],
        peer: [{ peer: "Student 3", weight: 5 }], // Other peer
      },
    ];
    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 0,
      noActivityPenalty: 0,
      lowScoreThreshold: 25,
      lowScorePenalty: 100,
    };
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      -90
    );
  });

  test("Low score threshold not applied when threshold is 0", () => {
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
    ];
    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student 1",
        activity: [],
        peer: [{ peer: "Student 2", weight: 5 }],
      },
      {
        identifier: "Student 2",
        activity: [],
        peer: [{ peer: "Student 1", weight: 5 }],
      },
    ];
    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 0,
      noActivityPenalty: 0,
      lowScoreThreshold: 0, // Disabled
      lowScorePenalty: 100,
    };
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      10
    );
  });

  test("Complex edge case: Activity+Peer mode with multiple penalties", () => {
    // This test documents the EXACT order of operations and interactions
    // between different scoring components.
    //
    // SCORING ORDER:
    // 1. Individual scores calculated: activity weight + peer weights (with multipliers)
    // 2. noPeerPenalty applied if peerMatches === 0 (based on COUNT, not score)
    // 3. noActivityPenalty applied if no activity match (based on MATCH, not score)
    // 4. lowScorePenalty applied if individualScore < threshold (based on SCORE)
    //
    // IMPORTANT: lowScoreThreshold uses the RAW individual score
    // (activity + peer weights), NOT affected by noPeerPenalty or noActivityPenalty
    //
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 2", student: "Student 2" },
      { activity: "Activity 1", student: "Student 3" },
      { activity: "Activity 2", student: "Student 4" },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        // Student 1: Gets top activity (100) + top friend (50) = 150 individual
        // 150 > 40 threshold ✓ No lowScorePenalty
        // Has activity match ✓ No noActivityPenalty
        // Has peer match ✓ No noPeerPenalty
        // Contribution: +150 to score
        identifier: "Student 1",
        activity: [{ activity: "Activity 1", weight: 100 }],
        peer: [{ peer: "Student 3", weight: 50 }],
      },
      {
        // Student 2: Gets acceptable activity (10) + no peers = 10 individual
        // 10 < 40 threshold ✗ Triggers lowScorePenalty (-200)
        // Has activity match ✓ No noActivityPenalty
        // Has NO peer matches ✗ Triggers noPeerPenalty (-100)
        // Contribution: +10 to score, +300 to penalties
        identifier: "Student 2",
        activity: [{ activity: "Activity 2", weight: 10 }],
        peer: [{ peer: "Student 1", weight: 50 }], // Not in same activity
      },
      {
        // Student 3: Gets no activity match + one peer (50) = 50 individual
        // 50 > 40 threshold ✓ No lowScorePenalty
        // No activity match ✗ Triggers noActivityPenalty (-150)
        // Has peer match ✓ No noPeerPenalty
        // Contribution: +50 to score, +150 to penalties
        identifier: "Student 3",
        activity: [{ activity: "Activity 2", weight: 100 }],
        peer: [{ peer: "Student 1", weight: 50 }],
      },
      {
        // Student 4: Gets acceptable activity (5) + no peers = 5 individual
        // 5 < 40 threshold ✗ Triggers lowScorePenalty (-200)
        // Has activity match ✓ No noActivityPenalty
        // Has NO peer matches ✗ Triggers noPeerPenalty (-100)
        // Contribution: +5 to score, +300 to penalties
        identifier: "Student 4",
        activity: [{ activity: "Activity 2", weight: 5 }],
        peer: [], // No peer preferences
      },
    ];

    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 100, // Applied per student with 0 peer matches
      noActivityPenalty: 150, // Applied per student with no activity match
      lowScoreThreshold: 40, // Applied if individual score < 40
      lowScorePenalty: 200, // Applied per student below threshold
    };

    // Total calculation:
    // Activity scores: 100 + 10 + 0 + 5 = 115
    // Peer scores: 50 + 0 + 50 + 0 = 100
    // Total positive: 215
    //
    // Penalties:
    // Student 1: 0 (all good)
    // Student 2: 100 (noPeer) + 200 (lowScore) = 300
    // Student 3: 150 (noActivity) = 150
    // Student 4: 100 (noPeer) + 200 (lowScore) = 300
    // Total penalties: 750
    //
    // Final: 215 - 750 = -535
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      -535
    );
  });

  test("Edge case: Student with 0 activity weight but above threshold due to peers", () => {
    // Documents that lowScoreThreshold uses COMBINED individual score
    // (activity + peers), so strong peer matches can offset no activity match
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        // Student 1: No activity preference (0) + strong peer (60) = 60 individual
        // 60 > 50 threshold ✓ No lowScorePenalty
        // No activity match ✗ Triggers noActivityPenalty (-100)
        // Has peer match ✓ No noPeerPenalty
        identifier: "Student 1",
        activity: [{ activity: "Activity 2", weight: 100 }], // Wrong activity
        peer: [{ peer: "Student 2", weight: 60 }],
      },
      {
        // Student 2: No activity preference (0) + strong peer (60) = 60 individual
        // 60 > 50 threshold ✓ No lowScorePenalty
        // No activity match ✗ Triggers noActivityPenalty (-100)
        // Has peer match ✓ No noPeerPenalty
        identifier: "Student 2",
        activity: [{ activity: "Activity 2", weight: 100 }], // Wrong activity
        peer: [{ peer: "Student 1", weight: 60 }],
      },
    ];

    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 0,
      noActivityPenalty: 100,
      lowScoreThreshold: 50,
      lowScorePenalty: 200,
    };

    // Total calculation:
    // Activity scores: 0
    // Peer scores: 60 + 60 = 120
    // noActivityPenalty: 100 + 100 = 200
    // lowScorePenalty: 0 (both students above threshold due to peers)
    // Final: 120 - 200 = -80
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      -80
    );
  });

  test("Edge case: noPeerPenalty vs lowScorePenalty interaction", () => {
    // Documents that noPeerPenalty is based on COUNT (0 matches)
    // while lowScorePenalty is based on SCORE (below threshold)
    // A student can have peers but still be below threshold if weights are low
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" },
      { activity: "Activity 2", student: "Student 3" },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        // Student 1: Has activity (100) + has peer (5) = 105 individual
        // Has peer match (count > 0) ✓ No noPeerPenalty
        // 105 > 50 threshold ✓ No lowScorePenalty
        identifier: "Student 1",
        activity: [{ activity: "Activity 1", weight: 100 }],
        peer: [{ peer: "Student 2", weight: 5 }],
      },
      {
        // Student 2: Has activity (10) + has peer (5) = 15 individual
        // Has peer match (count > 0) ✓ No noPeerPenalty
        // 15 < 50 threshold ✗ Triggers lowScorePenalty
        identifier: "Student 2",
        activity: [{ activity: "Activity 1", weight: 10 }],
        peer: [{ peer: "Student 1", weight: 5 }],
      },
      {
        // Student 3: Has activity (10) + no peers = 10 individual
        // Has NO peer matches (count = 0) ✗ Triggers noPeerPenalty
        // 10 < 50 threshold ✗ Triggers lowScorePenalty
        identifier: "Student 3",
        activity: [{ activity: "Activity 2", weight: 10 }],
        peer: [{ peer: "Student 1", weight: 50 }], // Not matched
      },
    ];

    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 100, // Only Student 3 (0 peer matches)
      noActivityPenalty: 0,
      lowScoreThreshold: 50, // Students 2 and 3 (score < 50)
      lowScorePenalty: 200,
    };

    // Total calculation:
    // Activity scores: 100 + 10 + 10 = 120
    // Peer scores: 5 + 5 = 10
    // noPeerPenalty: 100 (Student 3 only)
    // lowScorePenalty: 200 + 200 = 400 (Students 2 and 3)
    // Final: 130 - 500 = -370
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      -370
    );
  });

  test("CRITICAL: lowScorePenalty uses RAW score, NOT affected by other penalties", () => {
    // This test confirms that lowScorePenalty is based ONLY on the raw
    // individual score (activity + peer weights), and is NOT affected by
    // noPeerPenalty or noActivityPenalty.
    //
    // This prevents "double penalization" where a student would be penalized
    // for having no activity match AND ALSO for being below the threshold
    // because the noActivityPenalty brought them below.
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" }, // Changed to Activity 1 so Student 2 gets their peer
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        // Student 1: Has activity (60) + has peer (55) = 115 individual
        // Raw score 115 > threshold 50 ✓ NO lowScorePenalty
        // Has peer matches ✓ NO noPeerPenalty
        identifier: "Student 1",
        activity: [{ activity: "Activity 1", weight: 60 }],
        peer: [{ peer: "Student 2", weight: 55 }],
      },
      {
        // Student 2: No activity match (0) + has peer (55) = 55 individual
        // Raw score 55 > threshold 50 ✓ NO lowScorePenalty
        // No activity match ✗ Triggers noActivityPenalty (-150)
        // Has peer match ✓ NO noPeerPenalty
        //
        // IMPORTANT: Even though final contribution would be 55 - 150 = -95,
        // which is below the threshold of 50, the lowScorePenalty is NOT
        // triggered because it uses the RAW score (55), not the penalized score.
        identifier: "Student 2",
        activity: [{ activity: "Activity 2", weight: 100 }], // Wrong activity
        peer: [{ peer: "Student 1", weight: 55 }],
      },
    ];

    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 100,
      noActivityPenalty: 150,
      lowScoreThreshold: 50,
      lowScorePenalty: 200,
    };

    // Total calculation:
    // Activity scores: 60 + 0 = 60
    // Peer scores: 55 + 55 = 110
    // Total positive: 170
    //
    // Penalties (NO DOUBLE PENALIZATION):
    // Student 1: NO penalties (has activity match AND peer matches AND above threshold)
    // Student 2: noActivityPenalty (150) - NO lowScorePenalty because raw 55 > 50
    // Total penalties: 150
    //
    // Final: 170 - 150 = 20
    //
    // If there WAS double penalization, we would see:
    // Student 2: 150 + 200 = 350
    // Total penalties: 350
    // Final: 170 - 350 = -180 (WRONG!)
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      20
    );
  });

  test("Inverse test: lowScorePenalty CAN combine with other penalties when raw score is low", () => {
    // This confirms that when the RAW individual score is actually below
    // the threshold, THEN the lowScorePenalty IS applied in addition to
    // noPeerPenalty or noActivityPenalty.
    const schedule = [
      { activity: "Activity 1", student: "Student 1" },
      { activity: "Activity 1", student: "Student 2" }, // Changed to same activity so they match as peers
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        // Student 1: Has activity (30) + has peer (20) = 50 individual
        // Raw score 50 = threshold 50, right at the boundary
        // Let's use 49 to be clear it's below
        identifier: "Student 1",
        activity: [{ activity: "Activity 1", weight: 29 }],
        peer: [{ peer: "Student 2", weight: 20 }], // Matched
      },
      {
        // Student 2: No activity match (0) + has peer (20) = 20 individual
        // Raw score 20 < threshold 50 ✗ Triggers lowScorePenalty
        // No activity match ✗ Triggers noActivityPenalty
        // Both penalties apply because BOTH conditions are met independently
        identifier: "Student 2",
        activity: [{ activity: "Activity 2", weight: 100 }], // Wrong activity
        peer: [{ peer: "Student 1", weight: 20 }],
      },
    ];

    const scoringOptions = {
      mutualPeerMultiplier: 1,
      nonMutualPeerMultiplier: 1,
      noPeerPenalty: 100,
      noActivityPenalty: 150,
      lowScoreThreshold: 50,
      lowScorePenalty: 200,
    };

    // Total calculation:
    // Activity scores: 29 + 0 = 29
    // Peer scores: 20 + 20 = 40
    // Total positive: 69
    //
    // Penalties:
    // Student 1: lowScorePenalty (200) because raw score 49 < 50
    //   NO noPeerPenalty because they have a peer match
    // Student 2: noActivityPenalty (150) + lowScorePenalty (200) = 350
    //   (both apply because raw score 20 < 50 AND no activity match)
    //   NO noPeerPenalty because they have a peer match
    // Total penalties: 550
    //
    // Final: 69 - 550 = -481
    expect(scoreSchedule(schedule, studentPreferences, scoringOptions)).toBe(
      -481
    );
  });
});
