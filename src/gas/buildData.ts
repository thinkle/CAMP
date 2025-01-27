import { idToSchedule } from "../scheduler";
import type {
  Activity,
  Schedule,
  ScheduleInfo,
  StudentPreferences,
} from "../types";
import { readData } from "./readData";
import {
  getBuildSheet,
  SCORE_HEADER,
  ID_HEADER,
  ALG_HEADER,
  GEN_HEADER,
  setupBuildSheet,
  HASH_HEADER,
} from "./setupSheets";

export function readRawBuildData(): {
  id: string;
  score: number;
  alg: string;
  generation: number;
  hash : string;
}[] {
  let sheet = getBuildSheet();
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let scoreIndex = headers.indexOf(SCORE_HEADER);
  let idIndex = headers.indexOf(ID_HEADER);
  let algIndex = headers.indexOf(ALG_HEADER);
  let genIndex = headers.indexOf(GEN_HEADER);
  let hashIndex = headers.indexOf(HASH_HEADER);
  let schedules = [];
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let id = row[idIndex];
    let score = row[scoreIndex];
    let alg = row[algIndex];
    let hash = row[hashIndex];
    let generation = row[genIndex];
    schedules.push({ id, score, alg, generation, hash });
  }
  return schedules;
}

export function readBuildData(preferenceData : {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
}): ScheduleInfo[] {  
  let schedules: ScheduleInfo[] = [];
  let targetHash = computeHash(preferenceData);   
  console.log('Looking for hash', targetHash);  
  let nonMatchingHashes = new Set();
  for (let { id, score, alg, generation, hash } of readRawBuildData()) {
    if (hash !== targetHash) {
        nonMatchingHashes.add(hash);
        continue;
    }
    let schedule = idToSchedule(id, preferenceData.studentPreferences, preferenceData.activities);
    schedules.push({ id, score, alg, generation, invalid: "", schedule });
  }
  console.log('Found ', schedules.length, 'schedules');
  console.log('Non-matching hashes', Array.from(nonMatchingHashes));
  return schedules;
}

function computeHash(preferenceData: {
  studentPreferences: StudentPreferences[];
  activities: Activity[];
}) {
    
  preferenceData.studentPreferences.sort((a, b) =>
    a.identifier.localeCompare(b.identifier)
  );
  preferenceData.activities.sort((a, b) =>
    a.activity.localeCompare(b.activity)
  );
  preferenceData.studentPreferences.forEach(
    (s) => {
        s.activity.sort((a, b) => a.activity.localeCompare(b.activity));
        s.peer.sort((a, b) => a.peer.localeCompare(b.peer));
    }
  )
  console.log('Hashing', preferenceData);
  let s = JSON.stringify(preferenceData);
  let digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s);
  // Convert each byte to a two-digit hex string
  const hexDigest = digest
    .map((byte) => {
      // Because GAS might return negatives, convert properly
      const val = (byte + 256) % 256;
      return val.toString(16).padStart(2, "0");
    })
    .join("");
  // hexDigest is now a standard 64-char SHA-256 string
  return hexDigest;
}

export function writeBuildData(
  schedules: ScheduleInfo[],
  preferenceData: {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
  }
) {
  let hash = computeHash(preferenceData);
  let sheet = getBuildSheet();
  let data = schedules.map((s) => [s.score, s.generation, s.alg, s.id, hash]);
  let existingData = readRawBuildData();
  let existingIds = new Set();
  for (let s of existingData) {
    existingIds.add(s.id);
  }
  let newData = data.filter((d) => !existingIds.has(d[3]));
  if (newData.length > 0) {
    sheet
      .getRange(existingData.length + 2, 1, newData.length, newData[0].length)
      .setValues(newData);
  }
}

export function clearBuildData() {
  let sheet = getBuildSheet();
  sheet.clear();
  setupBuildSheet(sheet);
}
