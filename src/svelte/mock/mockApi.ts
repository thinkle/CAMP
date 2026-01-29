import { generateAllMockData } from "../../scheduler/mocks/mockDataGenerator";
import workerText from "../../../dist/worker.js.html?raw";
import type {
  Activity,
  StudentPreferences,
  PreferenceData,
  PreferenceMode,
} from "../../types";
import { DEFAULT_SCORING_OPTIONS } from "../../types";

const DATA_DUMP_GLOBAL = "__CAMP_DATA_DUMP__";
let cachedDataDump: PreferenceData | null = null;

const isDev = Boolean((import.meta as any).env?.DEV);
if (isDev) {
  const fileUrl = new URL("../../../data-dump.js", import.meta.url);
  const rawPath = fileUrl.pathname;
  const fsUrl = rawPath.startsWith("/@fs/") ? rawPath : `/@fs${rawPath}`;
  import(/* @vite-ignore */ fsUrl)
    .then((mod: any) => {
      const globalDump = (globalThis as any)[DATA_DUMP_GLOBAL];
      const candidate = mod?.default ?? mod?.data ?? globalDump;
      if (candidate) {
        cachedDataDump = candidate as PreferenceData;
      }
    })
    .catch(() => {
      // Local data dump is optional; fall back to generated mocks.
    });
}

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

export function readData(keepEmpty = false): PreferenceData {
  const globalDump = (globalThis as any)[DATA_DUMP_GLOBAL] as
    | PreferenceData
    | undefined;
  const dump = cachedDataDump ?? globalDump;
  if (dump) {
    const data = JSON.parse(JSON.stringify(dump)) as PreferenceData;
    if (!data.scoringOptions) {
      data.scoringOptions = DEFAULT_SCORING_OPTIONS;
    }
    if (!data.preferenceMode) {
      data.preferenceMode = "activities-and-peers";
    }
    if (!keepEmpty) {
      data.studentPreferences = data.studentPreferences.filter(
        (s) => s.activity.length || s.peer.length
      );
    }
    return data;
  }

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

  const preferenceMode: PreferenceMode = "activities-and-peers";

  return {
    activities,
    studentPreferences,
    preferenceMode,
    scoringOptions: DEFAULT_SCORING_OPTIONS,
  };
}

export function readBuildData(): import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[] {
  return []; // TODO: Replace with mock return value of type import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[]
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
): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    schedule,
  };
  const content = JSON.stringify(payload, null, 2);

  if (typeof document !== "undefined") {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schedule-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } else {
    console.log("Mock writeSchedule:", content);
  }
}

export function areDataSheetsSetup(): GoogleAppsScript.Spreadsheet.Sheet {
  return true;
}

export function setupUniversalPrefsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return null; // TODO: Replace with mock return value of type GoogleAppsScript.Spreadsheet.Sheet
}

export function getUniversalPrefsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return null; // TODO: Replace with mock return value of type GoogleAppsScript.Spreadsheet.Sheet
}
