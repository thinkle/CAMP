
export const GoogleAppsScript = {
  
     areDataSheetsSetup(): Promise<GoogleAppsScript.Spreadsheet.Sheet> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: GoogleAppsScript.Spreadsheet.Sheet) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .areDataSheetsSetup();
      });
    },

     doSomething(): Promise<number> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: number) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .doSomething();
      });
    },

     getWorkerScript(): Promise<string> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: string) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .getWorkerScript();
      });
    },

     getUniversalPrefsSheet(): Promise<GoogleAppsScript.Spreadsheet.Sheet> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: GoogleAppsScript.Spreadsheet.Sheet) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .getUniversalPrefsSheet();
      });
    },

     writeSchedule(schedule: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").Schedule): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .writeSchedule(schedule);
      });
    },

     readBuildData(preferenceData: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").PreferenceData): Promise<Partial<import("../types").ScheduleInfo>[]> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: Partial<import("../types").ScheduleInfo>[]) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .readBuildData(preferenceData);
      });
    },

     writeBuildData(schedules: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[], preferenceData: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").PreferenceData): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .writeBuildData(schedules, preferenceData);
      });
    },

     clearBuildData(): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .clearBuildData();
      });
    },

     readData(keepEmpty: boolean): Promise<import("../types").PreferenceData> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: import("../types").PreferenceData) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .readData(keepEmpty);
      });
    },

     addMockData(activityPrefs: number, peerPrefs: number, nstudents: number, nactivities: number): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .addMockData(activityPrefs, peerPrefs, nstudents, nactivities);
      });
    },

     setupPreferencesSheet(activity_preferences: number, peer_preferences: number): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .setupPreferencesSheet(activity_preferences, peer_preferences);
      });
    },

     setupActivitiesSheet(): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .setupActivitiesSheet();
      });
    }
}
