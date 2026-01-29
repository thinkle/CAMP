import {
  Assignment,
  StudentPreferences,
  Activity,
  Schedule,
} from "../../types";
import { repairSchedule } from "./repairSchedule";
import { computeHappinessForStudent } from "../scoring/computeHappinessForStudent";

const buildPreferenceWeightMap = (prefs: StudentPreferences[]) => {
  const map = new Map<string, Map<string, number>>();
  for (const pref of prefs) {
    const activityWeights = new Map<string, number>();
    for (const activityPref of pref.activity) {
      activityWeights.set(activityPref.activity, activityPref.weight);
    }
    map.set(pref.identifier, activityWeights);
  }
  return map;
};

const buildPeerWeightMap = (prefs: StudentPreferences[]) => {
  const map = new Map<string, Map<string, number>>();
  for (const pref of prefs) {
    const peerWeights = new Map<string, number>();
    for (const peerPref of pref.peer) {
      peerWeights.set(peerPref.peer, peerPref.weight);
    }
    map.set(pref.identifier, peerWeights);
  }
  return map;
};

const calculateCandidateScore = (
  studentId: string,
  activity: string,
  prefWeights: Map<string, Map<string, number>>,
  studentMap: Map<string, StudentPreferences>,
  assignments: Map<string, string>
): number => {
  const activityWeight = prefWeights.get(studentId)?.get(activity) ?? 0;
  const student = studentMap.get(studentId);
  if (!student) {
    return activityWeight;
  }
  let peerBonus = 0;
  for (const peerPref of student.peer) {
    if (peerPref.weight <= 0) continue;
    const peerActivity = assignments.get(peerPref.peer);
    if (peerActivity === activity) {
      peerBonus += peerPref.weight;
    }
  }
  return activityWeight + peerBonus;
};

const mergeSchedulesRandom = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) => {
  const sortedSchedules = schedules.map((s) =>
    s.slice().sort((a, b) => a.student.localeCompare(b.student))
  );
  let length = sortedSchedules[0].length;
  for (let s of sortedSchedules) {
    if (s.length !== length) {
      throw new Error("Schedules must have the same length");
    }
  }
  let mergedSchedule: Assignment[] = [];
  for (let i = 0; i < length; i++) {
    // naive round robin
    let whichSched = Math.floor(Math.random() * sortedSchedules.length);
    mergedSchedule.push(sortedSchedules[whichSched][i]);
  }
  return repairSchedule(mergedSchedule, studentPreferences, activities);
};

const mergeSchedulesSmart = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) => {
  const activityMap = new Map(activities.map((a) => [a.activity, a.capacity]));
  const prefWeights = buildPreferenceWeightMap(studentPreferences);
  const studentMap = new Map(
    studentPreferences.map((pref) => [pref.identifier, pref])
  );

  const scheduleMaps = schedules.map((schedule) => {
    const map = new Map<string, string>();
    for (const { student, activity } of schedule) {
      map.set(student, activity);
    }
    return map;
  });

  const assignments = new Map<string, string>();
  const activityCounts = new Map<string, number>();
  for (const activity of activities) {
    activityCounts.set(activity.activity, 0);
  }

  const studentIds = studentPreferences
    .map((s) => s.identifier)
    .sort((a, b) => a.localeCompare(b));

  for (const studentId of studentIds) {
    const candidates = Array.from(
      new Set(
        scheduleMaps
          .map((map) => map.get(studentId))
          .filter(Boolean) as string[]
      )
    ).filter((activity) => activityMap.has(activity));

    if (candidates.length === 0) {
      continue;
    }
    if (candidates.length === 1) {
      const activity = candidates[0];
      assignments.set(studentId, activity);
      activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
      continue;
    }

    const scoredCandidates = candidates
      .map((activity) => {
        const score = calculateCandidateScore(
          studentId,
          activity,
          prefWeights,
          studentMap,
          assignments
        );
        const capacity = activityMap.get(activity) ?? 0;
        const used = activityCounts.get(activity) ?? 0;
        const remaining = capacity - used;
        return { activity, score, remaining };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.remaining !== a.remaining) return b.remaining - a.remaining;
        return a.activity.localeCompare(b.activity);
      });

    const best = scoredCandidates[0];
    assignments.set(studentId, best.activity);
    activityCounts.set(
      best.activity,
      (activityCounts.get(best.activity) || 0) + 1
    );
  }

  const mergedSchedule: Assignment[] = [];
  for (const [student, activity] of assignments.entries()) {
    mergedSchedule.push({ student, activity });
  }

  return repairSchedule(mergedSchedule, studentPreferences, activities);
};

const mergeSchedulesAgreementFirst = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) => {
  const activityMap = new Map(activities.map((a) => [a.activity, a.capacity]));
  const prefWeights = buildPreferenceWeightMap(studentPreferences);
  const studentMap = new Map(
    studentPreferences.map((pref) => [pref.identifier, pref])
  );

  const scheduleMaps = schedules.map((schedule) => {
    const map = new Map<string, string>();
    for (const { student, activity } of schedule) {
      map.set(student, activity);
    }
    return map;
  });

  const assignments = new Map<string, string>();
  const activityCounts = new Map<string, number>();
  for (const activity of activities) {
    activityCounts.set(activity.activity, 0);
  }

  const studentIds = studentPreferences
    .map((s) => s.identifier)
    .sort((a, b) => a.localeCompare(b));

  for (const studentId of studentIds) {
    const picks = scheduleMaps
      .map((map) => map.get(studentId))
      .filter(Boolean) as string[];
    if (picks.length === 0) continue;
    const firstPick = picks[0];
    const allAgree = picks.every((p) => p === firstPick);
    if (allAgree && activityMap.has(firstPick)) {
      assignments.set(studentId, firstPick);
      activityCounts.set(
        firstPick,
        (activityCounts.get(firstPick) || 0) + 1
      );
    }
  }

  for (const studentId of studentIds) {
    if (assignments.has(studentId)) continue;

    const candidates = Array.from(
      new Set(
        scheduleMaps
          .map((map) => map.get(studentId))
          .filter(Boolean) as string[]
      )
    ).filter((activity) => activityMap.has(activity));

    if (candidates.length === 0) {
      continue;
    }
    if (candidates.length === 1) {
      const activity = candidates[0];
      assignments.set(studentId, activity);
      activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
      continue;
    }

    const scoredCandidates = candidates
      .map((activity) => {
        const score = calculateCandidateScore(
          studentId,
          activity,
          prefWeights,
          studentMap,
          assignments
        );
        const capacity = activityMap.get(activity) ?? 0;
        const used = activityCounts.get(activity) ?? 0;
        const remaining = capacity - used;
        return { activity, score, remaining };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.remaining !== a.remaining) return b.remaining - a.remaining;
        return a.activity.localeCompare(b.activity);
      });

    const viable = scoredCandidates.filter((c) => c.remaining > 0);
    const best = (viable.length ? viable : scoredCandidates)[0];
    assignments.set(studentId, best.activity);
    activityCounts.set(
      best.activity,
      (activityCounts.get(best.activity) || 0) + 1
    );
  }

  const mergedSchedule: Assignment[] = [];
  for (const [student, activity] of assignments.entries()) {
    mergedSchedule.push({ student, activity });
  }

  return repairSchedule(mergedSchedule, studentPreferences, activities);
};

const mergeSchedulesCohortChunks = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) => {
  const activityMap = new Map(activities.map((a) => [a.activity, a.capacity]));
  const peerWeights = buildPeerWeightMap(studentPreferences);

  const scheduleMaps = schedules.map((schedule) => {
    const map = new Map<string, string>();
    for (const { student, activity } of schedule) {
      map.set(student, activity);
    }
    return map;
  });

  const assignments = new Map<string, string>();
  const activityCounts = new Map<string, number>();
  for (const activity of activities) {
    activityCounts.set(activity.activity, 0);
  }

  const studentIds = studentPreferences
    .map((s) => s.identifier)
    .sort((a, b) => a.localeCompare(b));
  const unassigned = new Set(studentIds);

  const pickRandom = (items: string[]) =>
    items[Math.floor(Math.random() * items.length)];

  const buildCohort = (
    seedId: string,
    activity: string,
    parentMap: Map<string, string>,
    remaining: number
  ) => {
    if (remaining <= 0) return [seedId];
    const seedPeers = peerWeights.get(seedId);
    if (!seedPeers) return [seedId];
    const candidates: Array<{ id: string; score: number }> = [];
    for (const [peerId, weight] of seedPeers.entries()) {
      if (weight <= 0) continue;
      if (!unassigned.has(peerId)) continue;
      if (parentMap.get(peerId) !== activity) continue;
      const reverse = peerWeights.get(peerId)?.get(seedId) ?? 0;
      candidates.push({
        id: peerId,
        score: weight + Math.max(0, reverse),
      });
    }
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    const cohort = [seedId];
    for (const candidate of candidates) {
      if (cohort.length >= remaining) break;
      cohort.push(candidate.id);
    }
    return cohort;
  };

  let parentIndex = 0;
  let guard = 0;
  const maxIterations = Math.max(1, studentIds.length * scheduleMaps.length * 2);

  while (unassigned.size > 0 && guard < maxIterations) {
    guard += 1;
    const seedId = pickRandom(Array.from(unassigned));
    const candidates = scheduleMaps
      .map((map, idx) => ({
        idx,
        activity: map.get(seedId),
      }))
      .filter(
        (candidate) =>
          candidate.activity && activityMap.has(candidate.activity)
      ) as Array<{ idx: number; activity: string }>;

    if (candidates.length === 0) {
      unassigned.delete(seedId);
      continue;
    }

    let assigned = false;
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const candidate =
        candidates[(parentIndex + attempt) % candidates.length];
      const activity = candidate.activity;
      const capacity = activityMap.get(activity) ?? 0;
      const used = activityCounts.get(activity) ?? 0;
      const remaining = capacity - used;
      if (remaining <= 0) continue;
      const cohort = buildCohort(
        seedId,
        activity,
        scheduleMaps[candidate.idx],
        remaining
      );
      for (const member of cohort) {
        assignments.set(member, activity);
        unassigned.delete(member);
      }
      activityCounts.set(activity, used + cohort.length);
      parentIndex = (candidate.idx + 1) % scheduleMaps.length;
      assigned = true;
      break;
    }

    if (!assigned) {
      const fallback = candidates.reduce((best, candidate) => {
        const capacity = activityMap.get(candidate.activity) ?? 0;
        const used = activityCounts.get(candidate.activity) ?? 0;
        const overfill = used + 1 - capacity;
        if (!best || overfill < best.overfill) {
          return { candidate, overfill };
        }
        return best;
      }, null as null | { candidate: { idx: number; activity: string }; overfill: number });
      if (fallback) {
        const activity = fallback.candidate.activity;
        const used = activityCounts.get(activity) ?? 0;
        assignments.set(seedId, activity);
        unassigned.delete(seedId);
        activityCounts.set(activity, used + 1);
        parentIndex = (fallback.candidate.idx + 1) % scheduleMaps.length;
      } else {
        unassigned.delete(seedId);
      }
    }
  }

  for (const studentId of unassigned) {
    const candidates = scheduleMaps
      .map((map) => map.get(studentId))
      .filter(Boolean) as string[];
    const activity = candidates.find((a) => activityMap.has(a));
    if (activity) {
      assignments.set(studentId, activity);
    }
  }

  const mergedSchedule: Assignment[] = [];
  for (const [student, activity] of assignments.entries()) {
    mergedSchedule.push({ student, activity });
  }

  return repairSchedule(mergedSchedule, studentPreferences, activities);
};

const mergeSchedulesByHappiness = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  order: "desc" | "asc"
) => {
  const activityMap = new Map(activities.map((a) => [a.activity, a.capacity]));
  const peerWeights = buildPeerWeightMap(studentPreferences);
  const prefMap = new Map(
    studentPreferences.map((pref) => [pref.identifier, pref])
  );

  const scheduleMaps = schedules.map((schedule) => {
    const map = new Map<string, string>();
    for (const { student, activity } of schedule) {
      map.set(student, activity);
    }
    return map;
  });

  const scheduleOrderings = schedules.map((schedule) => {
    const occupantPrefsByActivity = new Map<string, StudentPreferences[]>();
    for (const activity of activities) {
      occupantPrefsByActivity.set(activity.activity, []);
    }
    for (const { student, activity } of schedule) {
      const pref = prefMap.get(student);
      const list = occupantPrefsByActivity.get(activity);
      if (pref && list) {
        list.push(pref);
      }
    }

    const happinessRows: Array<{ student: string; happiness: number }> = [];
    for (const { student, activity } of schedule) {
      const pref = prefMap.get(student);
      const occupants = occupantPrefsByActivity.get(activity);
      if (!pref || !occupants) continue;
      const { happiness } = computeHappinessForStudent(
        pref,
        activity,
        occupants
      );
      happinessRows.push({ student, happiness });
    }

    happinessRows.sort((a, b) => {
      if (a.happiness !== b.happiness) {
        return order === "desc"
          ? b.happiness - a.happiness
          : a.happiness - b.happiness;
      }
      return a.student.localeCompare(b.student);
    });

    return happinessRows.map((row) => row.student);
  });

  const assignments = new Map<string, string>();
  const activityCounts = new Map<string, number>();
  for (const activity of activities) {
    activityCounts.set(activity.activity, 0);
  }

  const allStudents = Array.from(prefMap.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  const unassigned = new Set(allStudents);
  const pointers = scheduleOrderings.map(() => 0);

  const buildCohort = (
    seedId: string,
    activity: string,
    parentMap: Map<string, string>,
    remaining: number
  ) => {
    if (remaining <= 0) return [seedId];
    const seedPeers = peerWeights.get(seedId);
    if (!seedPeers) return [seedId];
    const candidates: Array<{ id: string; score: number }> = [];
    for (const [peerId, weight] of seedPeers.entries()) {
      if (weight <= 0) continue;
      if (!unassigned.has(peerId)) continue;
      if (parentMap.get(peerId) !== activity) continue;
      const reverse = peerWeights.get(peerId)?.get(seedId) ?? 0;
      candidates.push({
        id: peerId,
        score: weight + Math.max(0, reverse),
      });
    }
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    const cohort = [seedId];
    for (const candidate of candidates) {
      if (cohort.length >= remaining) break;
      cohort.push(candidate.id);
    }
    return cohort;
  };

  const maxIterations = Math.max(1, allStudents.length * schedules.length * 2);
  let guard = 0;

  while (unassigned.size > 0 && guard < maxIterations) {
    guard += 1;
    let progressed = false;

    for (let scheduleIdx = 0; scheduleIdx < scheduleOrderings.length; scheduleIdx++) {
      const ordering = scheduleOrderings[scheduleIdx];
      if (!ordering.length) continue;

      const findCandidate = (requireCapacity: boolean) => {
        let pointer = pointers[scheduleIdx];
        while (pointer < ordering.length) {
          const studentId = ordering[pointer];
          pointer += 1;
          if (!unassigned.has(studentId)) continue;
          const activity = scheduleMaps[scheduleIdx].get(studentId);
          if (!activity || !activityMap.has(activity)) continue;
          if (requireCapacity) {
            const capacity = activityMap.get(activity) ?? 0;
            const used = activityCounts.get(activity) ?? 0;
            if (used >= capacity) continue;
          }
          pointers[scheduleIdx] = pointer;
          return { studentId, activity };
        }
        pointers[scheduleIdx] = pointer;
        return null;
      };

      const candidate =
        findCandidate(true) ?? findCandidate(false);
      if (!candidate) {
        continue;
      }

      const { studentId, activity } = candidate;
      const capacity = activityMap.get(activity) ?? 0;
      const used = activityCounts.get(activity) ?? 0;
      const remaining = capacity - used;
      const cohort = buildCohort(
        studentId,
        activity,
        scheduleMaps[scheduleIdx],
        remaining
      );
      for (const member of cohort) {
        assignments.set(member, activity);
        unassigned.delete(member);
      }
      activityCounts.set(activity, used + cohort.length);
      progressed = true;
    }

    if (!progressed) {
      break;
    }
  }

  for (const studentId of unassigned) {
    const candidates = scheduleMaps
      .map((map) => map.get(studentId))
      .filter(Boolean) as string[];
    const activity = candidates.find((a) => activityMap.has(a));
    if (activity) {
      assignments.set(studentId, activity);
    }
  }

  const mergedSchedule: Assignment[] = [];
  for (const [student, activity] of assignments.entries()) {
    mergedSchedule.push({ student, activity });
  }

  return repairSchedule(mergedSchedule, studentPreferences, activities);
};

const mergeSchedulesHappyChunks = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) =>
  mergeSchedulesByHappiness(
    schedules,
    studentPreferences,
    activities,
    "desc"
  );

const mergeSchedulesUnhappyChunks = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) =>
  mergeSchedulesByHappiness(
    schedules,
    studentPreferences,
    activities,
    "asc"
  );

const mergeSchedulesByActivity = (
  schedules: Schedule[],
  studentPreferences: StudentPreferences[],
  activities: Activity[]
) => {
  const activityMap = new Map(activities.map((a) => [a.activity, a.capacity]));
  const prefWeights = buildPreferenceWeightMap(studentPreferences);

  const scheduleActivityMaps = schedules.map((schedule) => {
    const map = new Map<string, string[]>();
    for (const activity of activities) {
      map.set(activity.activity, []);
    }
    for (const { student, activity } of schedule) {
      if (!activityMap.has(activity)) continue;
      const roster = map.get(activity);
      if (roster) {
        roster.push(student);
      }
    }
    return map;
  });

  const activityChoices = activities.map((activity) => {
    let bestParent = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestCount = 0;
    for (let i = 0; i < scheduleActivityMaps.length; i++) {
      const roster = scheduleActivityMaps[i].get(activity.activity) ?? [];
      let score = 0;
      for (const studentId of roster) {
        score += prefWeights.get(studentId)?.get(activity.activity) ?? 0;
      }
      if (
        score > bestScore ||
        (score === bestScore && roster.length > bestCount)
      ) {
        bestScore = score;
        bestParent = i;
        bestCount = roster.length;
      }
    }
    return {
      activity: activity.activity,
      parentIndex: bestParent,
      score: bestScore,
      count: bestCount,
    };
  });

  activityChoices.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.score !== a.score) return b.score - a.score;
    return a.activity.localeCompare(b.activity);
  });

  const assignments = new Map<string, string>();
  const activityCounts = new Map<string, number>();
  for (const activity of activities) {
    activityCounts.set(activity.activity, 0);
  }

  for (const choice of activityChoices) {
    const roster =
      scheduleActivityMaps[choice.parentIndex].get(choice.activity) ?? [];
    const capacity = activityMap.get(choice.activity) ?? 0;

    roster
      .slice()
      .sort((a, b) => {
        const weightA = prefWeights.get(a)?.get(choice.activity) ?? 0;
        const weightB = prefWeights.get(b)?.get(choice.activity) ?? 0;
        if (weightB !== weightA) return weightB - weightA;
        return a.localeCompare(b);
      })
      .forEach((studentId) => {
        if (assignments.has(studentId)) return;
        const used = activityCounts.get(choice.activity) ?? 0;
        if (used >= capacity) return;
        assignments.set(studentId, choice.activity);
        activityCounts.set(choice.activity, used + 1);
      });
  }

  const mergedSchedule: Assignment[] = [];
  for (const [student, activity] of assignments.entries()) {
    mergedSchedule.push({ student, activity });
  }

  return repairSchedule(mergedSchedule, studentPreferences, activities);
};

export {
  mergeSchedulesRandom,
  mergeSchedulesSmart,
  mergeSchedulesAgreementFirst,
  mergeSchedulesCohortChunks,
  mergeSchedulesHappyChunks,
  mergeSchedulesUnhappyChunks,
  mergeSchedulesByActivity,
};

export const mergeSchedules = mergeSchedulesSmart;
