import type {
    ActivityPreference,
    PeerPreference,
    StudentPreferences,
    Activity
} from "../types";

  // Import sheet getters from your setupSheets module:
  import { getActivitiesSheet, getPreferencesSheet } from "./setupSheets";
  
  /**
   * Reads data from the "Activities" sheet and the "Preferences" sheet,
   * returning them in a structured format for further processing.
   *
   * @returns {{ activities: Activity[], studentPreferences: StudentPreferences[] }}
   */
  export function readData(): {
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
  
    const studentPreferences: StudentPreferences[] = [];
  
    // Start reading from row 2 (index = 1)
    for (let row = 1; row < prefValues.length; row++) {
      const thisRow = prefValues[row];
      const identifier = thisRow[0];
      if (!identifier) {
        // Reached an empty row—assume end of data
        break;
      }
  
      // Initialize preference arrays
      const activityPrefs: ActivityPreference[] = [];
      const peerPrefs: PeerPreference[] = [];
  
      // We skip columns 1 and 2 (assigned activity, override) since we only read preferences
      // so our reading starts at index = 3
      let colIndex = 3;
  
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
        if (typeof nameHeader === "string" && nameHeader.toLowerCase().includes("peer")) {
          // It's a peer preference
          peerPrefs.push({ peer: String(preferenceName), weight });
        } else {
          // Otherwise, treat it as an activity preference
          activityPrefs.push({ activity: String(preferenceName), weight });
        }
  
        colIndex += 2; // Move to the next preference pair
      }
  
      studentPreferences.push({
        identifier: String(identifier),
        activity: activityPrefs,
        peer: peerPrefs,
      });
    }
  
    return { activities, studentPreferences };
  }