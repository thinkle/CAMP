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
  return {
    schedule,
    score: scoreSchedule(schedule, studentPreferences, scoringOptions),
    invalid: validateSchedule(schedule, activities),
    alg,
    id: scheduleToId(schedule, activities),
    generation,
  };
};
