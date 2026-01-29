import { describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { Activity, Schedule, StudentPreferences, ScoringOptions } from "../types";
import { DEFAULT_SCORING_OPTIONS } from "../types";
import { scoreSchedule, validateSchedule } from "../scheduler/scoring/scoreSchedule";
import {
  improveSchedule,
  improveScheduleLegacy,
  improveLeastHappyWithSwaps,
  improveByMovingCohorts,
  mutateSchedule,
} from "../scheduler/hillclimbing/improveSchedule";
import { healMinimumSize } from "../scheduler/utils/healMinimumSize";
import { repairSchedule } from "../scheduler/hillclimbing/repairSchedule";
import { withPrunedActivities } from "../scheduler/heuristics/pruneThenHeuristic";
import { assignByActivity } from "../scheduler/heuristics/activityFirstHeuristic";
import { assignByMostConstrained } from "../scheduler/heuristics/mostConstrainedHeuristic";
import { assignByPriority } from "../scheduler/heuristics/assignByPriority";
import { assignByPeer } from "../scheduler/heuristics/peerFirstHeuristic";
import {
  mixedScenario,
  mutualClusterScenario,
  activityOnlyScenario,
} from "../testing/scenarios";

type PreferenceData = {
  activities: Activity[];
  studentPreferences: StudentPreferences[];
  scoringOptions?: ScoringOptions;
  name?: string;
};

const normalizePreferences = (
  prefs: StudentPreferences[],
  activities: Activity[]
): StudentPreferences[] => {
  const activitySet = new Set(activities.map((a) => a.activity));
  const studentIds = new Set(prefs.map((p) => p.identifier));

  return prefs.map((pref) => {
    const activity = pref.activity
      .filter(
        (a) =>
          Boolean(a.activity) &&
          a.activity !== "#N/A" &&
          activitySet.has(a.activity)
      )
      .map((a) => ({ activity: a.activity, weight: a.weight }));
    const peer = pref.peer
      .filter((p) => Boolean(p.peer) && studentIds.has(p.peer))
      .map((p) => ({ peer: p.peer, weight: p.weight }));

    return {
      identifier: pref.identifier,
      activity,
      peer,
    };
  });
};

const loadDataDump = async (): Promise<PreferenceData | null> => {
  const dumpPath = path.resolve(process.cwd(), "data-dump.js");
  if (!fs.existsSync(dumpPath)) {
    return null;
  }
  const mod = await import(pathToFileURL(dumpPath).href);
  const data = mod?.default ?? mod?.data;
  return data ?? null;
};

type SeedSchedule = {
  name: string;
  schedule: Schedule;
  score: number;
};

const buildSeeds = (
  prefs: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions
): SeedSchedule[] => {
  const heuristics = [
    { name: "Activity First", fn: assignByActivity },
    { name: "Peer First", fn: assignByPeer },
    { name: "Priority", fn: assignByPriority },
    { name: "Most Constrained", fn: assignByMostConstrained },
    {
      name: "Prune Then Activity First",
      fn: withPrunedActivities(assignByActivity),
    },
    {
      name: "Prune Then Priority",
      fn: withPrunedActivities(assignByPriority),
    },
    {
      name: "Prune Then Most Constrained",
      fn: withPrunedActivities(assignByMostConstrained),
    },
  ];

  const seeds: SeedSchedule[] = [];
  for (const heuristic of heuristics) {
    try {
      let schedule = heuristic.fn(prefs, activities);
      if (validateSchedule(schedule, activities)) {
        schedule = repairSchedule(schedule, prefs, activities);
      }
      const healed = healMinimumSize(schedule, prefs, activities);
      if (healed) {
        schedule = healed;
      }
      const invalid = validateSchedule(schedule, activities);
      if (invalid) {
        console.warn(`${heuristic.name} invalid: ${invalid}`);
        continue;
      }
      seeds.push({
        name: heuristic.name,
        schedule,
        score: scoreSchedule(schedule, prefs, scoringOptions),
      });
    } catch (err) {
      console.warn(`${heuristic.name} failed`, err);
    }
  }
  return seeds;
};

const MAX_IMPROVE_ITERS = 10;

const runLoopStrategy = (
  schedule: Schedule,
  prefs: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions,
  step: (schedule: Schedule) => Schedule
) => {
  let current = schedule;
  let currentScore = scoreSchedule(current, prefs, scoringOptions);
  let iterations = 0;
  while (iterations < MAX_IMPROVE_ITERS) {
    const candidate = step(current);
    const invalid = validateSchedule(candidate, activities);
    if (invalid) {
      break;
    }
    const candidateScore = scoreSchedule(candidate, prefs, scoringOptions);
    if (candidateScore <= currentScore) {
      break;
    }
    current = candidate;
    currentScore = candidateScore;
    iterations += 1;
  }
  return { schedule: current, score: currentScore, iterations };
};

type StrategyResult = {
  score: number;
  delta: number;
  improved: boolean;
  invalid: string | null;
};

const runStrategies = (
  seeds: SeedSchedule[],
  prefs: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions
) => {
  const strategies = [
    {
      name: "Legacy",
      fn: (schedule: Schedule) =>
        improveScheduleLegacy(
          schedule,
          prefs,
          activities,
          MAX_IMPROVE_ITERS,
          scoringOptions
        ),
    },
    {
      name: "Best-of",
      fn: (schedule: Schedule) =>
        improveSchedule(
          schedule,
          prefs,
          activities,
          MAX_IMPROVE_ITERS,
          scoringOptions
        ),
    },
    {
      name: "Least Happy",
      fn: (schedule: Schedule) =>
        runLoopStrategy(
          schedule,
          prefs,
          activities,
          scoringOptions,
          (s) =>
            improveLeastHappyWithSwaps(
              s,
              prefs,
              activities,
              scoringOptions
            ).schedule
        ).schedule,
    },
    {
      name: "Cohort",
      fn: (schedule: Schedule) =>
        runLoopStrategy(
          schedule,
          prefs,
          activities,
          scoringOptions,
          (s) =>
            improveByMovingCohorts(
              s,
              prefs,
              activities,
              scoringOptions
            ).schedule
        ).schedule,
    },
    {
      name: "Mutate + Least Happy",
      fn: (schedule: Schedule) =>
        runLoopStrategy(
          schedule,
          prefs,
          activities,
          scoringOptions,
          (s) =>
            improveLeastHappyWithSwaps(
              mutateSchedule(s, prefs, activities),
              prefs,
              activities,
              scoringOptions
            ).schedule
        ).schedule,
    },
    {
      name: "Mutate + Cohort",
      fn: (schedule: Schedule) =>
        runLoopStrategy(
          schedule,
          prefs,
          activities,
          scoringOptions,
          (s) =>
            improveByMovingCohorts(
              mutateSchedule(s, prefs, activities),
              prefs,
              activities,
              scoringOptions
            ).schedule
        ).schedule,
    },
  ];

  const summaryRows = strategies.map((strategy) => {
    let improvedCount = 0;
    let invalidCount = 0;
    let totalDelta = 0;
    let totalScore = 0;
    let bestDelta = Number.NEGATIVE_INFINITY;

    for (const seed of seeds) {
      const improvedSchedule = strategy.fn(seed.schedule);
      const invalid = validateSchedule(improvedSchedule, activities);
      let improvedScore = Number.NEGATIVE_INFINITY;
      if (!invalid) {
        improvedScore = scoreSchedule(improvedSchedule, prefs, scoringOptions);
      } else {
        invalidCount += 1;
      }
      const delta = improvedScore - seed.score;
      if (delta > 0) {
        improvedCount += 1;
      }
      totalDelta += delta;
      totalScore += improvedScore;
      bestDelta = Math.max(bestDelta, delta);
    }

    const avgDelta = totalDelta / seeds.length;
    const avgScore = totalScore / seeds.length;
    return {
      name: strategy.name,
      avgDelta,
      bestDelta,
      avgScore,
      improved: improvedCount,
      invalid: invalidCount,
    };
  });

  console.log("\nImprove strategy summary");
  console.table(summaryRows);
};

const runHarness = async () => {
  const dump = await loadDataDump();
  if (dump) {
    const scoringOptions = dump.scoringOptions ?? DEFAULT_SCORING_OPTIONS;
    const prefs = normalizePreferences(
      dump.studentPreferences,
      dump.activities
    );
    const seeds = buildSeeds(
      prefs,
      dump.activities,
      scoringOptions
    );
    console.log(`Loaded data dump (${dump.studentPreferences.length} students).`);
    runStrategies(seeds, prefs, dump.activities, scoringOptions);
    return;
  }

  const scenarios = [
    activityOnlyScenario(),
    mixedScenario(),
    mutualClusterScenario(),
  ];
  for (const scenario of scenarios) {
    const scoringOptions = scenario.scoring ?? DEFAULT_SCORING_OPTIONS;
    const prefs = normalizePreferences(
      scenario.studentPreferences,
      scenario.activities
    );
    const seeds = buildSeeds(
      prefs,
      scenario.activities,
      scoringOptions
    );
    console.log(`\nScenario: ${scenario.name}`);
    runStrategies(seeds, prefs, scenario.activities, scoringOptions);
  }
};

describe("improve strategy harness", () => {
  test(
    "report",
    { timeout: 20000 },
    async () => {
      await runHarness();
    }
  );
});
