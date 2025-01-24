/* Export all functions you'll want to call with 
google.script.run here -- this will allow our type
definition magic to work, so in your svelte side code
you get clean autocomplete for google.script.run */

export { writeSchedule } from "./setSchedule";

export { readBuildData, writeBuildData, clearBuildData } from "./buildData";

export { readData } from "./readData";

export { addMockData } from "./mockData";

export { setupPreferencesSheet, setupActivitiesSheet } from "./setupSheets";

export function doSomething () { return 10}

export function getWorkerScript() {
  const scriptContent = HtmlService.createHtmlOutputFromFile("worker.js.html").getContent();
  return ContentService.createTextOutput(scriptContent).getContent();
}

