import { mergeSchedules } from "./mergeSchedules";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { scheduleToId } from "./scheduleSaver";

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
  if (!existingSet) {
    existingSet = new Set(population.map((s) => s.id));
  }
  let combinations = getCombinations(population, 2);
  for (let pair of combinations) {
    try {
      let merged = mergeSchedules(
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

      const mergedAlgName = getMergedName(pair[0], pair[1]);
      let mergedInfo = createScheduleInfo(
        merged,
        studentPreferences,
        activities,
        mergedAlgName,
        pair[0].generation + 1,
        scoringOptions
      );
      if (mergedInfo.invalid) {
        console.log("crossbreed ignoring invalid:", mergedInfo.invalid);
        continue;
      }
      if (existingSet.has(mergedInfo.id)) {
        console.log("crossbreed ignoring dup");
        continue;
      } else {
        existingSet.add(mergedInfo.id);
        yield mergedInfo;
      }
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
