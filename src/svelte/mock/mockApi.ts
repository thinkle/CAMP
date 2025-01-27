import { generateAllMockData } from "../../scheduler/mocks/mockDataGenerator";
import workerText from "../../../dist/worker.js.html?raw";

export function setupPreferencesSheet(
  activity_preferences: number,
  peer_preferences: number
): void {}

export function setupActivitiesSheet(): void {}

export function addMockData(
  activityPrefs: number,
  peerPrefs: number,
  nstudents: number,
  nactivities: number
): void {}

export function doSomething(): number {
  return 17;
}

export function test(): string {
  return "hello";
}

export function readData(): {
  activities: Activity[];
  studentPreferences: StudentPreferences[];
} {
  const { activityNames, activityCapacities, rawStudents } =
    generateAllMockData(
      50, // nactivities
      400, // nstudents
      4, // activityPrefs
      4 // peerPrefs
    );

  // Convert activity data
  const activities: Activity[] = activityNames.map((name, i) => ({
    activity: name,
    capacity: activityCapacities[i],
  }));

  // Convert student data
  const studentPreferences: StudentPreferences[] = rawStudents.map((st) => ({
    identifier: st.name,
    activity: st.activityPreferences.map((act, idx) => ({
      activity: act,
      weight: st.activityWeights[idx] || 0,
    })),
    peer: st.peerPreferences.map((peer, idx) => ({
      peer,
      weight: st.peerWeights[idx] || 0,
    })),
  }));

  return { activities, studentPreferences };
}

export function readBuildData(): import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[] {
  return null; // TODO: Replace with mock return value of type import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[]
}

export function writeBuildData(
  schedules: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[]
): void {}

export function clearBuildData(): void {}

export function getWorkerScript(): string {
  return workerText;
}

export function writeSchedule(
  schedule: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").Schedule
): void {}

export function areDataSheetsSetup(): GoogleAppsScript.Spreadsheet.Sheet {
  return true;
}

export function setupUniversalPrefsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return null; // TODO: Replace with mock return value of type GoogleAppsScript.Spreadsheet.Sheet
}

export function getUniversalPrefsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return null; // TODO: Replace with mock return value of type GoogleAppsScript.Spreadsheet.Sheet
}
