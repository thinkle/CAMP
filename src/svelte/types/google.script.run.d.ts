
declare namespace google.script {  
  interface GoogleScriptRun {
      withFailureHandler(callback: (error: Error, object?: any) => void): this;
      withSuccessHandler(callback: (value: any, object?: any) => void): this;
      withUserObject(object: Object): this;
      areDataSheetsSetup(): void;
  doSomething(): void;
  getWorkerScript(): void;
  getUniversalPrefsSheet(): void;
  writeSchedule(schedule: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").Schedule): void;
  readBuildData(preferenceData: { studentPreferences: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").StudentPreferences[]; activities: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").Activity[]; }): void;
  writeBuildData(schedules: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[], preferenceData: { studentPreferences: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").StudentPreferences[]; activities: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").Activity[]; }): void;
  clearBuildData(): void;
  readData(keepEmpty: boolean): void;
  addMockData(activityPrefs: number, peerPrefs: number, nstudents: number, nactivities: number): void;
  setupPreferencesSheet(activity_preferences: number, peer_preferences: number): void;
  setupActivitiesSheet(): void
  }
  const run : GoogleScriptRun;

  interface GoogleScriptHost {
  close(): void;
  setHeight(height: number): void;
  setWidth(width: number): void;
  editor: {
    focus(): void;
  };
}
const host : GoogleScriptHost;
  

  interface IUrlLocation {
  hash: string;
  parameter: { [key: string]: any };
  parameters: { [key: string]: any[] };
}

interface GoogleScriptUrl {
  getLocation(callback: (location: IUrlLocation) => void): void;
}
const url : GoogleScriptUrl;
  
}
