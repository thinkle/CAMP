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
}): Partial<ScheduleInfo>[] {  
  let schedules: Partial<ScheduleInfo>[] = [];
  let targetHash = computeHash(preferenceData);   
  console.log('Looking for hash', targetHash);  
  let nonMatchingHashes = new Set();
  for (let { id, score, alg, generation, hash } of readRawBuildData()) {
    if (hash !== targetHash) {
        nonMatchingHashes.add(hash);
        continue;
    }
    // Partial schedule information, not including full schedule details    
    schedules.push({ id, score, alg, generation, invalid: "" });
  }
  console.log('Found ', schedules.length, 'schedules');
  console.log('Non-matching hashes', Array.from(nonMatchingHashes));
  return schedules;
}

function computeHash(preferenceData: {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
  }) {
    // 1) Make local copies to avoid mutating the original data
    const studentPrefs = [...preferenceData.studentPreferences];
    const activities = [...preferenceData.activities];
  
    // 2) Sort students and activities
    studentPrefs.sort((a, b) => a.identifier.localeCompare(b.identifier));
    activities.sort((a, b) => a.activity.localeCompare(b.activity));
  
    // 3) Build index maps for easy reference
    const studentIndexMap = new Map<string, number>();
    studentPrefs.forEach((s, i) => {
      studentIndexMap.set(s.identifier, i);
    });
  
    const activityIndexMap = new Map<string, number>();
    activities.forEach((act, i) => {
      activityIndexMap.set(act.activity, i);
    });
  
    // 4) For each student, sort their peer and activity arrays
    //    and convert them to numeric form [index, weight, index, weight...].
    const canonicalData = studentPrefs.map((s) => {
      // Sort peer array
      const sortedPeers = [...s.peer].sort((p1, p2) =>
        p1.peer.localeCompare(p2.peer)
      );
      const peerArray = sortedPeers.flatMap((p) => {
        // Convert each peer to [peerIndex, weight]
        const peerIndex = studentIndexMap.get(p.peer) ?? -1;
        return [peerIndex, p.weight];
      });
  
      // Sort activity array
      const sortedActivities = [...s.activity].sort((a1, a2) =>
        a1.activity.localeCompare(a2.activity)
      );
      const activityArray = sortedActivities.flatMap((a) => {
        // Convert each activity to [activityIndex, weight]
        const actIndex = activityIndexMap.get(a.activity) ?? -1;
        return [actIndex, a.weight];
      });
  
      // Return a small object capturing the student's numeric data
      return {
        studentIndex: studentIndexMap.get(s.identifier) ?? -1,
        peers: peerArray,
        activities: activityArray,
      };
    });
  
    // 5) Build a final structure that includes the sorted list of activities + capacities, too
    //    (if you want them in the hash)
    const activityCaps = activities.map((act) => ({
      activityIndex: activityIndexMap.get(act.activity) ?? -1,
      capacity: act.capacity,
    }));
  
    // 6) Combine everything into a single top-level object or array.
    //    This is the data we’ll serialize and hash.
    const finalStructure = {
      students: canonicalData,   // numeric representation
      activities: activityCaps,  // numeric representation
    };
  
    // 7) Convert to JSON. Because we've sorted all arrays and used numeric indexes,
    //    this JSON should be fully stable for identical data.
    const jsonString = JSON.stringify(finalStructure);
  
    // 8) Compute SHA-256 with Google Apps Script
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      jsonString
    );
    const hexDigest = digest
      .map((byte) => {
        // Handle negatives by normalizing into [0..255]
        const val = (byte + 256) % 256;
        return val.toString(16).padStart(2, "0");
      })
      .join("");
  
    // 9) Return the stable hex digest
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
