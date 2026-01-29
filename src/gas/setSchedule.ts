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
  let idcol = 0;
  let assignmentCol = 1;
  let scoreCol = STARTER_COLS.indexOf(COMPUTED_SCORE_HEADER);
  // Read all data...
  // columns we need are just...
  // idcol and assignmentCol
  let lastNeededColumn =
    Math.max(
      STARTER_COLS.indexOf(IDCOL),
      STARTER_COLS.indexOf(ASSIGNED_ACTIVITY_COL),
      scoreCol
    ) + 1; // 1-based
  let lastDataRow = sheet.getLastRow();
  let data = sheet.getRange(1, 1, lastDataRow, lastNeededColumn).getValues();
  const rowById = new Map<string, any[]>();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[idcol];
    if (!id) continue;
    rowById.set(String(id), row);
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
    let row = rowById.get(assignment.student);
    if (row) {
      row[assignmentCol] = assignment.activity;
      const score = perStudentScores.get(assignment.student);
      if (score !== undefined) {
        row[scoreCol] = score;
      }
    } else {
      console.error("Unable to find student", assignment.student);
      console.error(
        "Was searching through data: ",
        data.map((d) => d[idcol])
      );
      throw new Error(`Student ${assignment.student} not found in data`);
    }
  }
  for (const [studentId, score] of perStudentScores.entries()) {
    const row = rowById.get(studentId);
    if (!row) continue;
    row[scoreCol] = score;
  }
  // Write back...
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}
