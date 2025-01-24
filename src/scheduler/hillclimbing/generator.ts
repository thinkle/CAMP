import { assignByActivity } from "../heuristics/activityFirstHeuristic";
import { assignByPeer } from "../heuristics/peerFirstHeuristic";
import { assignByPriority } from "../heuristics/assignByPriority";
import { assignByCohorts } from "../heuristics/assignByCohorts";
import type { Schedule, Activity, StudentPreferences, ScheduleInfo } from "../../types";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { scheduleToId } from "./scheduleSaver";
import { createScheduleInfo } from "./scheduleInfo";


let schedules : ScheduleInfo[] = [];
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
const assignByTwenties = (prefs : StudentPreferences[], activities : Activity[]) : Schedule => {
    return assignByCohorts(prefs, activities, 20);
}

export function* generate (prefs : StudentPreferences[], activities: Activity[], nrounds: number) {
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
                let info = createScheduleInfo(
                    schedule,
                    prefs, activities, alg.name, 0
                );
                if (!existingIds.has(info.id)) {
                    existingIds.add(info.id);
                    schedules.push(info);
                    yield info;
                } else {
                    console.log("Ignoring duplicate schedule");
                }
            } catch (e) {
                console.log(e);
                continue;
            }            
        }
    }
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
    for (let scheduleInfo of generate(prefs, activities, 10)) {
        if (!existingIds.has(scheduleInfo.id)) {
            existingIds.add(scheduleInfo.id);
            schedules.push(scheduleInfo);
        } else {
            console.log("Ignoring duplicate schedule");
        }
    }    
    return schedules;
}
