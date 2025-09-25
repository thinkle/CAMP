import type { Activity, Schedule, StudentPreferences } from "../../types";
import { preparePreferencesForScheduling } from "../utils/normalizePreferences";
import {
  buildConflictGraph,
  getConflictCount,
} from "./conflictUtils";

const getActivityPreferenceWeight = (
  student: StudentPreferences,
  activityName: string
): number => {
  return (
    student.activity.find((pref) => pref.activity === activityName)?.weight ?? 0
  );
};

const compareActivities = (
  a: {
    activity: string;
    conflicts: number;
    weight: number;
    capacity: number;
    peerMatches: number;
  },
  b: {
    activity: string;
    conflicts: number;
    weight: number;
    capacity: number;
    peerMatches: number;
  }
): number => {
  if (a.conflicts !== b.conflicts) {
    return a.conflicts - b.conflicts;
  }
  if (a.peerMatches !== b.peerMatches) {
    return b.peerMatches - a.peerMatches;
  }
  if (a.weight !== b.weight) {
    return b.weight - a.weight;
  }
  return b.capacity - a.capacity;
};

export const assignAvoidForbidden = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  const { studentPreferences } = preparePreferencesForScheduling(
    prefs,
    activities
  );

  const conflicts = buildConflictGraph(studentPreferences);
  const assignments = new Map<string, string>();
  const capacityMap = new Map<string, number>();
  const rosters = new Map<string, Set<string>>();

  for (const activity of activities) {
    capacityMap.set(activity.activity, activity.capacity);
    rosters.set(activity.activity, new Set());
  }

  const sortedStudents = [...studentPreferences].sort((a, b) => {
    const conflictDelta = (conflicts.get(b.identifier)?.size ?? 0) -
      (conflicts.get(a.identifier)?.size ?? 0);
    if (conflictDelta !== 0) {
      return conflictDelta;
    }
    return b.peer.filter((p) => p.weight > 0).length -
      a.peer.filter((p) => p.weight > 0).length;
  });

  for (const student of sortedStudents) {
    const availableActivities = activities.filter(
      ({ activity }) => (capacityMap.get(activity) ?? 0) > 0
    );

    const positivePeers = student.peer.filter((p) => p.weight > 0);

    const rankedOptions = availableActivities
      .map(({ activity, capacity }) => {
        const roster = rosters.get(activity)!;
        const conflictsHere = getConflictCount(
          conflicts,
          student.identifier,
          roster
        );
        const peerMatches = positivePeers.filter((peer) =>
          roster.has(peer.peer)
        ).length;
        return {
          activity,
          conflicts: conflictsHere,
          weight: getActivityPreferenceWeight(student, activity),
          capacity: capacity,
          peerMatches,
        };
      })
      .sort(compareActivities);

    const selected = rankedOptions[0];
    if (!selected) {
      throw new Error("No available activities for student");
    }

    assignments.set(student.identifier, selected.activity);
    capacityMap.set(
      selected.activity,
      (capacityMap.get(selected.activity) ?? 0) - 1
    );
    rosters.get(selected.activity)!.add(student.identifier);
  }

  const schedule: Schedule = [];
  assignments.forEach((activity, student) => {
    schedule.push({ student, activity });
  });

  return schedule;
};
