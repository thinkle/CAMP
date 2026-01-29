import {
  ASSIGNED_ACTIVITY_COL,
  getPreferencesSheet,
  IDCOL,
  COMPUTED_SCORE_HEADER,
  STARTER_COLS,
} from "./setupSheets";
import type { Schedule } from "../types";
import { readData } from "./readData";
import { preparePreferencesForScheduling } from "../scheduler/utils/normalizePreferences";
import { scoreScheduleWithBreakdown } from "../scheduler/scoring/scoreSchedule";

export function writeSchedule(schedule: Schedule) {
  let sheet = getPreferencesSheet();
  let lastDataRow = sheet.getLastRow();
  const idColIndex = STARTER_COLS.indexOf(IDCOL) + 1;
  const assignmentColIndex = STARTER_COLS.indexOf(ASSIGNED_ACTIVITY_COL) + 1;
  const scoreColIndex = STARTER_COLS.indexOf(COMPUTED_SCORE_HEADER) + 1;
  if (idColIndex <= 0 || assignmentColIndex <= 0 || scoreColIndex <= 0) {
    throw new Error(
      "writeSchedule: missing expected columns in Preferences sheet"
    );
  }
  const idValues = sheet
    .getRange(2, idColIndex, lastDataRow - 1, 1)
    .getValues();
  const assignmentValues = sheet
    .getRange(2, assignmentColIndex, lastDataRow - 1, 1)
    .getValues();
  const computedScoreValues = sheet
    .getRange(2, scoreColIndex, lastDataRow - 1, 1)
    .getValues();
  const rowIndexById = new Map<string, number>();
  for (let i = 0; i < idValues.length; i++) {
    const id = idValues[i][0];
    if (!id) continue;
    rowIndexById.set(String(id), i);
  }

  const { studentPreferences, activities, scoringOptions } = readData(true);
  const scheduledIds = new Set(schedule.map((assignment) => assignment.student));
  const filteredPreferences = studentPreferences.filter((pref) =>
    scheduledIds.has(pref.identifier)
  );
  const normalizedPrefs = preparePreferencesForScheduling(
    filteredPreferences,
    activities
  ).studentPreferences;
  const { perStudentScores } = scoreScheduleWithBreakdown(
    schedule,
    normalizedPrefs,
    scoringOptions
  );
  // Update data...
  for (let assignment of schedule) {
    const rowIndex = rowIndexById.get(assignment.student);
    if (rowIndex !== undefined) {
      assignmentValues[rowIndex][0] = assignment.activity;
      const score = perStudentScores.get(assignment.student);
      if (score !== undefined) {
        computedScoreValues[rowIndex][0] = score;
      }
    } else {
      console.error("Unable to find student", assignment.student);
      console.error(
        "Was searching through data: ",
        idValues.map((d) => d[0])
      );
      throw new Error(`Student ${assignment.student} not found in data`);
    }
  }
  for (const [studentId, score] of perStudentScores.entries()) {
    const rowIndex = rowIndexById.get(studentId);
    if (rowIndex === undefined) continue;
    computedScoreValues[rowIndex][0] = score;
  }
  // Write back...
  sheet
    .getRange(2, assignmentColIndex, lastDataRow - 1, 1)
    .setValues(assignmentValues);
  sheet
    .getRange(2, scoreColIndex, lastDataRow - 1, 1)
    .setValues(computedScoreValues);
}
