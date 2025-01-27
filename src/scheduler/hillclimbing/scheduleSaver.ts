import { Schedule, Activity, StudentPreferences } from "../../types";

/* Create a unique identifier for schedule. IDs should be unique to any given
schedule and not effected by the order of assignments in the schedule. */
export const scheduleToId = (
  schedule: Schedule,
  activities: Activity[]
): string => {
  ({ schedule, activities } = normalizeScheduleAndActivities(
    schedule,
    activities
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
  activities: Activity[]
) {
  schedule = schedule.slice();
  activities = activities.slice();
  // Sort the schedules and activities
  activities.sort((a, b) => a.activity.localeCompare(b.activity));
  schedule.sort((a, b) => a.student.localeCompare(b.student));
  return { schedule, activities };
}
