
import type { Schedule, Activity, StudentPreferences, ScheduleInfo } from "../../types";
import { computeHappinessForStudent } from "../scoring/computeHappinessForStudent";
import { scoreSchedule } from "../scoring/scoreSchedule";


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
  const currentScore = scoreSchedule(schedule, studentPreferences);
  let data = getScheduleData(schedule, studentPreferences);

  // Sort students by happiness (ascending)
  let studentHappiness: {
    student: StudentPreferences;
    happiness: number;
    mutualHappiness: number;
  }[] = [];
  data.rosters.forEach((roster, activity) => {
    for (let student of roster) {
      const happinessData = computeHappinessForStudent(student, activity, roster);
      studentHappiness.push({
        student: student,
        ...happinessData,
      });
    }
  });
  studentHappiness.sort((a, b) => a.happiness - b.happiness);

  // Iterate through the least-happy students
  for (let { student: unhappyStudent } of studentHappiness) {
    const currentAssignment = schedule.find(
      (s) => s.student === unhappyStudent.identifier
    );
    const currentActivity = currentAssignment?.activity;

    // Try direct moves first
    for (const pref of unhappyStudent.activity.sort(
      (a, b) => b.weight - a.weight
    )) {
      if (pref.activity === currentActivity) continue; // Skip current activity

      const roster = data.rosters.get(pref.activity) || [];
      const capacity = activities.find(
        (a) => a.activity === pref.activity
      )?.capacity;

      if (roster.length < capacity!) {
        // Apply direct move
        const newSchedule = schedule.map((assignment) =>
          assignment.student === unhappyStudent.identifier
            ? { ...assignment, activity: pref.activity }
            : assignment
        );

        const newScore = scoreSchedule(newSchedule, studentPreferences);
        if (newScore > currentScore) {
          return { schedule: newSchedule, improved: true };
        }
      }
    }

    // Try swaps if moves aren't possible
    for (const pref of unhappyStudent.activity.sort(
      (a, b) => b.weight - a.weight
    )) {
      const roster = data.rosters.get(pref.activity) || [];
      if (roster.length < (activities.find((a) => a.activity === pref.activity)?.capacity || 0)) {
        continue; // Skip if not full
      }

      for (const otherStudentId of roster.map((s) => s.identifier)) {
        const otherStudent = studentPreferences.find(
          (p) => p.identifier === otherStudentId
        );
        if (!otherStudent) continue;

        // Simulate the swap
        const newSchedule = schedule.map((assignment) => {
          if (assignment.student === unhappyStudent.identifier) {
            return { ...assignment, activity: pref.activity };
          }
          if (assignment.student === otherStudent.identifier) {
            return { ...assignment, activity: currentActivity || "Unassigned" };
          }
          return assignment;
        });

        const newScore = scoreSchedule(newSchedule, studentPreferences);
        if (newScore > currentScore) {
          return { schedule: newSchedule, improved: true };
        }
      }
    }
  }

  // No improvements found
  return { schedule, improved: false };
};


const mutateSchedule = (schedule: Schedule, studentPreferences: StudentPreferences[], activities: Activity[]) : Schedule => {
   let nmutations = Math.ceil(Math.max(1, (schedule.length * (.10  + Math.random() * 0.1))));
   let output = schedule.slice();
   console.log('Adding ', nmutations, 'mutations');
   for (let i=0; i<nmutations; i++) {      
      let toMutate = Math.floor(Math.random() * schedule.length);
      let currentAssignment = schedule[toMutate];
      let student = studentPreferences.find((s)=>s.identifier === currentAssignment.student)!;
      let currentActivity = currentAssignment.activity;
      let options = student.activity.filter((a)=>a.activity !== currentActivity);
      if (options.length === 0) {
          continue;
      }
      let newActivity = options[Math.floor(Math.random() * options.length)].activity;
      let roster = schedule.filter((a)=>a.activity === newActivity);
      let capacity = activities.find((a)=>a.activity === newActivity)!.capacity;
      if (roster.length < capacity) {
          // Just add us then
          output[toMutate] = {...currentAssignment, activity : newActivity};
      } else {
        // Otherwise swap us
        let swapWith = roster[Math.floor(Math.random() * roster.length)];
        output[toMutate] = {...currentAssignment, activity : newActivity};
        output[output.indexOf(swapWith)] = {...swapWith, activity : currentActivity};
      }      
   }   
   return schedule;
}

export const improveSchedule = (schedule, studentPreferences: StudentPreferences[], activities: Activity[], maxIterations = 10) : Schedule => {
    let {schedule : newSchedule, improved} = improveLeastHappyWithSwaps(schedule, studentPreferences, activities);
    let iterations = 1;
    schedule = newSchedule;
    while (improved && iterations < maxIterations) {                
        ({schedule : newSchedule, improved} = improveLeastHappyWithSwaps(schedule, studentPreferences, activities));
        if (!improved) {
          console.log("Stuck, let's mutate");
          newSchedule = mutateSchedule(schedule, studentPreferences, activities);
          ({schedule: newSchedule, improved} = improveLeastHappyWithSwaps(newSchedule, studentPreferences, activities));
        }
        schedule = newSchedule;
        iterations++;
    }
    return schedule;
}