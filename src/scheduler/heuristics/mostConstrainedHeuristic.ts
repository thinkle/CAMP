import type { Activity, Schedule, StudentPreferences } from "../../types";
import { preparePreferencesForScheduling } from "../utils/normalizePreferences";

type Requester = {
  student: StudentPreferences;
  primaryWeight: number;
  peerBonus: number;
};

type ActivityInfo = {
  capacity: number;
  assigned: number;
  requesters: Requester[];
  totalScore: number;
};

const buildActivityInfo = (activities: Activity[]): Map<string, ActivityInfo> => {
  const info = new Map<string, ActivityInfo>();
  for (const activity of activities) {
    info.set(activity.activity, {
      capacity: activity.capacity,
      assigned: 0,
      requesters: [],
      totalScore: 0,
    });
  }
  return info;
};

const calculatePeerBonus = (
  student: StudentPreferences,
  activityName: string,
  preferenceLookup: Map<string, StudentPreferences>
): number => {
  let bonus = 0;
  for (const peerPref of student.peer) {
    if (peerPref.weight <= 0) {
      continue;
    }
    const peer = preferenceLookup.get(peerPref.peer);
    if (!peer) {
      continue;
    }
    if (peer.activity.some((pref) => pref.activity === activityName)) {
      bonus += peerPref.weight;
    }
  }
  return bonus;
};

const priorityScore = ({ primaryWeight, peerBonus }: Requester): number => {
  return primaryWeight + peerBonus;
};

const sortActivitiesByConstraint = (
  activityInfo: Map<string, ActivityInfo>
): string[] => {
  return Array.from(activityInfo.entries())
    .map(([name, info]) => {
      const demand = info.requesters.length;
      const demandRatio = demand / Math.max(info.capacity, 1);
      const avgScore =
        demand > 0 ? info.totalScore / demand : 0;
      return {
        name,
        demandRatio,
        avgScore,
      };
    })
    .sort((a, b) => {
      if (b.demandRatio !== a.demandRatio) {
        return b.demandRatio - a.demandRatio;
      }
      if (b.avgScore !== a.avgScore) {
        return b.avgScore - a.avgScore;
      }
      return a.name.localeCompare(b.name);
    })
    .map((entry) => entry.name);
};

export function assignByMostConstrained(
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule {
  const { studentPreferences } = preparePreferencesForScheduling(
    prefs,
    activities
  );

  const preferenceLookup = new Map(
    studentPreferences.map((student) => [student.identifier, student])
  );
  const activityInfo = buildActivityInfo(activities);

  for (const student of studentPreferences) {
    for (const activityPref of student.activity) {
      const info = activityInfo.get(activityPref.activity);
      if (!info) {
        continue;
      }
      const peerBonus = calculatePeerBonus(
        student,
        activityPref.activity,
        preferenceLookup
      );
      info.requesters.push({
        student,
        primaryWeight: Math.max(activityPref.weight, 0),
        peerBonus,
      });
      info.totalScore += Math.max(activityPref.weight, 0) + Math.max(peerBonus, 0);
    }
  }

  const assignments = new Map<string, string>();

  const activityOrder = sortActivitiesByConstraint(activityInfo);
  for (const activityName of activityOrder) {
    const info = activityInfo.get(activityName);
    if (!info) {
      continue;
    }
    info.requesters.sort((a, b) => {
      const delta = priorityScore(b) - priorityScore(a);
      if (delta !== 0) {
        return delta;
      }
      return b.primaryWeight - a.primaryWeight;
    });
    for (const requester of info.requesters) {
      if (info.assigned >= info.capacity) {
        break;
      }
      if (assignments.has(requester.student.identifier)) {
        continue;
      }
      assignments.set(requester.student.identifier, activityName);
      info.assigned += 1;
    }
  }

  for (const student of studentPreferences) {
    if (assignments.has(student.identifier)) {
      continue;
    }
    const sortedPreferences = [...student.activity].sort(
      (a, b) => b.weight - a.weight
    );
    let placed = false;
    for (const preference of sortedPreferences) {
      const info = activityInfo.get(preference.activity);
      if (!info) {
        continue;
      }
      if (info.assigned < info.capacity) {
        assignments.set(student.identifier, preference.activity);
        info.assigned += 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const fallback = Array.from(activityInfo.entries()).find(
        ([, info]) => info.assigned < info.capacity
      );
      if (!fallback) {
        throw new Error(`Could not assign student ${student.identifier}`);
      }
      const [activityName, info] = fallback;
      assignments.set(student.identifier, activityName);
      info.assigned += 1;
    }
  }

  const schedule: Schedule = [];
  assignments.forEach((activity, student) => {
    schedule.push({ student, activity });
  });

  return schedule;
}
