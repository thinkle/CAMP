import { assignByActivity } from "../heuristics/activityFirstHeuristic";
import { assignByPeer } from "../heuristics/peerFirstHeuristic";
import { assignByPriority } from "../heuristics/assignByPriority";
import { assignByCohorts } from "../heuristics/assignByCohorts";
import type {
  Schedule,
  Activity,
  StudentPreferences,
  ScheduleInfo,
} from "../../types";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { scheduleToId } from "./scheduleSaver";
import { createScheduleInfo } from "./scheduleInfo";
import { assignByMostConstrained } from "../heuristics/mostConstrainedHeuristic";

let schedules: ScheduleInfo[] = [];
let activities: Activity[] = [];

const assignByCohortMinSize = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  return assignByCohorts(
    prefs,
    activities,
    activities.map((a) => a.capacity).reduce((a, b) => Math.min(a, b))
  );
};
const assignByCohortMedianSize = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  return assignByCohorts(
    prefs,
    activities,
    activities.map((a) => a.capacity).sort((a, b) => a - b)[
      Math.floor(activities.length / 2)
    ]
  );
};

const assignByThrees = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  return assignByCohorts(prefs, activities, 3);
};
const assignByFives = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  return assignByCohorts(prefs, activities, 5);
};
const assignByTens = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  return assignByCohorts(prefs, activities, 10);
};
const assignByTwenties = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  return assignByCohorts(prefs, activities, 20);
};

const assignFunctions = [
  assignByMostConstrained,
  assignByActivity,
  assignByPeer,
  assignByPriority,
  assignByCohortMinSize,
  assignByCohortMedianSize,
  assignByThrees,
  assignByFives,
  assignByTens,
  assignByTwenties,
];

export const algNames = [
  "Most Constrained",
  "Activity First",
  "Peer First",
  "Priority",
  "Cohort Min Size",
  "Cohort Median Size",
  "Threes",
  "Fives",
  "Tens",
  "Twenties",
];
const nameToFunction = {
  "Most Constrained": assignByMostConstrained,
  "Activity First": assignByActivity,
  "Peer First": assignByPeer,
  Priority: assignByPriority,
  "Cohort Min Size": assignByCohortMinSize,
  "Cohort Median Size": assignByCohortMedianSize,
  Threes: assignByThrees,
  Fives: assignByFives,
  Tens: assignByTens,
  Twenties: assignByTwenties,
};
const functionsToName = new Map();
for (let k in nameToFunction) {
  functionsToName.set(nameToFunction[k], k);
}

export function* generate(
  prefs: StudentPreferences[],
  activities: Activity[],
  nrounds: number,
  algs: string[]
) {
  let existingIds = new Set();
  let myAssignFunctions = assignFunctions;
  if (algs && algs.length) {
    myAssignFunctions = algs.map((a) => nameToFunction[a]);
  }
  for (let s of schedules) {
    existingIds.add(s.id);
  }
  for (let i = 0; i < nrounds; i++) {
    for (let alg of myAssignFunctions) {
      try {
        let shuffledPrefs = [...prefs];
        shuffledPrefs.sort(() => Math.random() - 0.5);
        let schedule = alg(shuffledPrefs, activities);
        let info = createScheduleInfo(
          schedule,
          prefs,
          activities,
          functionsToName.get(alg),
          0
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
  nrounds: number,
  prefs: StudentPreferences[],
  activities: Activity[],
  schedules: ScheduleInfo[] = []
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
};
