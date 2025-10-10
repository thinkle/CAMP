import type {
  Schedule,
  Activity,
  StudentPreferences,
  Assignment,
} from "../../types";

/**
 * Heals a schedule by fixing activities that are below their minimum size.
 *
 * Strategy:
 * 1. Identify activities below minimum size
 * 2. For each undersized activity:
 *    a. Try to recruit students from other activities (who prefer this one)
 *    b. If can't recruit enough, redistribute its students to their next preferences
 * 3. Repeat until all activities meet minimum or we can't make progress
 *
 * @param schedule - The schedule to heal
 * @param prefs - Student preferences
 * @param activities - Activity definitions with minSize
 * @param maxIterations - Maximum healing iterations to prevent infinite loops
 * @returns Healed schedule, or null if impossible to heal
 */
export function healMinimumSize(
  schedule: Schedule,
  prefs: StudentPreferences[],
  activities: Activity[],
  maxIterations: number = 10
): Schedule | null {
  let currentSchedule = [...schedule];
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Build current state
    const activityCounts = new Map<string, number>();
    const activityRosters = new Map<string, Set<string>>();
    const studentAssignments = new Map<string, string>();

    for (const activity of activities) {
      activityCounts.set(activity.activity, 0);
      activityRosters.set(activity.activity, new Set());
    }

    for (const assignment of currentSchedule) {
      const count = activityCounts.get(assignment.activity) || 0;
      activityCounts.set(assignment.activity, count + 1);
      activityRosters.get(assignment.activity)!.add(assignment.student);
      studentAssignments.set(assignment.student, assignment.activity);
    }

    // Find activities below minimum
    const undersizedActivities = activities
      .filter((a) => {
        const count = activityCounts.get(a.activity) || 0;
        return a.minSize && count > 0 && count < a.minSize;
      })
      .sort((a, b) => {
        // Sort by how far below minimum (worst first)
        const aDeficit = a.minSize! - (activityCounts.get(a.activity) || 0);
        const bDeficit = b.minSize! - (activityCounts.get(b.activity) || 0);
        return bDeficit - aDeficit;
      });

    if (undersizedActivities.length === 0) {
      // Success! All activities meet minimum
      return currentSchedule;
    }

    let madeProgress = false;

    for (const undersizedActivity of undersizedActivities) {
      const currentCount = activityCounts.get(undersizedActivity.activity) || 0;
      const deficit = undersizedActivity.minSize! - currentCount;

      // Strategy 1: Try to recruit students who prefer this activity (or don't mind)
      let recruited = tryRecruitStudents(
        undersizedActivity,
        deficit,
        prefs,
        activities,
        studentAssignments,
        activityCounts,
        activityRosters,
        false // onlyPreferred - first try with preferred/equal students only
      );

      // If we recruited enough, we made progress
      if (recruited >= deficit) {
        currentSchedule = Array.from(studentAssignments.entries()).map(
          ([student, activity]) => ({ student, activity })
        );
        madeProgress = true;
        break; // Restart with updated schedule
      }

      // If we recruited some but not enough, update and try again next iteration
      if (recruited > 0) {
        currentSchedule = Array.from(studentAssignments.entries()).map(
          ([student, activity]) => ({ student, activity })
        );
        madeProgress = true;
        break; // Restart with updated schedule
      }

      // Strategy 2: If we couldn't recruit anyone with preferences, try disbanding
      const disbandSuccess = disbandActivity(
        undersizedActivity,
        prefs,
        activities,
        studentAssignments,
        activityCounts,
        activityRosters
      );

      if (disbandSuccess) {
        currentSchedule = Array.from(studentAssignments.entries()).map(
          ([student, activity]) => ({ student, activity })
        );
        madeProgress = true;
        break; // Restart with updated schedule
      }

      // Strategy 3: Last resort - force recruit anyone (even if they lose preference)
      // This is better than returning null and giving up entirely
      recruited = tryRecruitStudents(
        undersizedActivity,
        deficit,
        prefs,
        activities,
        studentAssignments,
        activityCounts,
        activityRosters,
        true // allowAnyStudent - recruit even if they prefer current activity
      );

      if (recruited >= deficit) {
        currentSchedule = Array.from(studentAssignments.entries()).map(
          ([student, activity]) => ({ student, activity })
        );
        madeProgress = true;
        break; // Restart with updated schedule
      }

      // If forced recruitment got us some progress, take it
      if (recruited > 0) {
        currentSchedule = Array.from(studentAssignments.entries()).map(
          ([student, activity]) => ({ student, activity })
        );
        madeProgress = true;
        break; // Restart with updated schedule
      }
    }

    if (!madeProgress) {
      // Can't heal this schedule
      return null;
    }
  }

  // Exceeded max iterations
  return null;
}

/**
 * Try to recruit students to an undersized activity from other activities
 * @param allowAnyStudent - If false, only recruit students who prefer target or are neutral (improvement >= 0)
 *                          If true, recruit anyone (even if they lose preference - last resort)
 * Returns the number of students successfully recruited
 */
function tryRecruitStudents(
  targetActivity: Activity,
  needed: number,
  prefs: StudentPreferences[],
  activities: Activity[],
  studentAssignments: Map<string, string>,
  activityCounts: Map<string, number>,
  activityRosters: Map<string, Set<string>>,
  allowAnyStudent: boolean = false
): number {
  let recruited = 0;

  // Get the roster of the target activity to check for peers
  const targetRoster =
    activityRosters.get(targetActivity.activity) || new Set();

  // Find students who could move to this activity
  const candidates = prefs
    .filter((pref) => {
      const currentActivity = studentAssignments.get(pref.identifier);
      if (!currentActivity || currentActivity === targetActivity.activity) {
        return false;
      }

      // Calculate potential score improvement
      const targetActivityWeight =
        pref.activity.find((a) => a.activity === targetActivity.activity)
          ?.weight || 0;
      const currentActivityWeight =
        pref.activity.find((a) => a.activity === currentActivity)?.weight || 0;

      // Calculate peer score in target activity
      let targetPeerScore = 0;
      for (const peerPref of pref.peer) {
        if (targetRoster.has(peerPref.peer)) {
          targetPeerScore += peerPref.weight;
        }
      }

      // Calculate peer score in current activity
      const currentRoster = activityRosters.get(currentActivity) || new Set();
      let currentPeerScore = 0;
      for (const peerPref of pref.peer) {
        if (currentRoster.has(peerPref.peer)) {
          currentPeerScore += peerPref.weight;
        }
      }

      // Total improvement considering both activity and peer preferences
      const improvement =
        targetActivityWeight +
        targetPeerScore -
        (currentActivityWeight + currentPeerScore);

      // If allowAnyStudent is true, accept anyone (last resort healing)
      // Otherwise only accept students who don't lose score (improvement >= 0)
      return allowAnyStudent || improvement >= 0;
    })
    .map((pref) => {
      const currentActivity = studentAssignments.get(pref.identifier)!;
      const targetActivityWeight =
        pref.activity.find((a) => a.activity === targetActivity.activity)
          ?.weight || 0;
      const currentActivityWeight =
        pref.activity.find((a) => a.activity === currentActivity)?.weight || 0;

      // Calculate peer scores
      let targetPeerScore = 0;
      for (const peerPref of pref.peer) {
        if (targetRoster.has(peerPref.peer)) {
          targetPeerScore += peerPref.weight;
        }
      }

      const currentRoster = activityRosters.get(currentActivity) || new Set();
      let currentPeerScore = 0;
      for (const peerPref of pref.peer) {
        if (currentRoster.has(peerPref.peer)) {
          currentPeerScore += peerPref.weight;
        }
      }

      const improvement =
        targetActivityWeight +
        targetPeerScore -
        (currentActivityWeight + currentPeerScore);

      return {
        student: pref.identifier,
        currentActivity,
        improvement,
        targetActivityWeight,
        targetPeerScore,
        currentActivityWeight,
        currentPeerScore,
      };
    })
    .sort((a, b) => b.improvement - a.improvement); // Best improvement first

  for (const candidate of candidates) {
    if (recruited >= needed) break;

    const sourceActivity = activities.find(
      (a) => a.activity === candidate.currentActivity
    )!;
    const sourceCount = activityCounts.get(candidate.currentActivity) || 0;
    const targetCount = activityCounts.get(targetActivity.activity) || 0;

    // Can we move this student without breaking source activity's minimum?
    const sourceMinSize = sourceActivity.minSize || 0;
    if (sourceCount - 1 < sourceMinSize) {
      continue; // Would break source activity
    }

    // Can we fit in target activity?
    if (targetCount + 1 > targetActivity.capacity) {
      continue; // Would exceed capacity
    }

    // Move the student
    studentAssignments.set(candidate.student, targetActivity.activity);
    activityCounts.set(candidate.currentActivity, sourceCount - 1);
    activityCounts.set(targetActivity.activity, targetCount + 1);
    activityRosters.get(candidate.currentActivity)!.delete(candidate.student);
    activityRosters.get(targetActivity.activity)!.add(candidate.student);
    recruited++;
  }

  return recruited;
}

/**
 * Disband an undersized activity by moving all its students to their next best preferences
 * Returns true if successful, false if impossible
 *
 * IMPORTANT: Only moves students to activities that are either:
 * - Already at or above their minimum (safe to add to)
 * - Have no minimum requirement
 * This prevents creating a cascade of new undersized activities
 */
function disbandActivity(
  activityToDisband: Activity,
  prefs: StudentPreferences[],
  activities: Activity[],
  studentAssignments: Map<string, string>,
  activityCounts: Map<string, number>,
  activityRosters: Map<string, Set<string>>
): boolean {
  const studentsToReassign = Array.from(
    activityRosters.get(activityToDisband.activity) || []
  );

  // Try to reassign each student
  for (const studentId of studentsToReassign) {
    const studentPref = prefs.find((p) => p.identifier === studentId);
    if (!studentPref) continue;

    // Find next best activity that has space and won't create new problems
    const sortedActivities = studentPref.activity
      .filter((a) => a.activity !== activityToDisband.activity)
      .sort((a, b) => b.weight - a.weight);

    let reassigned = false;
    for (const activityPref of sortedActivities) {
      const targetActivity = activities.find(
        (a) => a.activity === activityPref.activity
      );
      if (!targetActivity) continue;

      const currentCount = activityCounts.get(activityPref.activity) || 0;
      const minSize = targetActivity.minSize || 0;

      // Only assign to activities that:
      // 1. Have space
      // 2. Are either already at/above minimum OR have no minimum OR are empty (0 students)
      // Empty activities (0) are safe targets - they're not "undersized", just waiting for students
      // Undersized means having SOME students but below minimum
      const isSafeTarget =
        currentCount === 0 || currentCount >= minSize || minSize === 0;

      if (currentCount < targetActivity.capacity && isSafeTarget) {
        // Move student
        studentAssignments.set(studentId, activityPref.activity);
        activityCounts.set(activityPref.activity, currentCount + 1);
        activityRosters.get(activityPref.activity)!.add(studentId);
        reassigned = true;
        break;
      }
    }

    if (!reassigned) {
      // Can't reassign this student - healing failed
      return false;
    }
  }

  // Successfully reassigned everyone - remove the activity
  activityCounts.set(activityToDisband.activity, 0);
  activityRosters.get(activityToDisband.activity)!.clear();

  return true;
}
