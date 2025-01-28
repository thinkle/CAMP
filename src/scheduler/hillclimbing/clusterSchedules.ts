import { compareSchedules } from "./compareSchedules";
import type { Schedule } from "../../types";

export type FamilyClusters = Map<Schedule, Set<Schedule>>;

/**
 * Maps schedules into family clusters based on a similarity threshold.
 * @param threshold - The minimum similarity score required to be considered part of a family.
 * @param schedules - The list of schedules to cluster.
 * @param existingClusters - A map from reference schedules to their family members.
 * @returns Updated family clusters.
 */
export function mapFamilyClusters(
  threshold: number,
  schedules: Schedule[],
  existingClusters: FamilyClusters = new Map()
): FamilyClusters {
  // Step 1: If no clusters exist, initialize with the first schedule
  if (existingClusters.size === 0 && schedules.length > 0) {
    existingClusters.set(schedules[0], new Set([schedules[0]]));
  }

  for (let schedule of schedules) {
    let bestMatch: Schedule | null = null;
    let bestScore = 0;
    schedule.sort((a, b) => a.student.localeCompare(b.student));

    // Step 2: Compare with existing family clusters (O(n * families) complexity)
    for (let [referenceSchedule, familyMembers] of existingClusters) {
      const similarityScore = compareSchedules(
        schedule,
        referenceSchedule,
        true
      );
      if (!similarityScore) {
        console.log("WTF?", schedule, referenceSchedule);
        throw "WTF?";
      }
      const totalSimilarity =
        similarityScore.assignmentSimilarity + similarityScore.cohortSimilarity;

      if (totalSimilarity >= threshold && totalSimilarity > bestScore) {
        bestMatch = referenceSchedule;
        bestScore = totalSimilarity;
      }
    }

    // Step 3: Assign schedule to the best matching family cluster
    if (bestMatch) {
      existingClusters.get(bestMatch)!.add(schedule);
    } else {
      // Step 4: If no suitable cluster exists, create a new one
      existingClusters.set(schedule, new Set([schedule]));
    }
  }

  return existingClusters;
}
