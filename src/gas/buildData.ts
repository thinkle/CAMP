import { idToSchedule } from "../scheduler";
import type { Schedule, ScheduleInfo } from "../types";
import { readData } from "./readData";
import { getBuildSheet, SCORE_HEADER, ID_HEADER, ALG_HEADER, GEN_HEADER, setupBuildSheet } from "./setupSheets";


export function readRawBuildData () : {
    id : string,
    score : number,
    alg : string,
    generation : number
}[] {
    let sheet = getBuildSheet();
    let data = sheet.getDataRange().getValues();
    let headers = data[0];
    let scoreIndex = headers.indexOf(SCORE_HEADER);
    let idIndex = headers.indexOf(ID_HEADER);
    let algIndex = headers.indexOf(ALG_HEADER);
    let genIndex = headers.indexOf(GEN_HEADER);
    let schedules = [];
    for (let i = 1; i < data.length; i++) {
        let row = data[i];
        let id = row[idIndex];
        let score = row[scoreIndex];
        let alg = row[algIndex];
        let generation = row[genIndex];
        schedules.push({ id, score, alg, generation });
    }
    return schedules;
}

export function readBuildData(): ScheduleInfo[] {
    let { studentPreferences, activities } = readData();
    let schedules : ScheduleInfo[] = [];
    for (let {id,score,alg,generation} of readRawBuildData()) {        
        let schedule = idToSchedule(id, studentPreferences, activities);
        schedules.push({ id, score, alg, generation, invalid: "", schedule });
    }
    return schedules;
}

export function writeBuildData(schedules : ScheduleInfo[]) {
    let sheet = getBuildSheet();
    let data = schedules.map((s) => [s.score, s.generation, s.alg, s.id]);
    let existingData = readRawBuildData();
    let existingIds = new Set();
    for (let s of existingData) {
        existingIds.add(s.id);
    }
    let newData = data.filter((d) => !existingIds.has(d[3]));
    if (newData.length > 0) {
        sheet.getRange(existingData.length + 2, 1, newData.length, 4).setValues(newData);
    }
}

export function clearBuildData() {
    let sheet = getBuildSheet();
    sheet.clear();
    setupBuildSheet(sheet);
}