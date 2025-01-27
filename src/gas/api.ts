/* Export all functions you'll want to call with 
google.script.run here -- this will allow our type
definition magic to work, so in your svelte side code
you get clean autocomplete for google.script.run */

import { activitySheetName, preferenceSheetName } from "./constants";
export { getUniversalPrefsSheet } from "./setupSheets";

export { writeSchedule } from "./setSchedule";

export { readBuildData, writeBuildData, clearBuildData } from "./buildData";

export { readData } from "./readData";

export { addMockData } from "./mockData";

export { setupPreferencesSheet, setupActivitiesSheet } from "./setupSheets";

export function areDataSheetsSetup () {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let preferenceSheet = ss.getSheetByName(preferenceSheetName);
  let activitySheet = ss.getSheetByName(activitySheetName);
  return preferenceSheet && activitySheet;
}

export function doSomething () { return 10}

export function getWorkerScript() {
  const scriptContent = HtmlService.createHtmlOutputFromFile("worker.js.html").getContent();
  return ContentService.createTextOutput(scriptContent).getContent();
}

