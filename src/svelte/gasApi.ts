
export const GoogleAppsScript = {
  
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

     readBuildData(): Promise<import("../types").ScheduleInfo[]> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: import("../types").ScheduleInfo[]) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .readBuildData();
      });
    },

     writeBuildData(schedules: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").ScheduleInfo[]): Promise<void> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: void) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .writeBuildData(schedules);
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

     readData(): Promise<{ activities: import("../types").Activity[]; studentPreferences: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").StudentPreferences[]; }> {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((result: { activities: import("../types").Activity[]; studentPreferences: import("/Users/thinkle/BackedUpProjects/gas/CAMP/src/types").StudentPreferences[]; }) => resolve(result))
          .withFailureHandler((error: any) => reject(error))
          .readData();
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
