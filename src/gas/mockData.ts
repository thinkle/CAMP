// scheduler/addMockData.ts

import {
  getActivitiesSheet,
  getPreferencesSheet,
  setupActivitiesSheet,
  setupPreferencesSheet,
  STARTER_COLS,
  IDCOL,
  ASSIGNED_ACTIVITY_COL,
  OVERRIDE_COL,
  SCORE_HEADER,
} from "../gas/setupSheets";
import { generateAllMockData } from "../scheduler/mocks/mockDataGenerator";
import type { StudentPreferences, Activity } from "../types";

export function addMockData(
  activityPrefs = 4,
  peerPrefs = 4,
  nstudents = 400,
  nactivities = 30
) {
  const activitiesSheet = getActivitiesSheet();
  const preferencesSheet = getPreferencesSheet();

  // Clear existing
  activitiesSheet.clearContents();
  preferencesSheet.clearContents();

  // Re-init columns/validation
  setupActivitiesSheet();
  setupPreferencesSheet(activityPrefs, peerPrefs);

  // Generate the raw data
  const { activityNames, activityCapacities, rawStudents } =
    generateAllMockData(nactivities, nstudents, activityPrefs, peerPrefs);

  // Convert & write activities
  // Columns: [ "Activity", "Capacity" ]
  const activityData: any[][] = activityNames.map((name, i) => [
    name,
    activityCapacities[i],
  ]);
  if (activityData.length > 0) {
    activitiesSheet
      .getRange(2, 1, activityData.length, 2)
      .setValues(activityData);
  }

  // Convert rawStudents -> StudentPreferences-like rows for "Preferences" sheet
  const preferencesData = rawStudents.map((st) =>
    buildPreferenceRow(st, activityPrefs, peerPrefs)
  );
  if (preferencesData.length > 0) {
    preferencesSheet
      .getRange(2, 1, preferencesData.length, preferencesData[0].length)
      .setValues(preferencesData);
  }

  Logger.log(
    `Mock data generated: ${nstudents} students, ${nactivities} activities.`
  );
}

/**
 * Build one row to place in the "Preferences" sheet:
 * [ identifier, <blank>, <blank>, activityPref1, w1, ..., peerPref1, w1, ... ]
 */
function buildPreferenceRow(
  student: {
    name: string;
    activityPreferences: string[];
    peerPreferences: string[];
    activityWeights: number[];
    peerWeights: number[];
  },
  activityPrefs: number,
  peerPrefs: number
): any[] {
  // Use STARTER_COLS to build the starter columns dynamically
  const row: any[] = [];
  for (const col of STARTER_COLS) {
    if (col === IDCOL) {
      row.push(student.name);
    } else {
      row.push("");
    }
  }
  // Activity preferences + weights
  for (let i = 0; i < activityPrefs; i++) {
    row.push(student.activityPreferences[i] || "");
    row.push(student.activityWeights[i] ?? 0);
  }
  // Peer preferences + weights
  for (let i = 0; i < peerPrefs; i++) {
    row.push(student.peerPreferences[i] || "");
    row.push(student.peerWeights[i] ?? 0);
  }
  return row;
}
