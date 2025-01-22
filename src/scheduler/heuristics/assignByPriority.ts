import type {
    Activity,
    StudentPreferences,
    Schedule,
    Assignment
  } from "../../types";
  
  /**
   * Assign by priority:
   * 1. Build a combined list of (student, preferenceType, target, weight)
   *    - e.g. (studentX, 'activity', 'ActivityA', 12)
   *    - or   (studentX, 'peer', 'studentY', 10)
   * 2. Sort descending by weight (highest first).
   * 3. Iterate over preferences in that order:
   *    - If student is already assigned, skip.
   *    - If it's an 'activity' preference, check capacity; assign if possible.
   *    - If it's a 'peer' preference, see if that peer is assigned to an activity
   *      that still has capacity for this student. If yes, join. Otherwise skip.
   * 4. At the end, if any student is unassigned => throw an error
   *    (or handle it as you prefer).
   */
  export function assignByPriority(
    prefs: StudentPreferences[],
    activities: Activity[]
  ): Schedule {
    // 1) Prepare a quick capacity usage map
    const capacityMap = new Map<string, number>();
    for (const { activity, capacity } of activities) {
      capacityMap.set(activity, 0);
    }
  
    // 2) Track final assignment
    //    (student -> activity)
    const assignedMap = new Map<string, string>();
  
    // 3) Build a combined list of preferences
    //    Each item is { student, type, target, weight }
    type CombinedPreference = {
      student: string;
      type: "activity" | "peer";
      target: string;   // activity name OR peer ID
      weight: number;
    };
  
    const combinedPrefs: CombinedPreference[] = [];
  
    // Gather from each student
    for (const student of prefs) {
      // Add activity preferences
      for (const actPref of student.activity) {
        combinedPrefs.push({
          student: student.identifier,
          type: "activity",
          target: actPref.activity,
          weight: actPref.weight,
        });
      }
      // Add peer preferences
      for (const peerPref of student.peer) {
        combinedPrefs.push({
          student: student.identifier,
          type: "peer",
          target: peerPref.peer,
          weight: peerPref.weight,
        });
      }
    }
  
    // Sort combined list by descending weight
    combinedPrefs.sort((a, b) => b.weight - a.weight);
  
    // 4) Iterate in that sorted order
    for (const prefItem of combinedPrefs) {
      const { student, type, target } = prefItem;
  
      // If student is already assigned, skip
      if (assignedMap.has(student)) {
        continue;
      }
  
      if (type === "activity") {
        // Attempt to assign to that activity if capacity remains
        if (!capacityMap.has(target)) {
          throw new Error(`Unknown activity: ${target}`);
        }
        const used = capacityMap.get(target)!;
        const totalCap = activities.find(a => a.activity === target)!.capacity;
        if (used < totalCap) {
          // Assign
          assignedMap.set(student, target);
          capacityMap.set(target, used + 1);
        }
        // If it's full, we do nothing (skip)
      } else {
        // type === "peer"
        // We only join a peer's activity if that peer is already assigned
        if (!assignedMap.has(target)) {
          // Peer not assigned => skip
          continue;
        }
        const peerActivity = assignedMap.get(target)!;
        // check capacity
        const used = capacityMap.get(peerActivity)!;
        const totalCap = activities.find(a => a.activity === peerActivity)!.capacity;
        if (used < totalCap) {
          // Assign
          assignedMap.set(student, peerActivity);
          capacityMap.set(peerActivity, used + 1);
        }
        // else skip if it's full
      }
    }
  
    // 5) Verify all students assigned or throw error
    for (const student of prefs) {
      if (!assignedMap.has(student.identifier)) {
        throw new Error(`No available assignment for student: ${student.identifier}`);
      }
    }
  
    // 6) Convert assignedMap to array of { student, activity }
    const result: Assignment[] = [];
    for (const [s, a] of assignedMap.entries()) {
      result.push({ student: s, activity: a });
    }
    return result;
  }