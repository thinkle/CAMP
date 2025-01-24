import { getActivitiesSheet, getPreferencesSheet } from "./setupSheets";
import type { Schedule } from "../types";

export function writeSchedule (schedule : Schedule) {
    let sheet = getPreferencesSheet();
    let idcol = 0;
    let assignmentCol = 1;
    // Read all data...
    let data = sheet.getDataRange().getValues();
    // Update data...
    for (let assignment of schedule) {
        let row = data.find((r)=>r[idcol] === assignment.student);
        if (row) {
            row[assignmentCol] = assignment.activity;
        } else {
            console.error('Unable to find student', assignment.student);
            console.error('Was searching through data: ',data.map((d)=>d[idcol]));
            throw new Error(`Student ${assignment.student} not found in data`);
        }
    }
    // Write back...
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}