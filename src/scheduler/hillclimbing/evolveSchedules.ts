import { mergeSchedules } from "./mergeSchedules";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { scheduleToId } from "./scheduleSaver";

import type { Assignment, StudentPreferences, Activity, ScheduleInfo } from "../../types";
import { improveSchedule } from "./improveSchedule";

export const evolveSchedules = (population : ScheduleInfo[], studentPreferences : StudentPreferences[], activities : Activity[],
    noffspring = 20
) : ScheduleInfo[] => {
    population.sort((a, b) => b.score - a.score);
    // Select the top 25% of the population
    const top = population.slice(0, Math.max(10,Math.ceil(population.length / 4)));
    for (let i=0; i<noffspring; i++) {
        let parentOne : ScheduleInfo = top[Math.floor(Math.random() * top.length)];
        let parentTwo : ScheduleInfo = top[Math.floor(Math.random() * top.length)];
        try {
            let childSchedule = mergeSchedules([parentOne.schedule, parentTwo.schedule], studentPreferences, activities);
            childSchedule = improveSchedule(childSchedule, studentPreferences, activities);
            let id = scheduleToId(childSchedule, activities);   
            let valid = validateSchedule(childSchedule, activities);
            let score = scoreSchedule(childSchedule, studentPreferences);
            population.push({
                schedule : childSchedule,
                score,
                alg : 'merge+'+parentOne.alg+'+'+parentTwo.alg,
                invalid : valid,
                generation : parentOne.generation + 1,
                id
            });
        } catch (e) {
            console.log('Stillborn schedule...')
        }
    }
    return population;
}

