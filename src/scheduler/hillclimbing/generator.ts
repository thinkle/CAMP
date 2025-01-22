import { assignByActivity } from "../heuristics/activityFirstHeuristic";
import { assignByPeer } from "../heuristics/peerFirstHeuristic";
import { assignByPriority } from "../heuristics/assignByPriority";
import { assignByCohorts } from "../heuristics/assignByCohorts";
import type { Schedule, Activity, StudentPreferences } from "../../types";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { scheduleToId } from "./scheduleSaver";


let schedules : {
    schedule : Schedule,
    score : number,
    alg : string,
    invalid : string | null
 }[] = [];

let activities : Activity[] = [];

const assignByCohortMinSize = (prefs : StudentPreferences[], activities : Activity[]) : Schedule => {
    return assignByCohorts(prefs, activities, activities.map(a => a.capacity).reduce((a, b) => Math.min(a, b)));
}
const assignByCohortMedianSize = (prefs : StudentPreferences[], activities : Activity[]) : Schedule => {
   return assignByCohorts(prefs, activities, 
    activities.map(a => a.capacity).sort((a, b) => a - b)[Math.floor(activities.length / 2)]);
}

const assignByThrees = (prefs : StudentPreferences[], activities : Activity[]) : Schedule => {
    return assignByCohorts(prefs, activities, 3);
}
const assignByFives = (prefs : StudentPreferences[], activities : Activity[]) : Schedule => {
    return assignByCohorts(prefs, activities, 5);
}
const assignByTens = (prefs : StudentPreferences[], activities : Activity[]) : Schedule => {
    return assignByCohorts(prefs, activities, 10);
}

type ScheduleInfo = {
    schedule : Schedule,
    score: number,
    invalid : string | null,
    alg : string,
    id : string,
}

export const generateSchedulesFromHeuristics = (
    nrounds : number, 
    prefs : StudentPreferences[], 
    activities : Activity[],
    schedules : ScheduleInfo[] = []
) => {
    let existingIds = new Set();
    for (let s of schedules) {
        existingIds.add(s.id);
    }
    for (let i=0; i<nrounds; i++) {
        for (let alg of [assignByActivity, assignByPeer, assignByPriority,
            assignByCohortMinSize, assignByCohortMedianSize, assignByThrees, assignByFives,
            assignByTens
        ]) {
            try {
                let shuffledPrefs = [...prefs];
                shuffledPrefs.sort(() => Math.random() - 0.5);
                let schedule = alg(shuffledPrefs, activities);
                let id = scheduleToId(schedule, activities);
                if (!existingIds.has(id)) {
                    existingIds.add(id);
                    schedules.push({
                        schedule,
                        score : scoreSchedule(schedule, prefs),
                        invalid : validateSchedule(schedule, activities),
                        alg : alg.name,
                        id
                    });
                } else {
                    console.log("Ignoring duplicate schedule");
                }
            } catch (e) {
                console.log(e);
                continue;
            }            
        }
    }
    return schedules;
}
