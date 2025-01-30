import type { StudentPreferences, Activity, Schedule } from "../../types";
export function assignByMostConstrained(
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule {
  let scheduleMap = new Map<string, string>();
  let activityData = {};
  for (let activity of activities) {
    let data: {
      capacity: number;
      requestCount: number;
      rawPriorityScore: number;
      peerPriorityScore: number;
      totalPriorityScore: number;
      requesters: StudentPreferences[];
      assigned: number;
    } = {
      capacity: activity.capacity,
      requestCount: 0,
      rawPriorityScore: 0,
      peerPriorityScore: 0,
      requesters: [],
      assigned: 0,
      totalPriorityScore: 0,
    };
    activityData[activity.activity] = data;

    // first pass, collect the requests
    for (let pref of prefs) {
      let activityPref = pref.activity.find(
        (a) => a.activity === activity.activity
      );
      if (activityPref) {
        data.requestCount++;
        data.requesters.push(pref);
        data.rawPriorityScore += activityPref.weight;
      }
    }
    // second pass, calculate the priority score based on
    // (A) activity score itself (B) preferred peers who *also* requested this
    for (let pref of data.requesters) {
      let activityPref = pref.activity.find(
        (a) => a.activity === activity.activity
      )!;
      for (let peerPref of pref.peer) {
        if (data.requesters.find((p) => p.identifier == peerPref.peer)) {
          data.peerPriorityScore += peerPref.weight;
          activityPref.peerWeight += peerPref.weight; // add peer weight to activity score
        }
      }
    }
    // Sort requesters from highest to lowest priority
    data.requesters.sort((a, b) => {
      let aPref = a.activity.find((p) => p.activity === activity.activity)!;
      let bPref = b.activity.find((p) => p.activity === activity.activity)!;
      // Add peer priority to the activity score
      return (
        (bPref.weight + bPref.activityWeight || 0) -
        (aPref.weight + aPref.activityWeight || 0)
      );
    });
    data.totalPriorityScore =
      data.rawPriorityScore + data.peerPriorityScore / 3;
  }
  // Done collecting metadata, now sort by priority
  let sortedActivities = Object.keys(activityData).sort(
    (a, b) =>
      activityData[b].totalPriorityScore / activityData[b].capacity -
      activityData[a].totalPriorityScore / activityData[a].capacity
  );

  for (let activity of sortedActivities) {
    let data = activityData[activity];
    let assignedCount = 0;
    for (let pref of data.requesters) {
      if (assignedCount >= data.capacity) {
        break;
      }
      let activityPref = pref.activity.find((a) => a.activity === activity)!;
      if (scheduleMap.has(pref.identifier)) {
        continue;
      }
      scheduleMap.set(pref.identifier, activity);
      assignedCount++;
    }
  }
  // Now we need to make sure all students are assigned...
  for (let pref of prefs) {
    if (!scheduleMap.has(pref.identifier)) {
      let assigned = false;
      for (let activityPref of pref.activity) {
        let data = activityData[activityPref.activity];
        if (data.assigned < data.capacity) {
          scheduleMap.set(pref.identifier, activityPref.activity);
          data.assigned++;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        throw new Error("Could not assign student");
      }
    }
  }
  let schedule: Schedule = [];
  scheduleMap.forEach((activity, student) =>
    schedule.push({ student, activity })
  );

  return schedule;
}
