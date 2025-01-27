import type {
  StudentPreferences,
  Activity,
  Assignment,
  Schedule,
} from "../../types";

export const assignByActivity = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  const activityMap = new Map<string, number>();
  const assignments: Assignment[] = [];
  const activityRosters = new Map<string, Set<string>>();
  for (const { activity } of activities) {
    activityMap.set(activity, 0);
  }
  for (const pref of prefs) {
    const preferredActivities = pref.activity.sort(
      (a, b) => b.weight - a.weight
    );
    let assigned = false;
    for (const { activity } of preferredActivities) {
      if (!activityMap.has(activity)) {
        throw new Error(`Unknown activity: ${activity}`);
      }
      const count = activityMap.get(activity) as number;
      const capacity = activities.find(
        (a) => a.activity === activity
      )!.capacity;
      if (count < capacity) {
        assignments.push({ activity, student: pref.identifier });
        activityMap.set(activity, count + 1);
        if (!activityRosters.has(activity)) {
          activityRosters.set(activity, new Set());
        }
        activityRosters.get(activity)!.add(pref.identifier);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      throw new Error(
        `No available activities for student: ${pref.identifier}`
      );
    }
  }
  return assignments;
};
