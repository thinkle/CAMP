import { improveSchedule } from "../scheduler";
import { createCrosses } from "../scheduler/hillclimbing/evolveSchedules";
import { generate } from "../scheduler/hillclimbing/generator";
import { mergeSchedules } from "../scheduler/hillclimbing/mergeSchedules";
import { createScheduleInfo } from "../scheduler/hillclimbing/scheduleInfo";
import type { Schedule, Activity, StudentPreferences, ScheduleInfo } from "../types";

let running;

const stop = () => {
    running = false;
}

function improveForever (schedule: ScheduleInfo, prefs: StudentPreferences[], activities : Activity[], stopAfter=10) {
    console.log('worker: improveForever', schedule, prefs, activities, stopAfter);
    running = true;
    let rounds = 0;
    while (running && !stopAfter || rounds < stopAfter) {
        rounds++;
        try {
            let improved = improveSchedule(schedule.schedule, prefs, activities);
            let alg = '';
            if (schedule.alg.endsWith('improve')) {
                alg = schedule.alg;
            } else {
                alg = schedule.alg + 'improve';
            }
            let improvedInfo = createScheduleInfo(improved, prefs, activities, schedule.alg, schedule.generation+1);            
            if (improvedInfo.score > schedule.score) {
                console.log('worker: Improved schedule', improvedInfo.score, improvedInfo);
                self.postMessage({ type: 'improved', schedule: improvedInfo });
                schedule = improvedInfo;
            } else {
                self.postMessage( {type : 'doneImproving' });
                self.postMessage({ type: 'stopped'});
                return;
            }
        } catch (err) {
            self.postMessage({ type: 'error', function :  'improve', message: err.message });
            running = false;
        }
    }
    self.postMessage({ type: 'stopped'});
    console.log('worker: done improving');
}

function generateStarters (prefs: StudentPreferences[], activities: Activity[], rounds : number, algs : string[]) {
    running = true;
    console.log('worker: generateStarters', prefs, activities, rounds);    
    for (let scheduleInfo of generate(prefs, activities, rounds, algs)) {        
        console.log('worker: generated', scheduleInfo);
        self.postMessage({ type: 'generated', schedule: scheduleInfo });
        if (!running) {
            self.postMessage({ type: 'stopped'});
            break
        }
    }
    console.log('worker done generating');
    self.postMessage({ type: 'stopped'});
}

function evolveGenerations (population : ScheduleInfo[], prefs: StudentPreferences[], activities: Activity[], rounds: number | null) {
    running = true;
    console.log('worker: evolveGenerations', population, prefs, activities, rounds);
    let n = 0;
    while (running && !rounds || n < rounds) {
        console.log('worker: Evolving generation', n);
        let nextGen = [];
        for (let offspring of createCrosses(population, prefs, activities, 10)) {
            nextGen.push(offspring);
            console.log('worker: Evolved schedule', offspring.score, offspring);
            self.postMessage({ type: 'evolved', schedule: offspring });
            if (!running) {
                self.postMessage({ type: 'stopped'});
                break;
            }
        }
        population = selectSurvivors(nextGen, population.length);
        n++;        
    }
    console.log('worker: done evolving');
    self.postMessage({message: 'done evolving', survivors : population});
    self.postMessage({ type: 'stopped'});
}

function selectSurvivors (offspring: ScheduleInfo[], targetSize: number) {
    offspring.sort((a, b) => b.score - a.score); // sort from best to worst
    return offspring.slice(0, targetSize);
}
self.onmessage = (e) => {
    const { type, payload } = e.data; // Extract the message type and payload
    running = true; // Ensure the worker is ready to run on every new message

    try {
        switch (type) {
            case "improve":
                // Improve a schedule
                improveForever(payload.schedule, payload.prefs, payload.activities, payload.stopAfter);
                break;

            case "generate":
                // Generate starter schedules
                generateStarters(payload.prefs, payload.activities, payload.rounds, payload.algs);
                break;

            case "evolve":
                // Evolve a generation of schedules
                evolveGenerations(payload.population, payload.prefs, payload.activities, payload.rounds);
                break;

            case "stop":
                // Stop the current process
                stop();
                self.postMessage({ message: "stopped" });
                break;

            default:
                self.postMessage({ type: "error", message: `Unknown type: ${type}` });
        }
    } catch (err) {
        // Catch any errors and send back to the main thread

        self.postMessage({ type: "error", message: err.message });
    }
};