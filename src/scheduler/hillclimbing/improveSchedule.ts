
import type { Schedule, Activity, StudentPreferences, ScheduleInfo } from "../../types";
import { computeHappinessForStudent } from "../scoring/computeHappinessForStudent";


const getScheduleData = (schedule : Schedule, studentPreferences : StudentPreferences[]) : {
    rosters : Map<string, StudentPreferences[]>,
    assignments : Map<string, StudentPreferences>,
}=> {
    let rosters = new Map<string, StudentPreferences[]>();
    let assignments = new Map<string, StudentPreferences>();
    for (let s of schedule) {
        let sp = studentPreferences.find((p)=>p.identifier === s.student)!
        if (!rosters.has(s.activity)) {
            rosters.set(s.activity, []);
        }
        rosters.get(s.activity)!.push(sp);
        assignments.set(s.student, sp);
    }
    return {
        rosters,
        assignments
    }

}

const improveLeastHappyWithSwaps = (
    schedule: Schedule,
    studentPreferences: StudentPreferences[],
    activities: Activity[]
  ): { schedule: Schedule; improved: boolean } => {
    let data = getScheduleData(schedule, studentPreferences);
    let studentHappiness: {
      student: StudentPreferences;
      happiness: number;
      mutualHappiness: number;
    }[] = [];
  
    // Compute initial happiness for all students
    for (let activity in data.rosters) {
      let roster = data.rosters.get(activity)!;
      for (let student of roster) {
        studentHappiness.push({
          student: student,
          ...computeHappinessForStudent(student, activity, roster),
        });
      }
    }
  
    // Sort students by happiness (ascending)
    studentHappiness.sort((a, b) => a.happiness - b.happiness);
  
    // Iterate through the least-happy students
    for (let { student: unhappyStudent, happiness: unhappyOldHappiness } of studentHappiness) {
      const currentAssignment = schedule.find(
        (s) => s.student === unhappyStudent.identifier
      );
      const currentActivity = currentAssignment?.activity;
  
      let bestSwap = null;
      let bestDelta = 0;
  
      // Look at the student's preferred activities
      for (const pref of unhappyStudent.activity.sort(
        (a, b) => b.weight - a.weight
      )) {
        if (pref.activity === currentActivity) continue; // Skip the current activity
  
        const roster = data.rosters.get(pref.activity) || [];
        const capacity = activities.find(
          (a) => a.activity === pref.activity
        )?.capacity;
  
        // If the activity is not full, consider moving the student directly
        if (roster.length < capacity!) {
          const newHappiness = computeHappinessForStudent(
            unhappyStudent,
            pref.activity,
            roster
          ).happiness;
  
          const delta = newHappiness - unhappyOldHappiness;
          if (delta > bestDelta) {
            bestDelta = delta;
            bestSwap = { studentToMove: unhappyStudent, from: currentActivity, to: pref.activity };
          }
        } else {
          // If the activity is full, consider swapping with someone in the roster
          for (const otherStudentId of roster.map((s) => s.identifier)) {
            const otherStudent = studentPreferences.find(
              (p) => p.identifier === otherStudentId
            );
            if (!otherStudent) continue;
  
            // Compute new happiness values
            const unhappyNewHappiness = computeHappinessForStudent(
              unhappyStudent,
              pref.activity,
              roster
            ).happiness;
  
            const otherNewActivity = currentActivity || "Unassigned"; // UnhappyStudent's old spot
            const otherRoster = data.rosters.get(otherNewActivity) || [];
            const otherNewHappiness = computeHappinessForStudent(
              otherStudent,
              otherNewActivity,
              otherRoster
            ).happiness;
  
            const otherOldHappiness = computeHappinessForStudent(
              otherStudent,
              pref.activity,
              roster
            ).happiness;
  
            // Calculate net happiness change
            const delta =
              (unhappyNewHappiness - unhappyOldHappiness) +
              (otherNewHappiness - otherOldHappiness);
  
            if (delta > bestDelta) {
              bestDelta = delta;
              bestSwap = {
                studentToMove: unhappyStudent,
                from: currentActivity,
                to: pref.activity,
                swapWith: otherStudent,
              };
            }
          }
        }
      }
  
      // If we found a good swap, apply it and return the updated schedule
      if (bestSwap) {
        const { studentToMove, from, to, swapWith } = bestSwap;
  
        // Update the schedule
        schedule = schedule.map((assignment) => {
          if (assignment.student === studentToMove.identifier) {
            return { ...assignment, activity: to }; // Move unhappy student
          } else if (swapWith && assignment.student === swapWith.identifier) {
            return { ...assignment, activity: from || "Unassigned" }; // Swap peer
          }
          return assignment;
        });
  
        return { schedule, improved: true }; // Return immediately after improvement
      }
    }
  
    return { schedule, improved: false }; // No improvements possible
  };

export const improveSchedule = (schedule, studentPreferences: StudentPreferences[], activities: Activity[], maxIterations = 50) => {
    let {schedule : newSchedule, improved} = improveLeastHappyWithSwaps(schedule, studentPreferences, activities);
    let iterations = 1;
    schedule = newSchedule;
    while (improved && iterations < maxIterations) {        
        ({schedule : newSchedule, improved} = improveLeastHappyWithSwaps(schedule, studentPreferences, activities));
        schedule = newSchedule;
        iterations++;
    }
    return schedule;
}