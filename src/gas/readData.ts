import type {
  ActivityPreference,
  PeerPreference,
  StudentPreferences,
  Activity,
  PreferenceMode,
  PreferenceData,
  ScoringOptions,
} from "../types";
import { DEFAULT_SCORING_OPTIONS } from "../types";

// Import sheet getters from your setupSheets module:
import {
  getActivitiesSheet,
  getPreferencesSheet,
  getUniversalPrefsData,
  getScoringSettingsSheet,
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
export function readData(keepEmpty = false): PreferenceData {
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
    activities.push({ activity: String(activityName), capacity });
  }

  // --------------------------------------
  // 2. Read and parse data from Preferences sheet
  // --------------------------------------
  const preferencesSheet = getPreferencesSheet();
  const prefValues = preferencesSheet.getDataRange().getValues();
  if (prefValues.length === 0) {
    // No data found on Preferences sheet
    return {
      activities,
      studentPreferences: [],
      preferenceMode: "activities-and-peers",
    };
  }

  // We’ll use the first row as column headers
  const headers = prefValues[0];

  let studentPreferences: StudentPreferences[] = [];
  let sawActivityPreferenceColumn = false;

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
        sawActivityPreferenceColumn = true;
        activityPrefs.push({ activity: String(preferenceName), weight });
      }

      colIndex += 2; // Move to the next preference pair
    }

    if (override) {
      studentPreferences.push({
        identifier: String(identifier),
        activity: [{ activity: String(override), weight: 1000 }],
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

  const preferenceMode: PreferenceMode = sawActivityPreferenceColumn
    ? "activities-and-peers"
    : "peer-only";

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

  if (preferenceMode !== "peer-only") {
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
  }

  const scoringOptions = readScoringSettings();

  return { activities, studentPreferences, preferenceMode, scoringOptions };
}

function readScoringSettings(): ScoringOptions {
  const sheet = getScoringSettingsSheet();
  const data = sheet.getDataRange().getValues();
  const map = new Map<string, string>();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const key = row[0];
    const value = row[1];
    if (key) {
      map.set(String(key), String(value));
    }
  }

  const toNumber = (key: keyof ScoringOptions): number => {
    const raw = map.get(key);
    if (raw === undefined || raw === "") {
      return DEFAULT_SCORING_OPTIONS[key];
    }
    const parsed = Number(raw);
    return isNaN(parsed) ? DEFAULT_SCORING_OPTIONS[key] : parsed;
  };

  return {
    mutualPeerMultiplier: toNumber("mutualPeerMultiplier"),
    nonMutualPeerMultiplier: toNumber("nonMutualPeerMultiplier"),
    noPeerPenalty: toNumber("noPeerPenalty"),
    noActivityPenalty: toNumber("noActivityPenalty"),
  };
}
