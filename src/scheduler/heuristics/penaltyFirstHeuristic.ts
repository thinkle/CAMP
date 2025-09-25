import type { Activity, Schedule, StudentPreferences } from "../../types";
import { preparePreferencesForScheduling } from "../utils/normalizePreferences";
import {
  buildConflictGraph,
  getConflictCount,
} from "./conflictUtils";

const CONFLICT_PENALTY = 20000;
const NO_ACTIVITY_PENALTY = 800;
const NO_PEER_PENALTY = 800;
const ACTIVITY_WEIGHT_GAP_MULTIPLIER = 5;
const MISSING_PEER_WEIGHT = 200;

type Evaluation = {
  activity: string;
  penalty: number;
  weight: number;
  peerMatches: number;
};

const getPositivePeers = (student: StudentPreferences) =>
  student.peer.filter((p) => p.weight > 0);

const getActivityPreferenceWeight = (
  student: StudentPreferences,
  activityName: string
): number => {
  return (
    student.activity.find((pref) => pref.activity === activityName)?.weight ?? 0
  );
};

const evaluatePlacement = (
  student: StudentPreferences,
  activityName: string,
  roster: Set<string>,
  conflictGraph: Map<string, Set<string>>
): Evaluation => {
  const conflicts = getConflictCount(conflictGraph, student.identifier, roster);

  let penalty = conflicts * CONFLICT_PENALTY;

  const preferredActivities = student.activity.filter((pref) => pref.weight > 0);
  const selectedWeight =
    student.activity.find((pref) => pref.activity === activityName)?.weight ?? 0;
  const maxPreferredWeight = preferredActivities.length
    ? Math.max(...preferredActivities.map((pref) => pref.weight))
    : 0;

  if (preferredActivities.length > 0 && selectedWeight <= 0) {
    penalty += NO_ACTIVITY_PENALTY;
  }

  const positivePeers = getPositivePeers(student);
  const peerMatches = positivePeers.filter((peer) => roster.has(peer.peer)).length;
  const missingPeers = positivePeers.length - peerMatches;
  if (positivePeers.length > 0 && peerMatches === 0) {
    penalty += NO_PEER_PENALTY;
  }
  if (missingPeers > 0) {
    penalty += missingPeers * MISSING_PEER_WEIGHT;
  }

  const weightGap = Math.max(maxPreferredWeight - Math.max(selectedWeight, 0), 0);
  penalty += weightGap * ACTIVITY_WEIGHT_GAP_MULTIPLIER;

  // Reward higher preference weights by reducing penalty slightly.
  penalty -= Math.max(selectedWeight, 0);

  return {
    activity: activityName,
    penalty,
    weight: selectedWeight,
    peerMatches,
  };
};

const pickStudentWithHighestRisk = (
  students: StudentPreferences[],
  unassigned: Set<string>,
  activities: Activity[],
  capacityMap: Map<string, number>,
  rosters: Map<string, Set<string>>,
  conflictGraph: Map<string, Set<string>>
) => {
  let chosenStudent: StudentPreferences | null = null;
  let chosenBestEval: Evaluation | null = null;

  for (const student of students) {
    if (!unassigned.has(student.identifier)) {
      continue;
    }

    const feasible = activities
      .filter(({ activity }) => (capacityMap.get(activity) ?? 0) > 0)
      .map(({ activity }) =>
        evaluatePlacement(
          student,
          activity,
          rosters.get(activity)!,
          conflictGraph
        )
      );

    if (feasible.length === 0) {
      continue;
    }

    feasible.sort((a, b) => {
      if (a.penalty !== b.penalty) {
        return a.penalty - b.penalty;
      }
      if (a.peerMatches !== b.peerMatches) {
        return b.peerMatches - a.peerMatches;
      }
      return b.weight - a.weight;
    });

    const bestEval = feasible[0];

    if (!chosenStudent) {
      chosenStudent = student;
      chosenBestEval = bestEval;
      continue;
    }

    if (bestEval.penalty > (chosenBestEval?.penalty ?? Number.NEGATIVE_INFINITY)) {
      chosenStudent = student;
      chosenBestEval = bestEval;
    } else if (bestEval.penalty === chosenBestEval?.penalty) {
      const currentConflicts =
        conflictGraph.get(student.identifier)?.size ?? 0;
      const chosenConflicts =
        conflictGraph.get(chosenStudent.identifier)?.size ?? 0;
      if (currentConflicts > chosenConflicts) {
        chosenStudent = student;
        chosenBestEval = bestEval;
      }
    }
  }

  if (!chosenStudent || !chosenBestEval) {
    return null;
  }
  return { student: chosenStudent, evaluation: chosenBestEval };
};

export const assignPenaltyFirst = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  const { studentPreferences } = preparePreferencesForScheduling(
    prefs,
    activities
  );

  const conflictGraph = buildConflictGraph(studentPreferences);
  const assignments = new Map<string, string>();
  const capacityMap = new Map<string, number>();
  const capacityLimits = new Map<string, number>();
  const rosters = new Map<string, Set<string>>();
  const studentLookup = new Map(
    studentPreferences.map((student) => [student.identifier, student])
  );

  for (const activity of activities) {
    capacityMap.set(activity.activity, activity.capacity);
    capacityLimits.set(activity.activity, activity.capacity);
    rosters.set(activity.activity, new Set());
  }

  const unassigned = new Set(studentPreferences.map((s) => s.identifier));

  while (unassigned.size > 0) {
    const selection = pickStudentWithHighestRisk(
      studentPreferences,
      unassigned,
      activities,
      capacityMap,
      rosters,
      conflictGraph
    );

    if (!selection) {
      throw new Error("Unable to select next student for penalty-first assignment");
    }

    const { student, evaluation } = selection;
    assignments.set(student.identifier, evaluation.activity);
    unassigned.delete(student.identifier);

    const remaining = capacityMap.get(evaluation.activity) ?? 0;
    capacityMap.set(evaluation.activity, remaining - 1);
    const roster = rosters.get(evaluation.activity)!;
    roster.add(student.identifier);

    const positivePeers = getPositivePeers(student)
      .filter((peer) => unassigned.has(peer.peer))
      .sort((a, b) => b.weight - a.weight);

    for (const peerPref of positivePeers) {
      const remainingCapacity = capacityMap.get(evaluation.activity) ?? 0;
      if (remainingCapacity <= 0) {
        break;
      }
      const peerStudent = studentLookup.get(peerPref.peer);
      if (!peerStudent) {
        continue;
      }
      const peerConflicts = getConflictCount(
        conflictGraph,
        peerStudent.identifier,
        roster
      );
      if (peerConflicts > 0) {
        continue;
      }

      assignments.set(peerStudent.identifier, evaluation.activity);
      unassigned.delete(peerStudent.identifier);
      roster.add(peerStudent.identifier);
      capacityMap.set(evaluation.activity, remainingCapacity - 1);
    }
  }

  // Post-process to reduce zero-peer placements where possible.
  let changed = true;
  let passes = 0;
  const maxPasses = Math.max(studentPreferences.length, 1);
  while (changed && passes < maxPasses) {
    passes += 1;
    changed = false;
    for (const student of studentPreferences) {
      const currentActivity = assignments.get(student.identifier);
      if (!currentActivity) {
        continue;
      }
      const currentRoster = rosters.get(currentActivity)!;
      const positivePeers = getPositivePeers(student);
      if (positivePeers.length === 0) {
        continue;
      }
      const matchedPeers = positivePeers.filter((peer) =>
        currentRoster.has(peer.peer)
      );
      if (matchedPeers.length > 0) {
        continue;
      }

      let realigned = false;

      for (const peerPref of positivePeers) {
        const peerActivity = assignments.get(peerPref.peer);
        if (!peerActivity || peerActivity === currentActivity) {
          continue;
        }
        const targetRoster = rosters.get(peerActivity)!;
        const targetCapacity = capacityLimits.get(peerActivity) ?? targetRoster.size;

        if (getConflictCount(conflictGraph, student.identifier, targetRoster) > 0) {
          continue;
        }

        if (targetRoster.size < targetCapacity) {
          // Move directly.
          currentRoster.delete(student.identifier);
          targetRoster.add(student.identifier);
          assignments.set(student.identifier, peerActivity);
          changed = true;
          realigned = true;
          break;
        }

        // Attempt swap with a low-attachment occupant.
        for (const candidateId of targetRoster) {
          if (candidateId === peerPref.peer) {
            continue;
          }
          const candidate = studentLookup.get(candidateId);
          if (!candidate) {
            continue;
          }
          if (
            getConflictCount(conflictGraph, candidateId, currentRoster) > 0
          ) {
            continue;
          }

          const candidatePositivePeers = getPositivePeers(candidate);
          const candidateMatchesInTarget = candidatePositivePeers.filter((peer) =>
            targetRoster.has(peer.peer)
          ).length;
          if (candidateMatchesInTarget > 0) {
            continue;
          }

          const candidatePrefTarget = getActivityPreferenceWeight(
            candidate,
            peerActivity
          );
          const candidatePrefCurrent = getActivityPreferenceWeight(
            candidate,
            currentActivity
          );
          if (candidatePrefTarget > candidatePrefCurrent) {
            continue;
          }

          // Perform swap.
          targetRoster.delete(candidateId);
          targetRoster.add(student.identifier);
          currentRoster.delete(student.identifier);
          currentRoster.add(candidateId);
          assignments.set(student.identifier, peerActivity);
          assignments.set(candidateId, currentActivity);
          changed = true;
          realigned = true;
          break;
        }

        if (realigned) {
          break;
        }
      }
    }
  }

  const schedule: Schedule = [];
  assignments.forEach((activity, student) => {
    schedule.push({ student, activity });
  });

  return schedule;
};
