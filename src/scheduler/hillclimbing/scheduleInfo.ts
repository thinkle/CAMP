import { scheduleToId } from "./scheduleSaver";

import type { Schedule, Activity, StudentPreferences, ScheduleInfo } from "../../types";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";

export const createScheduleInfo = (schedule : Schedule, studentPreferences : StudentPreferences[], activities : Activity[], 
    alg : string, generation = 0) : ScheduleInfo => {
    return {
        schedule,
        score : scoreSchedule(schedule, studentPreferences),
        invalid : validateSchedule(schedule, activities),
        alg,
        id : scheduleToId(schedule, activities),
        generation,
    };
}