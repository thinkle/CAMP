import { describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { Activity, Schedule, StudentPreferences, ScoringOptions } from "../types";
import { DEFAULT_SCORING_OPTIONS } from "../types";
import { scoreSchedule, validateSchedule } from "../scheduler/scoring/scoreSchedule";
import { improveSchedule } from "../scheduler/hillclimbing/improveSchedule";
import { healMinimumSize } from "../scheduler/utils/healMinimumSize";
import { repairSchedule } from "../scheduler/hillclimbing/repairSchedule";
import { withPrunedActivities } from "../scheduler/heuristics/pruneThenHeuristic";
import { assignByActivity } from "../scheduler/heuristics/activityFirstHeuristic";
import { assignByMostConstrained } from "../scheduler/heuristics/mostConstrainedHeuristic";
import { assignByPriority } from "../scheduler/heuristics/assignByPriority";
import { assignByPeer } from "../scheduler/heuristics/peerFirstHeuristic";
import {
  mergeSchedulesRandom,
  mergeSchedulesSmart,
  mergeSchedulesAgreementFirst,
  mergeSchedulesCohortChunks,
  mergeSchedulesHappyChunks,
  mergeSchedulesUnhappyChunks,
  mergeSchedulesByActivity,
} from "../scheduler/hillclimbing/mergeSchedules";
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

const withSeededRandom = async <T>(
  seed: number,
  fn: () => Promise<T> | T
) => {
  let state = seed >>> 0;
  const original = Math.random;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  try {
    return await fn();
  } finally {
    Math.random = original;
  }
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

const reportImprove = (
  seeds: SeedSchedule[],
  prefs: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions
) => {
  const rows = seeds.map((seed) => {
    const improved = improveSchedule(
      seed.schedule,
      prefs,
      activities,
      10,
      scoringOptions
    );
    const improvedScore = scoreSchedule(improved, prefs, scoringOptions);
    const delta = improvedScore - seed.score;
    return {
      name: seed.name,
      baseScore: seed.score,
      improvedScore,
      delta,
      improved: delta > 0,
    };
  });
  console.log("\nImprove harness");
  console.table(rows);
};

type MergeFn = (
  schedules: Schedule[],
  prefs: StudentPreferences[],
  activities: Activity[]
) => Schedule;

const runGA = (
  label: string,
  mergeFn: MergeFn,
  seeds: SeedSchedule[],
  prefs: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions
) => {
  const population = seeds.map((seed) => seed.schedule);
  const populationScores = seeds.map((seed) => seed.score);
  const parentCount = Math.max(4, Math.min(population.length, 12));
  const parents = population
    .map((schedule, index) => ({ schedule, score: populationScores[index] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, parentCount);

  const offspring: Schedule[] = [];
  for (let i = 0; i < parentCount * 3; i++) {
    const parentA = parents[Math.floor(Math.random() * parents.length)];
    const parentB = parents[Math.floor(Math.random() * parents.length)];
    if (!parentA || !parentB) continue;
    let child = mergeFn(
      [parentA.schedule, parentB.schedule],
      prefs,
      activities
    );
    child = improveSchedule(child, prefs, activities, 5, scoringOptions);
    const invalid = validateSchedule(child, activities);
    if (invalid) {
      try {
        child = repairSchedule(child, prefs, activities);
      } catch (err) {
        continue;
      }
    }
    const healed = healMinimumSize(child, prefs, activities);
    if (healed) {
      child = healed;
    }
    if (!validateSchedule(child, activities)) {
      offspring.push(child);
    }
  }

  const scores = offspring.map((schedule) =>
    scoreSchedule(schedule, prefs, scoringOptions)
  );
  const best = scores.length ? Math.max(...scores) : Number.NEGATIVE_INFINITY;
  const avg =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : Number.NEGATIVE_INFINITY;
  console.log(`\nGA harness (${label})`);
  console.log({
    parents: parents.length,
    offspring: offspring.length,
    best,
    avg,
  });
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
    reportImprove(seeds, prefs, dump.activities, scoringOptions);
    runGA(
      "Random merge",
      mergeSchedulesRandom,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
    runGA(
      "Smart merge",
      mergeSchedulesSmart,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
    runGA(
      "Agreement-first merge",
      mergeSchedulesAgreementFirst,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
    runGA(
      "Cohort-chunk merge",
      mergeSchedulesCohortChunks,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
    runGA(
      "Happy-chunk merge",
      mergeSchedulesHappyChunks,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
    runGA(
      "Unhappy-chunk merge",
      mergeSchedulesUnhappyChunks,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
    runGA(
      "Activity-level merge",
      mergeSchedulesByActivity,
      seeds,
      prefs,
      dump.activities,
      scoringOptions
    );
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
    reportImprove(seeds, prefs, scenario.activities, scoringOptions);
    runGA(
      "Random merge",
      mergeSchedulesRandom,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
    runGA(
      "Smart merge",
      mergeSchedulesSmart,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
    runGA(
      "Agreement-first merge",
      mergeSchedulesAgreementFirst,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
    runGA(
      "Cohort-chunk merge",
      mergeSchedulesCohortChunks,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
    runGA(
      "Happy-chunk merge",
      mergeSchedulesHappyChunks,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
    runGA(
      "Unhappy-chunk merge",
      mergeSchedulesUnhappyChunks,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
    runGA(
      "Activity-level merge",
      mergeSchedulesByActivity,
      seeds,
      prefs,
      scenario.activities,
      scoringOptions
    );
  }
};

describe("GA strategy harness", () => {
  test(
    "report",
    { timeout: 20000 },
    async () => {
      await withSeededRandom(42, async () => runHarness());
    }
  );
});
