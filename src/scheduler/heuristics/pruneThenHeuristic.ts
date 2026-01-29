import type { Activity, Schedule, StudentPreferences } from "../../types";

export type AssignmentHeuristic = (
  prefs: StudentPreferences[],
  activities: Activity[]
) => Schedule;

type PrunedData = {
  prefs: StudentPreferences[];
  activities: Activity[];
};

const clonePreferences = (
  prefs: StudentPreferences[]
): StudentPreferences[] =>
  prefs.map((pref) => ({
    identifier: pref.identifier,
    activity: pref.activity.map((activityPref) => ({
      activity: activityPref.activity,
      weight: activityPref.weight,
    })),
    peer: pref.peer.map((peerPref) => ({
      peer: peerPref.peer,
      weight: peerPref.weight,
    })),
  }));

export const pruneActivitiesByTopChoice = (
  prefs: StudentPreferences[],
  activities: Activity[]
): PrunedData => {
  if (activities.length === 0) {
    return { prefs: clonePreferences(prefs), activities: [] };
  }

  const topChoiceCounts = new Map<string, number>();
  const weightTotals = new Map<string, number>();
  for (const activity of activities) {
    topChoiceCounts.set(activity.activity, 0);
    weightTotals.set(activity.activity, 0);
  }

  for (const student of prefs) {
    if (student.activity.length === 0) {
      continue;
    }
    let maxWeight = -Infinity;
    for (const pref of student.activity) {
      maxWeight = Math.max(maxWeight, pref.weight);
      weightTotals.set(
        pref.activity,
        (weightTotals.get(pref.activity) || 0) + pref.weight
      );
    }
    if (!Number.isFinite(maxWeight)) {
      continue;
    }
    if (maxWeight > 0) {
      for (const pref of student.activity) {
        if (pref.weight === maxWeight) {
          topChoiceCounts.set(
            pref.activity,
            (topChoiceCounts.get(pref.activity) || 0) + 1
          );
        }
      }
    }
  }

  let openActivities = activities.filter(
    (activity) => (topChoiceCounts.get(activity.activity) || 0) > 0
  );

  if (openActivities.length === 0) {
    return { prefs: clonePreferences(prefs), activities: activities.slice() };
  }

  let capacity = openActivities.reduce((sum, a) => sum + a.capacity, 0);
  if (capacity < prefs.length) {
    const openSet = new Set(openActivities.map((a) => a.activity));
    const remaining = activities
      .filter((activity) => !openSet.has(activity.activity))
      .sort((a, b) => {
        const topA = topChoiceCounts.get(a.activity) || 0;
        const topB = topChoiceCounts.get(b.activity) || 0;
        if (topB !== topA) {
          return topB - topA;
        }
        const weightA = weightTotals.get(a.activity) || 0;
        const weightB = weightTotals.get(b.activity) || 0;
        if (weightB !== weightA) {
          return weightB - weightA;
        }
        return a.activity.localeCompare(b.activity);
      });

    for (const activity of remaining) {
      openActivities.push(activity);
      capacity += activity.capacity;
      if (capacity >= prefs.length) {
        break;
      }
    }
  }

  const openSet = new Set(openActivities.map((a) => a.activity));
  const fallbackActivities = openActivities.map((activity) => ({
    activity: activity.activity,
    weight: 0,
  }));

  const prunedPrefs = prefs.map((pref) => {
    const filtered = pref.activity.filter((a) => openSet.has(a.activity));
    return {
      identifier: pref.identifier,
      activity:
        filtered.length > 0
          ? filtered.map((a) => ({ activity: a.activity, weight: a.weight }))
          : fallbackActivities.map((a) => ({ ...a })),
      peer: pref.peer.map((p) => ({ peer: p.peer, weight: p.weight })),
    };
  });

  return { prefs: prunedPrefs, activities: openActivities };
};

export const withPrunedActivities = (
  assignFn: AssignmentHeuristic
): AssignmentHeuristic => {
  return (prefs, activities) => {
    const { prefs: prunedPrefs, activities: prunedActivities } =
      pruneActivitiesByTopChoice(prefs, activities);
    return assignFn(prunedPrefs, prunedActivities);
  };
};
