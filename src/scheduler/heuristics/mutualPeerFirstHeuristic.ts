import { assignByPeer } from "./peerFirstHeuristic";
import { improveSchedule } from "../hillclimbing/improveSchedule";
import { DEFAULT_SCORING_OPTIONS } from "../../types";

import type {
  Activity,
  Schedule,
  StudentPreferences,
} from "../../types";

type Cluster = StudentPreferences[];

const pickBestActivityForGroup = (
  group: Cluster,
  activities: Activity[],
  remainingCapacity: Map<string, number>
): string | null => {
  let bestActivity: string | null = null;
  let bestScore = -Infinity;
  for (const activity of activities) {
    const capacityLeft = remainingCapacity.get(activity.activity) ?? 0;
    if (capacityLeft < group.length) continue;
    let score = 0;
    for (const student of group) {
      const pref = student.activity.find(
        (a) => a.activity === activity.activity
      );
      if (pref) score += pref.weight;
    }
    if (score > bestScore) {
      bestScore = score;
      bestActivity = activity.activity;
    }
  }
  return bestActivity;
};

const buildMutualClusters = (
  prefs: StudentPreferences[]
): Cluster[] => {
  const prefMap = new Map(prefs.map((p) => [p.identifier, p]));
  const visited = new Set<string>();
  const clusters: Cluster[] = [];

  for (const student of prefs) {
    if (visited.has(student.identifier)) continue;
    const stack = [student];
    const cluster: Cluster = [];
    visited.add(student.identifier);
    while (stack.length) {
      const current = stack.pop()!;
      cluster.push(current);
      for (const peerPref of current.peer) {
        if (peerPref.weight <= 0) {
          continue;
        }
        const peer = prefMap.get(peerPref.peer);
        if (!peer || visited.has(peer.identifier)) continue;
        const mutual = peer.peer.some(
          (p) => p.peer === current.identifier && p.weight > 0
        );
        if (!mutual) continue;
        visited.add(peer.identifier);
        stack.push(peer);
      }
    }
    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  }

  clusters.sort((a, b) => b.length - a.length);
  return clusters;
};

export const assignMutualPeersFirst = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  // Start from peer-first baseline to keep a reasonable schedule.
  let baseSchedule = assignByPeer(prefs, activities);
  const assignments = new Map(baseSchedule.map((a) => [a.student, a.activity]));

  const remainingCapacity = new Map<string, number>();
  for (const activity of activities) {
    remainingCapacity.set(activity.activity, activity.capacity);
  }
  for (const { activity } of baseSchedule) {
    remainingCapacity.set(activity, (remainingCapacity.get(activity) ?? 0) - 1);
  }

  const prefMap = new Map(prefs.map((p) => [p.identifier, p]));
  const clusters = buildMutualClusters(prefs);

  for (const cluster of clusters) {
    // Skip clusters already sharing an activity with capacity.
    const currentActivity = assignments.get(cluster[0].identifier);
    const allTogether = currentActivity
      ? cluster.every((s) => assignments.get(s.identifier) === currentActivity)
      : false;
    if (allTogether) continue;

    // Release their current seats temporarily.
    const originalActivities = cluster.map((student) => {
      const activityName = assignments.get(student.identifier);
      if (activityName) {
        remainingCapacity.set(
          activityName,
          (remainingCapacity.get(activityName) ?? 0) + 1
        );
      }
      return activityName;
    });

    const targetActivity = pickBestActivityForGroup(
      cluster,
      activities,
      remainingCapacity
    );

    if (!targetActivity) {
      // Restore previous seats and skip.
      cluster.forEach((student, idx) => {
        const previous = originalActivities[idx];
        if (previous) {
          remainingCapacity.set(
            previous,
            (remainingCapacity.get(previous) ?? 0) - 1
          );
        }
      });
      continue;
    }

    // Assign cluster to target activity.
    for (const student of cluster) {
      assignments.set(student.identifier, targetActivity);
    }
    remainingCapacity.set(
      targetActivity,
      (remainingCapacity.get(targetActivity) ?? 0) - cluster.length
    );
  }

  const outputSchedule: Schedule = prefs.map((student) => ({
    student: student.identifier,
    activity: assignments.get(student.identifier) || activities[0].activity,
  }));

  // Cleanup pass using existing improver to regain score.
  return improveSchedule(
    outputSchedule,
    prefs,
    activities,
    5,
    DEFAULT_SCORING_OPTIONS
  );
};
