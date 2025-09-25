import type { StudentPreferences } from "../types";

/**
 * Computes how "happy" a student is in a given activity, considering:
 * 1) The student's own activity preference weight for that activity.
 * 2) The sum of peer preference weights for any peers present in the occupant list.
 *
 * @param student A single student's preferences (contains both activity[] and peer[]).
 * @param activityName The activity in which the student is currently placed.
 * @param occupantList Array of student IDs (excluding or including the student themself is fine,
 *                     as we only check if peer IDs appear in occupantList).
 * @returns A numeric happiness score.
 */
export function computeHappinessForStudent(
  student: StudentPreferences,
  activityName: string,
  occupantList: StudentPreferences[]
): {
  happiness: number;
  mutualHappiness: number;
} {
  let othersHedons = 0;
  let ownHedons = 0;
  // 1) Find the student's preference weight for the given activity
  const activityPref = student.activity.find(
    (a) => a.activity === activityName
  );
  const activityWeight = activityPref ? activityPref.weight : 0;

  // 2) Peer synergy: sum the weights for peers who are in occupantList
  let peerSum = 0;
  for (const p of student.peer) {
    if (p.weight <= 0) {
      continue;
    }
    // If p.peer is in occupantList, add p.weight
    let peer = occupantList.find((o) => o.identifier == p.peer);
    if (peer) {
      peerSum += p.weight;
      let peerPrefForMe = peer.peer.find((p) => p.peer == student.identifier);
      if (peerPrefForMe && peerPrefForMe.weight > 0) {
        peerSum += peerPrefForMe.weight;
      }
    }
  }

  return {
    happiness: activityWeight + peerSum,
    mutualHappiness: peerSum + activityWeight + peerSum,
  };
}
