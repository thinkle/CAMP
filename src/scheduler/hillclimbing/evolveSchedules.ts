import { mergeSchedules } from "./mergeSchedules";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { scheduleToId } from "./scheduleSaver";

import type { Assignment, StudentPreferences, Activity, ScheduleInfo } from "../../types";
import { improveSchedule } from "./improveSchedule";
import { createScheduleInfo } from "./scheduleInfo";

export const evolveSchedules = (population : ScheduleInfo[], studentPreferences : StudentPreferences[], activities : Activity[],
    noffspring = 10
) : ScheduleInfo[] => {
    population.sort((a, b) => b.score - a.score);
    // Select the top 25% of the population
    const top = population.slice(0, Math.max(10,Math.ceil(population.length / 4)));
    for (let i=0; i<noffspring; i++) {
        let parentOne : ScheduleInfo = top[Math.floor(Math.random() * top.length)];
        let parentTwo : ScheduleInfo = top[Math.floor(Math.random() * top.length)];
        try {
            let p1 = improveSchedule(parentOne.schedule, studentPreferences, activities);            
            let p2 = improveSchedule(parentTwo.schedule, studentPreferences, activities);            
            let childSchedule = mergeSchedules([p1, p2], studentPreferences, activities);                        
            childSchedule = improveSchedule(childSchedule, studentPreferences, activities,10);
            
            const childScheduleInfo =  createScheduleInfo(
                childSchedule,
                studentPreferences,
                activities,
                'merge+'+parentOne.alg+'+'+parentTwo.alg,
                parentOne.generation + 1
            )                                    
            if (!population.find((s)=>s.id === childScheduleInfo.id)) {
                population.push(
                    childScheduleInfo
                )
                console.log('Added offspring to population, score ', childScheduleInfo.score);
                 
            } else {
                console.log('Generated dup!');
            }
        } catch (e) {
            console.log('Stillborn schedule...')
        }
    }
    return population;
}

export const improveSchedules = (population : ScheduleInfo[], studentPreferences: StudentPreferences[], activities: Activity[]) : ScheduleInfo[] => {
    // choose top 10% of population
    population.sort((a, b) => b.score - a.score);
    let top10 = population.slice(0, Math.max(10,Math.ceil(population.length / 10)));
    if (top10.length > 10) {
        // pick 10 at random from top 10%;
        top10 = top10.sort(() => Math.random() - 0.5).slice(0, 10);
    }
    for (let sched of top10) {
        let newSchedule = improveSchedule(sched.schedule, studentPreferences, activities, 10);        
        let newInfo = createScheduleInfo(newSchedule, studentPreferences, activities, sched.alg+'i', sched.generation + 1);
        if (newInfo.score > sched.score) {
            console.log('Improved one',newInfo.score,newInfo)
            population.push(newInfo);
        }
    }
    return population;    
}
