import { improveSchedule } from "../scheduler";
import { createCrosses } from "../scheduler/hillclimbing/evolveSchedules";
import { generate } from "../scheduler/hillclimbing/generator";
import { mergeSchedules } from "../scheduler/hillclimbing/mergeSchedules";
import { createScheduleInfo } from "../scheduler/hillclimbing/scheduleInfo";
import {
  buildClusterInfoList,
  mapFamilyClusters,
} from "../scheduler/hillclimbing/clusterSchedules";

import type {
  Schedule,
  Activity,
  StudentPreferences,
  ScheduleInfo,
  WorkerMessage,
} from "../types";

let running;

const postMessage = (message: WorkerMessage) => {
  self.postMessage(message);
};

const stop = () => {
  running = false;
};

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function improveForever(
  schedule: ScheduleInfo,
  prefs: StudentPreferences[],
  activities: Activity[],
  stopAfter = 10,
  existingSet: Set<string> | null
) {
  postMessage({
    type: "started",
    message: `Started improving schedule (${schedule.score})`,
  });
  running = true;
  let rounds = 0;
  let startingScore = schedule.score;
  while (running && (!stopAfter || rounds < stopAfter)) {
    rounds++;
    try {
      let improved = improveSchedule(schedule.schedule, prefs, activities);
      let alg = "";
      if (schedule.alg.endsWith("improve")) {
        alg = schedule.alg;
      } else {
        alg = schedule.alg + "improve";
      }
      let improvedInfo = createScheduleInfo(
        improved,
        prefs,
        activities,
        schedule.alg,
        schedule.generation + 1
      );
      if (improvedInfo.score > schedule.score) {
        schedule = improvedInfo;
        if (existingSet && existingSet.has(improvedInfo.id)) {
          console.log("Worker ignoring dup");
          continue;
        } else {
          console.log(
            "worker: Improved schedule",
            improvedInfo.score,
            improvedInfo
          );
          postMessage({
            type: "improved",
            schedule: improvedInfo,
            message: `Improved by ${improvedInfo.score - startingScore}`,
          });
        }
      } else {
        postMessage({
          type: "doneImproving",
          complete: true,
          message: `No further improvements (+${
            improvedInfo.score - startingScore
          } total)`,
        });
        return;
      }
      await tick();
    } catch (err) {
      postMessage({ type: "error", message: err.message, complete: true });
      running = false;
    }
  }
  postMessage({
    type: running ? "doneImproving" : "stopped",
    complete: true,
    message: "Stopped after " + rounds + " rounds",
  });
}

async function generateStarters(
  prefs: StudentPreferences[],
  activities: Activity[],
  rounds: number,
  algs: string[]
) {
  postMessage({ type: "started", message: "Started generating schedules" });
  running = true;
  let i = 0;
  for (let scheduleInfo of generate(prefs, activities, rounds, algs)) {
    i++;
    postMessage({
      type: "generated",
      schedule: scheduleInfo,
      message: `Generated schedule ${i}`,
    });
    await tick();
    if (!running) {
      postMessage({
        type: "stopped",
        message: "Interrupted after generating ${i} schedules",
        complete: true,
      });
      return;
    }
  }

  postMessage({
    type: "stopped",
    message: `Generated ${i} schedules.`,
    complete: true,
  });
}

async function evolveGenerations(
  population: ScheduleInfo[],
  prefs: StudentPreferences[],
  activities: Activity[],
  rounds: number | null,
  existingSet: Set<string> | null
) {
  running = true;
  postMessage({
    type: "started",
    message: "Started evolving schedules",
    count: 0,
    total: rounds,
  });
  console.log(
    "worker: evolveGenerations",
    population,
    prefs,
    activities,
    rounds
  );
  let n = 0;
  while (running && (!rounds || n < rounds)) {
    let nextGen = [];
    for (let offspring of createCrosses(
      population,
      prefs,
      activities,
      10,
      existingSet
    )) {
      nextGen.push(offspring);
      postMessage({
        type: "evolved",
        message: "Evolved schedule",
        schedule: offspring,
        count: n,
        total: rounds,
      });
      await tick();
      if (!running) {
        postMessage({
          type: "stopped",
          message: "Evolution interrupted",
          complete: true,
        });
        return;
      }
    }
    population = selectSurvivors(nextGen, population.length);
    await tick();
    n++;
  }

  postMessage({
    type: "stopped",
    message: `Done evolving, final population ${population.length}`,
    population,
    complete: true,
    count: n,
    total: rounds,
  });
}

function selectSurvivors(offspring: ScheduleInfo[], targetSize: number) {
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
        improveForever(
          payload.schedule,
          payload.prefs,
          payload.activities,
          payload.stopAfter,
          payload.existingSet
        );
        break;

      case "generate":
        // Generate starter schedules
        generateStarters(
          payload.prefs,
          payload.activities,
          payload.rounds,
          payload.algs
        );
        break;

      case "evolve":
        // Evolve a generation of schedules
        evolveGenerations(
          payload.population,
          payload.prefs,
          payload.activities,
          payload.rounds,
          payload.existingSet
        );
        break;

      case "cluster":
        // Cluster schedules
        postMessage({
          type: "started",
          message: "Started clustering schedules",
        });
        let map = mapFamilyClusters(
          payload.threshold,
          payload.schedules,
          payload.clusters,
          payload.referenceSchedules || []
        );
        postMessage({
          type: "clustered",
          map,
          complete: true,
          message: "Done clustering schedules",
        });
        break;

      case "stop":
        // Stop the current process
        stop();
        break;

      default:
        postMessage({ type: "error", message: `Unknown type: ${type}` });
    }
  } catch (err) {
    // Catch any errors and send back to the main thread

    postMessage({ type: "error", message: err.message, complete: true });
  }
};
