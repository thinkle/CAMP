import type {
  Schedule,
  Activity,
  StudentPreferences,
  ScheduleInfo,
  ScoringOptions,
} from "../../types";
import { DEFAULT_SCORING_OPTIONS } from "../../types";
import { computeHappinessForStudent } from "../scoring/computeHappinessForStudent";
import { scoreSchedule, validateSchedule } from "../scoring/scoreSchedule";
import { getCohorts } from "../heuristics/assignByCohorts";

const getScheduleData = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[]
): {
  rosters: Map<string, StudentPreferences[]>;
  assignments: Map<string, StudentPreferences>;
} => {
  let rosters = new Map<string, StudentPreferences[]>();
  let assignments = new Map<string, StudentPreferences>();
  for (let s of schedule) {
    let sp = studentPreferences.find((p) => p.identifier === s.student)!;
    if (!rosters.has(s.activity)) {
      rosters.set(s.activity, []);
    }
    rosters.get(s.activity)!.push(sp);
    assignments.set(s.student, sp);
  }
  return {
    rosters,
    assignments,
  };
};

export const improveLeastHappyWithSwaps = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions
): { schedule: Schedule; improved: boolean } => {
  const currentScore = scoreSchedule(
    schedule,
    studentPreferences,
    scoringOptions
  );
  let data = getScheduleData(schedule, studentPreferences);

  // Sort students by happiness (ascending)
  let studentHappiness: {
    student: StudentPreferences;
    happiness: number;
    mutualHappiness: number;
  }[] = [];
  data.rosters.forEach((roster, activity) => {
    for (let student of roster) {
      const happinessData = computeHappinessForStudent(
        student,
        activity,
        roster
      );
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
      if (capacity === undefined) {
        continue;
      }
      if (roster.length < capacity) {
        // Apply direct move
        const newSchedule = schedule.map((assignment) =>
          assignment.student === unhappyStudent.identifier
            ? { ...assignment, activity: pref.activity }
            : assignment
        );

        const newScore = scoreSchedule(
          newSchedule,
          studentPreferences,
          scoringOptions
        );
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
      const capacity = activities.find(
        (a) => a.activity === pref.activity
      )?.capacity;
      if (capacity === undefined || roster.length < capacity) {
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

        const newScore = scoreSchedule(
          newSchedule,
          studentPreferences,
          scoringOptions
        );
        if (newScore > currentScore) {
          return { schedule: newSchedule, improved: true };
        }
      }
    }
  }

  // No improvements found
  return { schedule, improved: false };
};

export const mutateSchedule = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  let nmutations = Math.ceil(
    Math.max(1, schedule.length * (0.05 + Math.random() * 0.1))
  );
  let output = schedule.slice();
  for (let i = 0; i < nmutations; i++) {
    let toMutate = Math.floor(Math.random() * output.length);
    let currentAssignment = output[toMutate];
    let student = studentPreferences.find(
      (s) => s.identifier === currentAssignment.student
    );
    if (!student) {
      continue;
    }
    let currentActivity = currentAssignment.activity;
    let options = student.activity.filter(
      (a) => a.activity !== currentActivity
    );
    if (options.length === 0) {
      continue;
    }
    let newActivity =
      options[Math.floor(Math.random() * options.length)].activity;
    let targetActivity = activities.find((a) => a.activity === newActivity);
    if (!targetActivity) {
      continue;
    }
    let roster = output.filter((a) => a.activity === newActivity);
    let capacity = targetActivity.capacity;
    if (roster.length < capacity) {
      // Just add us then
      output[toMutate] = { ...currentAssignment, activity: newActivity };
    } else {
      // Otherwise swap us
      let swapWith = roster[Math.floor(Math.random() * roster.length)];
      output[toMutate] = { ...currentAssignment, activity: newActivity };
      output[output.indexOf(swapWith)] = {
        ...swapWith,
        activity: currentActivity,
      };
    }
  }
  return output;
};

export const improveByMovingCohorts = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  scoringOptions: ScoringOptions
): { schedule: Schedule; improved: boolean } => {
  // Step 1: Identify students who are not in their top choice but could move as a cohort
  const studentsNeedingMoves = studentPreferences.filter((student) => {
    const currentAssignment = schedule.find(
      (s) => s.student === student.identifier
    );
    const topChoice = student.activity[0].activity; // Top choice activity
    const currentActivity = currentAssignment?.activity;
    const topChoiceInfo = activities.find((a) => a.activity === topChoice);
    if (!topChoiceInfo) {
      return false;
    }
    const availableSpots =
      topChoiceInfo.capacity -
      schedule.filter((s) => s.activity === topChoice).length;

    return currentActivity !== topChoice && availableSpots >= 2; // At least room for a small cohort
  });

  if (studentsNeedingMoves.length === 0) return { schedule, improved: false };

  // Step 2: Group students by their top-choice activity
  const groupedByTopChoice: Map<string, string[]> = new Map();

  for (const student of studentsNeedingMoves) {
    const topChoice = student.activity[0].activity;
    if (!groupedByTopChoice.has(topChoice)) {
      groupedByTopChoice.set(topChoice, []);
    }
    groupedByTopChoice.get(topChoice)!.push(student.identifier);
  }

  // Step 3: Try moving cohorts based on available spots
  let improved = false;

  for (const [activity, students] of groupedByTopChoice.entries()) {
    const activityInfo = activities.find((a) => a.activity === activity);
    if (!activityInfo) {
      continue;
    }
    const availableSpots =
      activityInfo.capacity -
      schedule.filter((s) => s.activity === activity).length;

    // Get cohorts within this group based on peer preferences
    const moveableCohorts = getCohorts(
      studentsNeedingMoves.filter((s) => students.includes(s.identifier)), // Only students in this group
      availableSpots, // Cohort can't exceed available spots
      3 // Min peer weight threshold
    ).filter((cohort) => cohort.length > 1);

    for (const cohort of moveableCohorts) {
      // Try moving the whole cohort
      let newSchedule = schedule.map((assignment) =>
        cohort.includes(assignment.student)
          ? { ...assignment, activity: activity }
          : assignment
      );

      let newScore = scoreSchedule(
        newSchedule,
        studentPreferences,
        scoringOptions
      );
      if (
        newScore >
        scoreSchedule(schedule, studentPreferences, scoringOptions)
      ) {
        return { schedule: newSchedule, improved: true };
      }
    }
  }

  return { schedule, improved };
};

export const improveScheduleLegacy = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  maxIterations = 10,
  scoringOptions: ScoringOptions = DEFAULT_SCORING_OPTIONS
): Schedule => {
  let { schedule: newSchedule, improved } = improveLeastHappyWithSwaps(
    schedule,
    studentPreferences,
    activities,
    scoringOptions
  );

  let iterations = 1;
  schedule = newSchedule;
  let strategy: "cohort" | "leasthappy" = "cohort";

  while (improved && iterations < maxIterations) {
    if (strategy === "cohort") {
      ({ schedule: newSchedule, improved } = improveByMovingCohorts(
        schedule,
        studentPreferences,
        activities,
        scoringOptions
      ));

      if (!improved) {
        strategy = "leasthappy"; // Switch to least-happy swaps if cohort moves fail
      }
    } else if (strategy === "leasthappy") {
      ({ schedule: newSchedule, improved } = improveLeastHappyWithSwaps(
        schedule,
        studentPreferences,
        activities,
        scoringOptions
      ));
    }

    if (!improved) {
      newSchedule = mutateSchedule(schedule, studentPreferences, activities);
      ({ schedule: newSchedule, improved } = improveLeastHappyWithSwaps(
        newSchedule,
        studentPreferences,
        activities,
        scoringOptions
      ));

      // Reset strategy to cohort-based moves first
      strategy = "cohort";
    }

    schedule = newSchedule;
    iterations++;
  }

  return schedule;
};

type ImprovementStrategy = {
  name: string;
  fn: (schedule: Schedule) => Schedule;
};

export const improveSchedule = (
  schedule: Schedule,
  studentPreferences: StudentPreferences[],
  activities: Activity[],
  maxIterations = 10,
  scoringOptions: ScoringOptions = DEFAULT_SCORING_OPTIONS
): Schedule => {
  let current = schedule;
  let currentScore = scoreSchedule(
    current,
    studentPreferences,
    scoringOptions
  );

  const strategies: ImprovementStrategy[] = [
    {
      name: "Least Happy",
      fn: (s) =>
        improveLeastHappyWithSwaps(
          s,
          studentPreferences,
          activities,
          scoringOptions
        ).schedule,
    },
    {
      name: "Cohort",
      fn: (s) =>
        improveByMovingCohorts(
          s,
          studentPreferences,
          activities,
          scoringOptions
        ).schedule,
    },
    {
      name: "Mutate + Least Happy",
      fn: (s) =>
        improveLeastHappyWithSwaps(
          mutateSchedule(s, studentPreferences, activities),
          studentPreferences,
          activities,
          scoringOptions
        ).schedule,
    },
    {
      name: "Mutate + Cohort",
      fn: (s) =>
        improveByMovingCohorts(
          mutateSchedule(s, studentPreferences, activities),
          studentPreferences,
          activities,
          scoringOptions
        ).schedule,
    },
  ];

  let iterations = 0;
  while (iterations < maxIterations) {
    let bestSchedule = current;
    let bestScore = currentScore;

    for (const strategy of strategies) {
      const candidate = strategy.fn(current);
      const invalid = validateSchedule(candidate, activities);
      if (invalid) {
        continue;
      }
      const candidateScore = scoreSchedule(
        candidate,
        studentPreferences,
        scoringOptions
      );
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestSchedule = candidate;
      }
    }

    if (bestScore <= currentScore) {
      break;
    }

    current = bestSchedule;
    currentScore = bestScore;
    iterations += 1;
  }

  return current;
};
