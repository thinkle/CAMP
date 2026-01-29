import {
  mergeSchedulesAgreementFirst,
  mergeSchedulesByActivity,
  mergeSchedulesHappyChunks,
  mergeSchedulesSmart,
  mergeSchedulesUnhappyChunks,
} from "./mergeSchedules";
import { scheduleToId } from "./scheduleSaver";
import { healMinimumSize } from "../utils/healMinimumSize";
import { repairSchedule } from "./repairSchedule";
import { MinimumSizeError, CapacityError } from "../scoring/scoreSchedule";

import type {
  Assignment,
  StudentPreferences,
  Activity,
  ScheduleInfo,
  ScoringOptions,
} from "../../types";
import { improveSchedule } from "./improveSchedule";
import { createScheduleInfo } from "./scheduleInfo";

export function* createCrosses(
  population: ScheduleInfo[],
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  rounds: number,
  existingSet: Set<string> | null,
  scoringOptions: ScoringOptions
) {
  const logCapacityDiagnostics = (label: string, schedule: Assignment[]) => {
    const totalCapacity = activities.reduce((sum, a) => sum + a.capacity, 0);
    const activityCounts = new Map<string, number>();
    for (const { activity } of activities) {
      activityCounts.set(activity, 0);
    }
    for (const { activity } of schedule) {
      activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
    }
    const overbooked = activities
      .map((a) => ({
        activity: a.activity,
        count: activityCounts.get(a.activity) || 0,
        capacity: a.capacity,
      }))
      .filter((a) => a.count > a.capacity)
      .sort((a, b) => b.count - b.capacity - (a.count - a.capacity))
      .slice(0, 10);
    console.log(label, {
      students: schedule.length,
      totalCapacity,
      overbooked,
    });
  };

  if (!existingSet) {
    existingSet = new Set(population.map((s) => s.id));
  }
  let combinations = getCombinations(population, 2);
  for (let pair of combinations) {
    try {
      const mergedAlgName = getMergedName(pair[0], pair[1]);
      const mergeStrategies = [
        { name: "Smart", fn: mergeSchedulesSmart },
        { name: "Agreement", fn: mergeSchedulesAgreementFirst },
        { name: "Activity", fn: mergeSchedulesByActivity },
        { name: "Happy", fn: mergeSchedulesHappyChunks },
        { name: "Unhappy", fn: mergeSchedulesUnhappyChunks },
      ];

      const evaluateCandidate = (candidateSchedule: Assignment[], label: string) => {
        let scheduleToScore = candidateSchedule;
        let mergedInfo = createScheduleInfo(
          scheduleToScore,
          studentPreferences,
          activities,
          `${mergedAlgName}-${label}`,
          pair[0].generation + 1,
          scoringOptions
        );
        if (mergedInfo.invalid) {
          if (mergedInfo.invalid === CapacityError) {
            try {
              scheduleToScore = repairSchedule(
                scheduleToScore,
                studentPreferences,
                activities
              );
              mergedInfo = createScheduleInfo(
                scheduleToScore,
                studentPreferences,
                activities,
                `${mergedAlgName}-${label} (repaired)`,
                pair[0].generation + 1,
                scoringOptions
              );
            } catch (err) {
              // Fall through to invalid handling below.
            }
          }
          if (mergedInfo.invalid === MinimumSizeError) {
            const healed = healMinimumSize(
              scheduleToScore,
              studentPreferences,
              activities
            );
            if (healed) {
              scheduleToScore = healed;
              mergedInfo = createScheduleInfo(
                scheduleToScore,
                studentPreferences,
                activities,
                `${mergedAlgName}-${label} (healed)`,
                pair[0].generation + 1,
                scoringOptions
              );
            }
          }
        }
        if (mergedInfo.invalid) {
          console.log(
            "crossbreed ignoring invalid:",
            `${label} -> ${mergedInfo.invalid}`
          );
          if (mergedInfo.invalid === CapacityError) {
            logCapacityDiagnostics(
              `crossbreed capacity diagnostics (${label})`,
              candidateSchedule
            );
          }
          return null;
        }
        return mergedInfo;
      };

      let bestInfo: ScheduleInfo | null = null;
      for (const strategy of mergeStrategies) {
        let merged = strategy.fn(
          pair.map((s) => s.schedule),
          studentPreferences,
          activities
        );
        merged = improveSchedule(
          merged,
          studentPreferences,
          activities,
          rounds,
          scoringOptions
        );
        const candidateInfo = evaluateCandidate(merged, strategy.name);
        if (!candidateInfo) {
          continue;
        }
        if (!bestInfo || candidateInfo.score > bestInfo.score) {
          bestInfo = candidateInfo;
        }
      }

      if (!bestInfo) {
        continue;
      }
      if (existingSet.has(bestInfo.id)) {
        console.log("crossbreed ignoring dup");
        continue;
      }

      existingSet.add(bestInfo.id);
      yield bestInfo;
    } catch (err) {
      console.log("Error merging", err);
    }
  }
}
function getMergedName(
  schedule1: ScheduleInfo,
  schedule2: ScheduleInfo
): string {
  // Extract the root algorithm names from both schedules
  const algorithms = [schedule1.alg, schedule2.alg];
  let p1Base = schedule1.alg.split("+")[0];
  let p2Base = schedule2.alg.split("+")[0];
  let algs = new Set([...p1Base.split("-"), ...p2Base.split("-")]);
  const algNames = Array.from(algs).sort();
  // Determine the next generation number
  const generation = Math.max(schedule1.generation, schedule2.generation) + 1;

  // Return the concise name
  return `${algNames.join("-")}+GA${generation}`;
}

function* getCombinations<T>(array: T[], k: number): Generator<T[]> {
  function* helper(start: number, current: T[]): Generator<T[]> {
    if (current.length === k) {
      yield current;
      return;
    }

    for (let i = start; i < array.length; i++) {
      yield* helper(i + 1, [...current, array[i]]);
    }
  }

  yield* helper(0, []);
}
