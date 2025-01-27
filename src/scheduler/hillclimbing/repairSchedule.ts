import { Activity, Schedule, StudentPreferences } from "../../types";
import { computeHappinessForStudent } from "../scoring/computeHappinessForStudent";

/**
 * Repair an invalid schedule by:
 * 1. Building occupant sets for each activity.
 * 2. For each over-capacity roster, sort occupants by ascending happiness
 *    and attempt to move them out, in order, until the roster is no longer overflowing.
 * 3. If we can't fix the overflow, throw an error.
 * 4. Finally, ensure any unassigned students are assigned via fallback.
 */
export function repairSchedule(
  schedule: Schedule,
  preferences: StudentPreferences[],
  activities: Activity[]
): Schedule {
  // Quick references
  const prefsMap = new Map<string, StudentPreferences>();
  for (const s of preferences) {
    prefsMap.set(s.identifier, s);
  }

  const capacityMap = new Map<string, number>();
  const occupantMap = new Map<string, Set<string>>();
  for (const a of activities) {
    capacityMap.set(a.activity, a.capacity);
    occupantMap.set(a.activity, new Set());
  }

  // Populate occupantMap from the existing schedule
  for (const { student, activity } of schedule) {
    if (!occupantMap.has(activity)) {
      throw new Error(`Unknown activity: ${activity}`);
    }
    occupantMap.get(activity)!.add(student);
  }

  // Helper: find the activity a student currently occupies
  function findActivityOfStudent(studentId: string): string | null {
    for (const [actName, setOfStudents] of occupantMap.entries()) {
      if (setOfStudents.has(studentId)) {
        return actName;
      }
    }
    return null;
  }

  // Helper: remove occupant from occupantMap
  function removeOccupant(studentId: string, fromActivity: string) {
    occupantMap.get(fromActivity)?.delete(studentId);
  }

  // Helper: try reassigning a single occupant with your fallback approach
  // 1) Attempt top activity prefs
  // 2) If none, attempt following a peer's activity
  // 3) Return true if success
  function tryReassignOccupant(studentId: string): boolean {
    const pref = prefsMap.get(studentId);
    if (!pref) return false;

    // Sort activity preferences by descending weight
    const sortedActivities = [...pref.activity].sort(
      (a, b) => b.weight - a.weight
    );
    for (const { activity } of sortedActivities) {
      const cap = capacityMap.get(activity)!;
      if (occupantMap.get(activity)!.size < cap) {
        occupantMap.get(activity)!.add(studentId);
        return true;
      }
    }

    // Next, try peer-based approach
    // Sort peers by descending weight
    const sortedPeers = [...pref.peer].sort((a, b) => b.weight - a.weight);
    for (const p of sortedPeers) {
      const peerActivity = findActivityOfStudent(p.peer);
      if (!peerActivity) continue; // that peer isn't assigned
      if (
        occupantMap.get(peerActivity)!.size < capacityMap.get(peerActivity)!
      ) {
        occupantMap.get(peerActivity)!.add(studentId);
        return true;
      }
    }

    return false;
  }

  // Core logic: For each activity that's over capacity, we do one pass
  for (const { activity, capacity } of activities) {
    const occupantSet = occupantMap.get(activity)!;
    if (occupantSet.size <= capacity) continue; // not overflowing

    // Build occupant array
    const occupantArray = [...occupantSet];

    // For synergy calc, we need occupantList as a StudentPreferences[] for all in occupantSet
    const occupantPrefsList = occupantArray
      .map((sId) => prefsMap.get(sId)!)
      .filter(Boolean);

    // 1) Compute happiness for each occupant in that activity
    const occupantScores = occupantArray.map((studentId) => {
      const studentPref = prefsMap.get(studentId)!;
      const { happiness, mutualHappiness } = computeHappinessForStudent(
        studentPref,
        activity,
        occupantPrefsList
      );
      return { studentId, happiness, mutualHappiness };
    });

    // 2) Sort ascending by "happiness" so the "least happy" occupant is first
    occupantScores.sort((a, b) => a.mutualHappiness - b.mutualHappiness);

    // 3) Attempt removing them one by one until occupantSet.size <= capacity
    let i = 0;
    while (occupantSet.size > capacity && i < occupantScores.length) {
      const occupant = occupantScores[i];
      i++;

      // Remove occupant from this activity
      removeOccupant(occupant.studentId, activity);

      // Attempt to reassign
      const success = tryReassignOccupant(occupant.studentId);
      if (!success) {
        // If reassign fails, put them back in this activity
        occupantSet.add(occupant.studentId);
      }
    }

    // After going through occupantScores, if occupantSet is still > capacity => no fix
    if (occupantSet.size > capacity) {
      throw new Error(
        `Cannot fix overflow in activity ${activity} - 
         no occupant is willing (or able) to move.`
      );
    }
  }

  // Now we might have unassigned students if they'd never appeared in schedule or
  // if they got removed but not placed
  const assignedStudents = new Set<string>();
  for (const [actName, occupantSet] of occupantMap.entries()) {
    for (const sid of occupantSet) {
      assignedStudents.add(sid);
    }
  }
  const unassigned = preferences.filter(
    (p) => !assignedStudents.has(p.identifier)
  );

  // Attempt to place unassigned via fallback
  for (const st of unassigned) {
    const success = tryReassignOccupant(st.identifier);
    if (!success) {
      throw new Error(`No available activities for student: ${st.identifier}`);
    }
  }

  // Finally, rebuild the schedule
  const repaired: Schedule = [];
  for (const [actName, occupantSet] of occupantMap.entries()) {
    for (const studentId of occupantSet) {
      repaired.push({ student: studentId, activity: actName });
    }
  }

  return repaired;
}
