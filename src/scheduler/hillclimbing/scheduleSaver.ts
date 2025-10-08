import { Schedule, Activity, StudentPreferences } from "../../types";

/* Create a unique identifier for schedule. IDs should be unique to any given
schedule and not effected by the order of assignments in the schedule. 
In peer-only mode, the ID should also be invariant to activity permutations
(swapping which group goes to which activity) since activities are just containers. */
export const scheduleToId = (
  schedule: Schedule,
  activities: Activity[],
  isPeerOnlyMode: boolean = false
): string => {
  ({ schedule, activities } = normalizeScheduleAndActivities(
    schedule,
    activities,
    isPeerOnlyMode
  ));
  // Now that we have the schedule in a standard order, we can just map
  // numbers...
  const scheduleArray = schedule.map((s) =>
    activities.findIndex((a) => a.activity === s.activity)
  );
  return btoa(JSON.stringify(scheduleArray));
};

/* Generate a schedule from a unique ID. We need studentPreferences to give us our
student list and we need activities to give us our activities list. */
export const idToSchedule = (
  id: string,
  studentPreferences: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  let schedule = studentPreferences.map((s) => ({
    student: s.identifier,
    activity: "",
  }));
  ({ schedule, activities } = normalizeScheduleAndActivities(
    schedule,
    activities
  ));
  const scheduleArray = JSON.parse(atob(id));
  if (scheduleArray.length !== schedule.length) {
    throw new Error(
      `Invalid schedule ID: ${id}, expected ${schedule.length} activities and got ${scheduleArray.length}`
    );
  }
  scheduleArray.forEach((s, i) => {
    schedule[i].activity = activities[s].activity;
  });
  return schedule;
};

function normalizeScheduleAndActivities(
  schedule: Schedule,
  activities: Activity[],
  isPeerOnlyMode: boolean = false
) {
  schedule = schedule.slice();
  activities = activities.slice();

  if (isPeerOnlyMode) {
    // In peer-only mode, create a canonical form that's invariant to activity permutations
    // BUT only within activities of the same capacity (since capacity matters)

    // Group students by activity
    const activityGroups = new Map<string, string[]>();
    for (const assignment of schedule) {
      if (!activityGroups.has(assignment.activity)) {
        activityGroups.set(assignment.activity, []);
      }
      activityGroups.get(assignment.activity)!.push(assignment.student);
    }

    // Sort students within each group
    activityGroups.forEach((students) => {
      students.sort();
    });

    // Group activities by capacity
    const activitiesByCapacity = new Map<number, Activity[]>();
    for (const activity of activities) {
      if (!activitiesByCapacity.has(activity.capacity)) {
        activitiesByCapacity.set(activity.capacity, []);
      }
      activitiesByCapacity.get(activity.capacity)!.push(activity);
    }

    // Sort activities within each capacity tier alphabetically
    activitiesByCapacity.forEach((acts) => {
      acts.sort((a, b) => a.activity.localeCompare(b.activity));
    });

    // Build new schedule by capacity tier
    schedule = [];
    const sortedCapacities = Array.from(activitiesByCapacity.keys()).sort(
      (a, b) => a - b
    );

    for (const capacity of sortedCapacities) {
      const activitiesInTier = activitiesByCapacity.get(capacity)!;

      // Get groups assigned to activities in this tier and sort canonically by first member
      const groupsInTier = activitiesInTier
        .filter((a) => activityGroups.has(a.activity))
        .map((a) => ({
          activity: a.activity,
          students: activityGroups.get(a.activity)!,
        }))
        .sort((a, b) => a.students[0].localeCompare(b.students[0]));

      // Reassign canonically sorted groups to alphabetically sorted activities in this tier
      for (let i = 0; i < groupsInTier.length; i++) {
        const activity = activitiesInTier[i].activity;
        for (const student of groupsInTier[i].students) {
          schedule.push({ student, activity });
        }
      }
    }

    // Re-sort activities and schedule for consistent output
    activities.sort((a, b) => a.activity.localeCompare(b.activity));
    schedule.sort((a, b) => a.student.localeCompare(b.student));
  } else {
    // Standard mode: activities have meaning, just sort both
    activities.sort((a, b) => a.activity.localeCompare(b.activity));
    schedule.sort((a, b) => a.student.localeCompare(b.student));
  }

  return { schedule, activities };
}
