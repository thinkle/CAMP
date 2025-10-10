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
  let peerScore = 0;
  let activityScore = 0;
  let penaltyScore = 0;

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

  let individualScores: number[] = [];
  const matchState = new Map<
    string,
    { activityMatch: boolean; peerMatches: number }
  >();
  for (const pref of studentPreferences) {
    matchState.set(pref.identifier, { activityMatch: false, peerMatches: 0 });
  }

  // Calculate scores
  for (let { student, activity } of schedule) {
    const prefs = preferencesMap.get(student);
    if (!prefs) continue;

    const state = matchState.get(student);

    let individualScore = 0;

    // Activity score
    const activityPref = prefs.activity.find((a) => a.activity === activity);
    if (activityPref) {
      activityScore += activityPref.weight;
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

          peerScore += adjustedWeight;
          individualScore += adjustedWeight;
          if (state) {
            state.peerMatches += 1;
          }
        }
      }
    }

    individualScores.push(individualScore);
  }

  // Apply penalties based on match state and individual scores
  if (matchState.size) {
    for (const { activityMatch, peerMatches } of matchState.values()) {
      if (!activityMatch && scoringOptions.noActivityPenalty) {
        penaltyScore += scoringOptions.noActivityPenalty;
      }
      if (peerMatches === 0 && scoringOptions.noPeerPenalty) {
        penaltyScore += scoringOptions.noPeerPenalty;
      }
    }
  }

  // Apply low score threshold penalty
  if (
    scoringOptions.lowScoreThreshold > 0 &&
    scoringOptions.lowScorePenalty > 0
  ) {
    for (const score of individualScores) {
      if (score < scoringOptions.lowScoreThreshold) {
        penaltyScore += scoringOptions.lowScorePenalty;
      }
    }
  }

  return Math.floor(activityScore + peerScore - penaltyScore);
};
