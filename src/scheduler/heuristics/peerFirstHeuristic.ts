import type {
  StudentPreferences,
  Activity,
  Assignment,
  Schedule,
} from "../../types";

/**
 * Peer-first fallback approach:
 *
 * For each student:
 *   1) Sort the student's peer[] in descending weight.
 *   2) Try each peer in turn:
 *       - If that peer is ALREADY assigned to an activity that still has capacity, join them.
 *       - If successful, we're done. If not, continue checking the next peer.
 *   3) If no peer assignment was possible, fallback to the student's own activity[] preferences,
 *      from highest to lowest weight, assigning to the first one with an open spot.
 *   4) If no peer or activity preference is feasible, throw an error.
 *
 * NOTE: We do NOT attempt to assign unassigned peers. We only join assigned peers.
 * This keeps the logic simple and avoids recursion.
 */
export function assignByPeer(
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule {
  // Build a quick capacity usage map: activity -> usedCount
  const capacityMap = new Map<string, number>();
  for (const a of activities) {
    capacityMap.set(a.activity, 0);
  }

  // Track final assignment: student -> activity
  const assignedMap = new Map<string, string>();

  // Pre-sort each student's peer and activity arrays descending by weight
  for (const student of prefs) {
    student.peer.sort((a, b) => b.weight - a.weight);
    student.activity.sort((a, b) => b.weight - a.weight);
  }

  // Iterate students in the given order
  for (const student of prefs) {
    if (assignedMap.has(student.identifier)) {
      continue; // already assigned from some earlier step
    }

    let assigned = false;

    // 1) Try each peer preference, in descending weight
    for (const peerPref of student.peer) {
      const peerId = peerPref.peer;

      // We only join a peer if they've been assigned already
      if (!assignedMap.has(peerId)) {
        continue; // skip unassigned peer
      }

      const peerActivity = assignedMap.get(peerId)!;
      const used = capacityMap.get(peerActivity)!;
      const totalCap = activities.find(
        (a) => a.activity === peerActivity
      )!.capacity;
      if (used < totalCap) {
        // We can join the peer's activity
        assignedMap.set(student.identifier, peerActivity);
        capacityMap.set(peerActivity, used + 1);
        assigned = true;
        break;
      }
    }

    // 2) If not assigned by peer preference, fallback to own activity preferences
    if (!assigned) {
      for (const actPref of student.activity) {
        const actName = actPref.activity;
        if (!capacityMap.has(actName)) {
          throw new Error(`Unknown activity: ${actName}`);
        }
        const used = capacityMap.get(actName)!;
        const totalCap = activities.find(
          (a) => a.activity === actName
        )!.capacity;
        if (used < totalCap) {
          assignedMap.set(student.identifier, actName);
          capacityMap.set(actName, used + 1);
          assigned = true;
          break;
        }
      }

      // 3) If still not assigned, we have no valid peer or activity preference
      if (!assigned) {
        throw new Error(
          `No available activities for student: ${student.identifier}`
        );
      }
    }
  }

  // Convert assignedMap to array of { student, activity }
  const schedule: Assignment[] = [];
  for (const [student, activity] of assignedMap.entries()) {
    schedule.push({ student, activity });
  }
  return schedule;
}
