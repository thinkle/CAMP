import { scheduleToId } from "./scheduleSaver";

import type {
  Schedule,
  Activity,
  StudentPreferences,
  ScheduleInfo,
  ScoringOptions,
} from "../../types";
import { DEFAULT_SCORING_OPTIONS } from "../../types";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";

export const createScheduleInfo = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  alg: string,
  generation = 0,
  scoringOptions: ScoringOptions = DEFAULT_SCORING_OPTIONS
): ScheduleInfo => {
  // Infer if we're in peer-only mode: all students have no meaningful activity preferences
  // (either empty or all weights are 0)
  const isPeerOnlyMode = studentPreferences.every(
    (pref) =>
      pref.activity.length === 0 || pref.activity.every((a) => a.weight === 0)
  );

  return {
    schedule,
    score: scoreSchedule(schedule, studentPreferences, scoringOptions),
    invalid: validateSchedule(schedule, activities),
    alg,
    id: scheduleToId(schedule, activities, isPeerOnlyMode),
    generation,
  };
};
