import { Assignment, StudentPreferences, Activity, Schedule } from "../../types";
import { repairSchedule } from "./repairSchedule";

export const mergeSchedules = (schedules : Schedule[], studentPreferences : StudentPreferences[], activities : Activity[]) => {
    const sortedSchedules = schedules.map((s)=>s.slice().sort((a, b)=>a.student.localeCompare(b.student)));
    let length = sortedSchedules[0].length;
    for (let s of sortedSchedules) {
        if (s.length !== length) {
            throw new Error('Schedules must have the same length');
        }
    }
    let mergedSchedule : Assignment[] = [];
    for (let i = 0; i<length; i++) {
        // naive round robin
        let whichSched = Math.floor(Math.random()* sortedSchedules.length);
        mergedSchedule.push(sortedSchedules[whichSched][i]);
    }
    return repairSchedule(mergedSchedule, studentPreferences, activities);
}