import type {
  ActivityPreference,
  PeerPreference,
  StudentPreferences,
  Activity,
} from "../types";

// Import sheet getters from your setupSheets module:
import {
  getActivitiesSheet,
  getPreferencesSheet,
  getUniversalPrefsData,
  ID_HEADER,
  IDCOL,
  OVERRIDE_COL,
  STARTER_COLS,
} from "./setupSheets";

/**
 * Reads data from the "Activities" sheet and the "Preferences" sheet,
 * returning them in a structured format for further processing.
 *
 * @returns {{ activities: Activity[], studentPreferences: StudentPreferences[] }}
 */
export function readData(keepEmpty = false): {
  activities: Activity[];
  studentPreferences: StudentPreferences[];
} {
  // --------------------------------------
  // 1. Read and parse data from Activities sheet
  // --------------------------------------
  const activitiesSheet = getActivitiesSheet();
  const activitiesData = activitiesSheet.getDataRange().getValues();

  const activities: Activity[] = [];
  // Skip header row (assumed row 1)
  for (let row = 1; row < activitiesData.length; row++) {
    const [activityName, capacityValue] = activitiesData[row];

    // If the activity name cell is empty, we assume we've reached the end of data
    if (!activityName) break;

    const capacity = Number(capacityValue) || 0;
    activities.push({ activity: activityName, capacity });
  }

  // --------------------------------------
  // 2. Read and parse data from Preferences sheet
  // --------------------------------------
  const preferencesSheet = getPreferencesSheet();
  const prefValues = preferencesSheet.getDataRange().getValues();
  if (prefValues.length === 0) {
    // No data found on Preferences sheet
    return { activities, studentPreferences: [] };
  }

  // We’ll use the first row as column headers
  const headers = prefValues[0];

  let studentPreferences: StudentPreferences[] = [];

  // Start reading from row 2 (index = 1)
  for (let row = 1; row < prefValues.length; row++) {
    const thisRow = prefValues[row];
    const identifier = thisRow[STARTER_COLS.indexOf(IDCOL)];

    if (!identifier) {
      // Reached an empty row—assume end of data
      break;
    }

    const override = thisRow[STARTER_COLS.indexOf(OVERRIDE_COL)]; // this is the "override" column which will just force the student into this activity

    // Initialize preference arrays
    const activityPrefs: ActivityPreference[] = [];
    const peerPrefs: PeerPreference[] = [];

    // We skip header columns with ID, assignment, etc
    let colIndex = STARTER_COLS.length;

    while (colIndex < thisRow.length - 1) {
      // Column headers should align with either "Activity Preference #"
      // or "Peer #", followed by a "wght" column. For example:
      //  columns: [ <identifier>, <activity_col>, <override_col>,
      //             "Activity Preference 1", "wght",
      //             "Activity Preference 2", "wght",
      //             "Peer 1", "wght",
      //             "Peer 2", "wght", ... ]

      const nameHeader = headers[colIndex];
      // Next column should be the weight, but confirm length
      if (colIndex + 1 >= thisRow.length) break;

      const preferenceName = thisRow[colIndex];
      const weightValue = thisRow[colIndex + 1];
      const weight = Number(weightValue) || 0;

      // If there's a blank name, no need to push an empty preference
      if (!preferenceName) {
        colIndex += 2;
        continue;
      }

      // Distinguish between an "Activity" vs. "Peer" based on header or naming convention
      if (
        typeof nameHeader === "string" &&
        nameHeader.toLowerCase().includes("peer") &&
        preferenceName
      ) {
        // It's a peer preference
        peerPrefs.push({ peer: String(preferenceName), weight });
      } else if (preferenceName) {
        // Otherwise, treat it as an activity preference
        activityPrefs.push({ activity: String(preferenceName), weight });
      }

      colIndex += 2; // Move to the next preference pair
    }

    if (override) {
      studentPreferences.push({
        identifier: String(identifier),
        activity: [{ activity: override, weight: 1000 }],
        peer: peerPrefs,
      });
    } else {
      studentPreferences.push({
        identifier: String(identifier),
        activity: activityPrefs,
        peer: peerPrefs,
      });
    }
  }

  if (!keepEmpty) {
    studentPreferences = studentPreferences.filter(
      (student) => student.activity.length > 0 || student.peer.length > 0
    );
  }

  // Now since we may have removed students, we may have preferences for non-existent peers.
  // Let's remove them...
  const validIdentifiers = new Set(studentPreferences.map((s) => s.identifier));
  for (let student of studentPreferences) {
    student.peer = student.peer.filter((p) => validIdentifiers.has(p.peer));
  }

  const universalPreferences = getUniversalPrefsData();
  // Add universal preferences to each student
  for (let student of studentPreferences) {
    for (let pref of universalPreferences) {
      if (pref.activity) {
        if (student.activity.find((a) => a.activity === pref.activity)) {
          continue;
        } else {
          student.activity.push({ ...pref });
        }
      }
    }
  }

  return { activities, studentPreferences };
}
