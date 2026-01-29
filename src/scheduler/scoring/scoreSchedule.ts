import type {
  StudentPreferences,
  Schedule,
  Activity,
  ScoringOptions,
} from "../../types";
import { DEFAULT_SCORING_OPTIONS } from "../../types";

export const DuplicateError = "Student assigned to multiple activities";
export const CapacityError = "Activity overbooked";
export const MinimumSizeError = "Activity below minimum size";

export const validateSchedule = (
  schedule: Schedule,
  activities: Activity[]
): string | null => {
  const activityMap = new Map<string, number>();
  const studentMap = new Map<string, number>();
  for (const { activity } of activities) {
    activityMap.set(activity, 0);
  }
  for (const { activity, student } of schedule) {
    if (!activityMap.has(activity)) {
      return `Unknown activity: ${activity}`;
    }
    activityMap.set(activity, activityMap.get(activity)! + 1);
    if (studentMap.has(student)) {
      return DuplicateError;
    }
    studentMap.set(student, 1);
  }
  for (const [activity, count] of activityMap.entries()) {
    const activityInfo = activities.find((a) => a.activity === activity)!;
    const capacity = activityInfo.capacity;
    const minSize = activityInfo.minSize || 0;

    if (count > capacity) {
      return CapacityError;
    }
    // Check minimum size only if activity has students assigned
    if (count > 0 && count < minSize) {
      return MinimumSizeError;
    }
  }
  return null;
};
export const scoreSchedule = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  scoringOptions: ScoringOptions = DEFAULT_SCORING_OPTIONS
): number => {
  return scoreScheduleWithBreakdown(
    schedule,
    studentPreferences,
    scoringOptions
  ).totalScore;
};

export type ScheduleScoreBreakdown = {
  totalScore: number;
  perStudentScores: Map<string, number>;
};

export const scoreScheduleWithBreakdown = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  scoringOptions: ScoringOptions = DEFAULT_SCORING_OPTIONS
): ScheduleScoreBreakdown => {
  // Precompute studentPreferences map
  const preferencesMap = new Map(
    studentPreferences.map((prefs) => [prefs.identifier, prefs])
  );

  // Build activity rosters
  const activityRosters = new Map<string, Set<string>>();
  for (const { activity, student } of schedule) {
    if (!activityRosters.has(activity)) {
      activityRosters.set(activity, new Set());
    }
    activityRosters.get(activity)!.add(student);
  }

  const perStudentScores = new Map<string, number>();
  const matchState = new Map<
    string,
    { activityMatch: boolean; peerMatches: number }
  >();
  for (const pref of studentPreferences) {
    matchState.set(pref.identifier, { activityMatch: false, peerMatches: 0 });
    perStudentScores.set(pref.identifier, 0);
  }

  const baseScores = new Map<string, number>();
  const scoredStudents = new Set<string>();

  // Calculate base scores (activity + peer)
  for (let { student, activity } of schedule) {
    const prefs = preferencesMap.get(student);
    if (!prefs) continue;

    const state = matchState.get(student);
    let individualScore = perStudentScores.get(student) || 0;

    // Activity score
    const activityPref = prefs.activity.find((a) => a.activity === activity);
    if (activityPref) {
      individualScore += activityPref.weight;
      if (state) {
        state.activityMatch = true;
      }
    }

    // Peer score
    const roster = activityRosters.get(activity);
    if (roster) {
      for (let peer of prefs.peer) {
        if (roster.has(peer.peer)) {
          // Check if peer has also requested this student (mutual request)
          const peerPrefs = preferencesMap.get(peer.peer);
          const mutual = peerPrefs?.peer.some((p) => p.peer === student);

          const weightAdjustment = mutual
            ? scoringOptions.mutualPeerMultiplier
            : scoringOptions.nonMutualPeerMultiplier;
          const adjustedWeight = peer.weight * weightAdjustment;

          individualScore += adjustedWeight;
          if (state) {
            state.peerMatches += 1;
          }
        }
      }
    }

    perStudentScores.set(student, individualScore);
    baseScores.set(student, individualScore);
    scoredStudents.add(student);
  }

  // Apply penalties based on match state
  if (matchState.size) {
    for (const [studentId, { activityMatch, peerMatches }] of matchState) {
      let score = perStudentScores.get(studentId) || 0;
      if (!activityMatch && scoringOptions.noActivityPenalty) {
        score -= scoringOptions.noActivityPenalty;
      }
      if (peerMatches === 0 && scoringOptions.noPeerPenalty) {
        score -= scoringOptions.noPeerPenalty;
      }
      perStudentScores.set(studentId, score);
    }
  }

  // Apply low score threshold penalty (only for scored students)
  if (
    scoringOptions.lowScoreThreshold > 0 &&
    scoringOptions.lowScorePenalty > 0
  ) {
    for (const studentId of scoredStudents) {
      const score = baseScores.get(studentId);
      if (score !== undefined && score < scoringOptions.lowScoreThreshold) {
        const current = perStudentScores.get(studentId) || 0;
        perStudentScores.set(
          studentId,
          current - scoringOptions.lowScorePenalty
        );
      }
    }
  }

  let totalScore = 0;
  for (const score of perStudentScores.values()) {
    totalScore += score;
  }

  return {
    totalScore: Math.floor(totalScore),
    perStudentScores,
  };
};
