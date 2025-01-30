import { compareSchedules } from "./compareSchedules";
import type { ClusterInfo, Schedule, ScheduleInfo } from "../../types";
import { scheduleToId } from "./scheduleSaver";

export type FamilyClusters = Map<string, Set<string>>;

/**
 * Maps schedules into family clusters based on a similarity threshold.
 * @param threshold - The minimum similarity score required to be considered part of a family.
 * @param schedules - The list of schedules to cluster.
 * @param existingClusters - A map from reference schedules to their family members.
 * @returns Updated family clusters.
 */
export function mapFamilyClusters(
  threshold: number,
  schedules: ScheduleInfo[],
  existingClusters: FamilyClusters = new Map(),
  referenceSchedules: ScheduleInfo[]
): FamilyClusters {
  // Precompute map from ID to scheduleInfo...
  let scheduleInfoMap = new Map<string, ScheduleInfo>();
  for (let scheduleInfo of schedules) {
    scheduleInfoMap.set(scheduleInfo.id, scheduleInfo);
  }
  for (let scheduleInfo of referenceSchedules) {
    scheduleInfoMap.set(scheduleInfo.id, scheduleInfo);
  }
  // Step 1: If no clusters exist, initialize with the first schedule
  if (existingClusters.size === 0 && schedules.length > 0) {
    existingClusters.set(schedules[0].id, new Set([schedules[0].id]));
  }

  for (let scheduleInfo of schedules) {
    let bestMatch: string | null = null;
    let bestScore = 0;

    // Step 2: Compare with existing family clusters (O(n * families) complexity)
    for (let [referenceScheduleId, familyMembers] of existingClusters) {
      let referenceSchedule =
        scheduleInfoMap.get(referenceScheduleId)?.schedule;
      if (!referenceSchedule) {
        console.error(
          "mapFamilyClusters given existingClusters without reference schedules",
          referenceScheduleId,
          existingClusters,
          referenceSchedules
        );
        continue;
      }
      const similarityScore = compareSchedules(
        scheduleInfo.schedule,
        referenceSchedule,
        true
      );
      if (!similarityScore) {
        console.log("WTF?", scheduleInfo, referenceSchedule);
        throw "WTF?";
      }
      const totalSimilarity =
        similarityScore.assignmentSimilarity + similarityScore.cohortSimilarity;

      if (totalSimilarity >= threshold && totalSimilarity > bestScore) {
        bestMatch = referenceScheduleId;
        bestScore = totalSimilarity;
      }
    }

    // Step 3: Assign schedule to the best matching family cluster
    if (bestMatch) {
      existingClusters.get(bestMatch)!.add(scheduleInfo.id);
    } else {
      // Step 4: If no suitable cluster exists, create a new one
      existingClusters.set(scheduleInfo.id, new Set([scheduleInfo.id]));
    }
  }

  return existingClusters;
}

export function buildClusterInfoList(
  clusterMap: FamilyClusters,
  schedules: ScheduleInfo[]
): ClusterInfo[] {
  let scheduleMap = new Map<string, ScheduleInfo>();
  for (let schedule of schedules) {
    scheduleMap.set(schedule.id, schedule);
  }
  let clusters: ClusterInfo[] = [];
  for (let [id, idCluster] of clusterMap) {
    let reference = id;
    let set = idCluster;
    let infoSet: Set<ScheduleInfo> = new Set();
    let avgScore = 0;
    let bestScore = -Infinity;
    let bestSchedule: ScheduleInfo | null = null;
    for (let scheduleId of set) {
      let info = scheduleMap.get(scheduleId);
      if (!info) {
        throw "WTF?";
      }
      infoSet.add(info);
      avgScore += info.score;
      if (info.score > bestScore) {
        bestScore = info.score;
        bestSchedule = info;
      }
    }
    if (infoSet.size > 0) {
      clusters.push({
        reference,
        set,
        infoSet,
        avgScore,
        bestScore,
        bestSchedule,
        name: "",
      });
    }
  }
  return clusters;
}
