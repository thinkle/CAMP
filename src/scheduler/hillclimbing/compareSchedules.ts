import { Schedule } from "../../types";

export type Similarity = {
  assignmentSimilarity: number;
  cohortSimilarity: number;
};

export type SimilarityError = {
  assignmentSimilarity: 0;
  cohortSimilarity: 0;
  error: any;
  message: string;
};

export const compareSchedules = (
  schedule1: Schedule,
  schedule2: Schedule,
  sorted = false
): Similarity | SimilarityError => {
  if (!sorted) {
    schedule1.sort((a, b) => a.student.localeCompare(b.student));
    schedule2.sort((a, b) => a.student.localeCompare(b.student));
  }
  try {
    let assignmentSimilarity = getAssignmentSimilarity(schedule1, schedule2);
    let cohortSimilarity = getCohortSimilarity(schedule1, schedule2);
    return { assignmentSimilarity, cohortSimilarity };
  } catch (err) {
    console.error("Unexpected error comparing schedules: ", err);
    console.error("schedule1: ", schedule1);
    console.error("schedule2: ", schedule2);
    return {
      assignmentSimilarity: 0,
      cohortSimilarity: 0,
      error: err,
      message: err.message,
    };
  }
};

export const getAssignmentSimilarity = (
  schedule1: Schedule,
  schedule2: Schedule
): number => {
  let sameCount = 0;
  for (let i = 0; i < schedule1.length; i++) {
    if (schedule1[i].student !== schedule2[i].student) {
      throw new Error(
        "Schedules must have the same students in the same order"
      );
    }
    if (schedule1[i].activity === schedule2[i].activity) {
      sameCount++;
    }
  }
  return sameCount / schedule1.length;
};

export const getCohortSimilarity = (
  schedule1: Schedule,
  schedule2: Schedule
): number => {
  let cohorts1 = new Map<string, Set<string>>();
  let cohorts2 = new Map<string, Set<string>>();

  // Build cohorts from schedule1
  for (let { activity, student } of schedule1) {
    if (!cohorts1.has(activity)) {
      cohorts1.set(activity, new Set());
    }
    cohorts1.get(activity)!.add(student);
  }

  // Build cohorts from schedule2
  for (let { activity, student } of schedule2) {
    if (!cohorts2.has(activity)) {
      cohorts2.set(activity, new Set());
    }
    cohorts2.get(activity)!.add(student);
  }

  // Extract cohorts as arrays of sets
  const cohortArray1 = [...cohorts1.values()];
  const cohortArray2 = [...cohorts2.values()];

  let totalSimilarity = 0;
  let maxComparisons = cohortArray1.length * cohortArray2.length;

  // Compare all cohorts from schedule1 to all cohorts in schedule2
  for (let cohort1 of cohortArray1) {
    let bestSimilarity = 0;

    for (let cohort2 of cohortArray2) {
      // Calculate Jaccard similarity for the two cohorts
      const intersectionSize = [...cohort1].filter((student) =>
        cohort2.has(student)
      ).length;
      const unionSize = cohort1.size + cohort2.size - intersectionSize;

      const similarity = unionSize === 0 ? 0 : intersectionSize / unionSize;

      // Track the best similarity for this cohort
      bestSimilarity = Math.max(bestSimilarity, similarity);
    }

    // Add the best similarity for this cohort to the total similarity

    totalSimilarity += bestSimilarity;
  }

  // Normalize the similarity score by the number of cohorts in schedule1
  return cohortArray1.length > 0 ? totalSimilarity / cohortArray1.length : 0;
};
