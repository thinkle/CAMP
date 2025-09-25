import { describe, test } from "vitest";
import {
  activityOnlyScenario,
  peerOnlyScenario,
  mixedScenario,
  mutualClusterScenario,
  forbiddenPairingsScenario,
} from "../testing/scenarios";
import type { BenchmarkScenario } from "../testing/scenarios";
import { scoreSchedule, validateSchedule } from "../scheduler/scoring/scoreSchedule";
import { assignByActivity } from "../scheduler/heuristics/activityFirstHeuristic";
import { assignByPeer } from "../scheduler/heuristics/peerFirstHeuristic";
import { assignMutualPeersFirst } from "../scheduler/heuristics/mutualPeerFirstHeuristic";
import { assignFindAFriend } from "../scheduler/heuristics/findAFriendHeuristic";
import { assignByPriority } from "../scheduler/heuristics/assignByPriority";
import { assignByMostConstrained } from "../scheduler/heuristics/mostConstrainedHeuristic";
import { assignByCohorts } from "../scheduler/heuristics/assignByCohorts";
import { assignAvoidForbidden } from "../scheduler/heuristics/forbiddenAwareHeuristic";
import { assignPenaltyFirst } from "../scheduler/heuristics/penaltyFirstHeuristic";
import { improveSchedule } from "../scheduler/hillclimbing/improveSchedule";
import type {
  Activity,
  Schedule,
  StudentPreferences,
  ScoringOptions,
} from "../types";

const SCENARIOS: BenchmarkScenario[] = [
  activityOnlyScenario(),
  peerOnlyScenario(),
  mixedScenario(),
  mutualClusterScenario(),
  forbiddenPairingsScenario(),
];

const heuristics: Record<
  string,
  (prefs: StudentPreferences[], activities: Activity[]) => Schedule
> = {
  "Most Constrained": assignByMostConstrained,
  "Activity First": assignByActivity,
  "Peer First": assignByPeer,
  "Mutual Peer First": assignMutualPeersFirst,
  "Find a Friend": assignFindAFriend,
  "Avoid Forbidden": assignAvoidForbidden,
  "Penalty First": assignPenaltyFirst,
  Priority: assignByPriority,
  "Cohort Min Size": (prefs, activities) =>
    assignByCohorts(
      prefs,
      activities,
      Math.min(...activities.map((a) => a.capacity))
    ),
};

type Metrics = {
  score: number;
  zeroPeers: number;
  zeroActivities: number;
  forbiddenPairs: number;
};

const evaluate = (
  schedule: Schedule,
  prefs: StudentPreferences[],
  activities: Activity[],
  scoringOptions
): Metrics => {
  const score = scoreSchedule(schedule, prefs, scoringOptions);
  const assignments = new Map(schedule.map((a) => [a.student, a.activity]));
  const roster = new Map<string, Set<string>>();
  for (const { student, activity } of schedule) {
    if (!roster.has(activity)) {
      roster.set(activity, new Set());
    }
    roster.get(activity)!.add(student);
  }

  let zeroPeers = 0;
  let zeroActivities = 0;
  let forbiddenPairs = 0;
  const prefLookup = new Map(prefs.map((pref) => [pref.identifier, pref]));
  const seenForbidden = new Set<string>();
  for (const pref of prefs) {
    const activity = assignments.get(pref.identifier);
    if (!activity) {
      zeroPeers += 1;
      zeroActivities += 1;
      continue;
    }
    const rosterSet = roster.get(activity) ?? new Set();
    const peerMatches = pref.peer.filter((p) => rosterSet.has(p.peer)).length;
    if (peerMatches === 0 && scoringOptions.noPeerPenalty > 0) {
      zeroPeers += 1;
    }
    const activityMatch = pref.activity.some((a) => a.activity === activity);
    if (!activityMatch && scoringOptions.noActivityPenalty > 0) {
      zeroActivities += 1;
    }

    for (const peerPref of pref.peer) {
      if (peerPref.weight >= 0) {
        continue;
      }
      const peerActivity = assignments.get(peerPref.peer);
      if (peerActivity !== activity) {
        continue;
      }
      const peer = prefLookup.get(peerPref.peer);
      if (!peer) {
        continue;
      }
      const pairKeyParts = [pref.identifier, peer.identifier].sort();
      const pairKey = `${pairKeyParts[0]}::${pairKeyParts[1]}`;
      if (!seenForbidden.has(pairKey)) {
        seenForbidden.add(pairKey);
        forbiddenPairs += 1;
      }
    }
  }
  return { score, zeroPeers, zeroActivities, forbiddenPairs };
};

const runScenarioVariant = (
  scenario: BenchmarkScenario,
  variantName: string,
  scoringOptions: ScoringOptions
) => {
  const rows: Record<string, Metrics> = {};
  for (const [name, heuristic] of Object.entries(heuristics)) {
    try {
      const schedule = heuristic(scenario.studentPreferences, scenario.activities);
      const validation = validateSchedule(schedule, scenario.activities);
      if (validation) {
        console.warn(`${scenario.name} [${variantName}]/${name} invalid: ${validation}`);
        rows[name] = { score: Number.NEGATIVE_INFINITY, zeroPeers: NaN, zeroActivities: NaN };
        continue;
      }
      const improved = improveSchedule(
        schedule,
        scenario.studentPreferences,
        scenario.activities,
        5,
        scoringOptions
      );
      rows[name] = evaluate(
        improved,
        scenario.studentPreferences,
        scenario.activities,
        scoringOptions
      );
    } catch (err) {
      console.error(`${scenario.name} [${variantName}]/${name} threw`, err);
      rows[name] = { score: Number.NEGATIVE_INFINITY, zeroPeers: NaN, zeroActivities: NaN };
    }
  }
  console.log(`\nScenario: ${scenario.name} [${variantName}]`);
  console.table(
    Object.entries(rows).map(([name, metrics]) => ({ name, ...metrics }))
  );
};

describe("heuristic benchmarks", () => {
  for (const scenario of SCENARIOS) {
    test(
      scenario.name,
      { timeout: 20000 },
      () => {
        const variants = scenario.scoringVariants ?? [
          { name: "Default", scoring: scenario.scoring },
        ];
        for (const variant of variants) {
          runScenarioVariant(scenario, variant.name, variant.scoring);
        }
      }
    );
  }
});
