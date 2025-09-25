import { describe, expect, test } from "vitest";

import {
  scoreSchedule,
  validateSchedule,
} from "../src/scheduler/scoring/scoreSchedule";
import { assignByPeer } from "../src/scheduler/heuristics/peerFirstHeuristic";
import { assignMutualPeersFirst } from "../src/scheduler/heuristics/mutualPeerFirstHeuristic";
import { assignFindAFriend } from "../src/scheduler/heuristics/findAFriendHeuristic";
import type {
  Activity,
  StudentPreferences,
  ScoringOptions,
} from "../src/types";
import { DEFAULT_SCORING_OPTIONS } from "../src/types";

const activities: Activity[] = [
  { activity: "Archery", capacity: 3 },
  { activity: "Climbing", capacity: 3 },
];

const prefs: StudentPreferences[] = [
  {
    identifier: "Alice",
    activity: [
      { activity: "Archery", weight: 10 },
      { activity: "Climbing", weight: 4 },
    ],
    peer: [
      { peer: "Bob", weight: 10 },
      { peer: "Charlie", weight: 5 },
    ],
  },
  {
    identifier: "Bob",
    activity: [
      { activity: "Archery", weight: 8 },
      { activity: "Climbing", weight: 6 },
    ],
    peer: [
      { peer: "Alice", weight: 10 },
      { peer: "Dana", weight: 4 },
    ],
  },
  {
    identifier: "Charlie",
    activity: [
      { activity: "Climbing", weight: 9 },
      { activity: "Archery", weight: 2 },
    ],
    peer: [
      { peer: "Dana", weight: 8 },
      { peer: "Alice", weight: 3 },
    ],
  },
  {
    identifier: "Dana",
    activity: [
      { activity: "Climbing", weight: 9 },
      { activity: "Archery", weight: 1 },
    ],
    peer: [
      { peer: "Charlie", weight: 9 },
      { peer: "Bob", weight: 4 },
    ],
  },
];

const scoring: ScoringOptions = {
  mutualPeerMultiplier: 1,
  nonMutualPeerMultiplier: 0.5,
  noPeerPenalty: 10,
  noActivityPenalty: 5,
};

describe("heuristic seeding", () => {
  const baseline = scoreSchedule(assignByPeer(prefs, activities), prefs, scoring);

  const runHeuristic = (name: string, fn: typeof assignMutualPeersFirst) => {
    const schedule = fn(prefs, activities);
    const validation = validateSchedule(schedule, activities);
    expect(validation, `${name} produced invalid schedule`).toBeNull();
    const score = scoreSchedule(schedule, prefs, scoring);
    expect(score, `${name} score should beat baseline`).toBeGreaterThanOrEqual(
      baseline
    );
  };

  test("mutual peer first does not regress", () => {
    runHeuristic("Mutual Peer First", assignMutualPeersFirst);
  });

  test("find a friend does not regress", () => {
    runHeuristic("Find a Friend", assignFindAFriend);
  });
});
