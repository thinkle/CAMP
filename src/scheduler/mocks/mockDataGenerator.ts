// scheduler/mockDataGenerator.ts

import { Activity, StudentPreferences } from '../../types';  // Adjust path as needed

/** 
 * Internal type just for the raw student generation process
 * before converting to StudentPreferences. 
*/
type RawStudentMock = {
  name: string;
  activityPreferences: string[];
  peerPreferences: string[];
  activityWeights: number[];
  peerWeights: number[];
};

export function generateAllMockData(
  nactivities: number,
  nstudents: number,
  activityPrefs: number,
  peerPrefs: number
): {
  activityNames: string[];
  activityCapacities: number[];
  rawStudents: RawStudentMock[];
} {
  const activityNames = generateMockActivityNames(nactivities);
  const activityCapacities = activityNames.map(
    () => Math.floor(Math.random() * 31) + 10 // random capacity 10-40
  );

  const studentNames = generateMockStudentNames(nstudents);
  const rawStudents: RawStudentMock[] = studentNames.map(name => ({
    name,
    activityPreferences: [],
    peerPreferences: [],
    activityWeights: [],
    peerWeights: [],
  }));

  // Assign random preferences
  assignActivityPreferences(rawStudents, activityNames, activityPrefs);
  assignPeerPreferences(rawStudents, peerPrefs);
  assignPreferenceWeights(rawStudents, activityPrefs, peerPrefs);

  return { activityNames, activityCapacities, rawStudents };
}

//-----------------------------------------------------------------
// Example: generating random activity names
//-----------------------------------------------------------------
function generateMockActivityNames(n: number): string[] {
  const adjectives = [ 'Advanced', 'Beginner', 'Creative', 'Dynamic', 'Fun', 'Exciting',
    'Innovative', 'Ultimate', 'Super', 'Energetic', 'Absurd',
    'Silly', 'Serious', 'Challenging', 'Relaxing', 'Intense', 'Casual'
  ];
  const secondaryAdjectives = [
    'Purposeful','Mindful','Sustainable','Eco-Friendly','Eco-Conscious',
    'Recreational','Underwater','Airborn','Outdoor','High-Altitude',
    'Low-Impact','High-Impact','Low-Intensity','High-Intensity',
    'Low-Cost','High-Cost','Low-Maintenance','High-Maintenance'
  ];
  const nouns = [
    'Basketweaving','Basketball','Skydiving','Cooking','Painting','Dance',
    'Coding','Photography','Chess','Hiking','Martial Arts','Pottery',
    'Gardening','Astronomy','Cycling','Yoga','Knitting','Sailing',
    'Rock Climbing','Origami','Mountain Biking','Gravel Bike Adventures',
    'Code Camp','CPR Training','First Aid','Animal Care','Pet Training',
    'Pet Grooming','Pet Sitting','Pet Walking','Film Making','Video Editing',
    'Music Production','Music Theory','Song Writing','Graphic Design',
    'Band Camp','Orchestra','Choir','Theater','Acting','Improv','Stand Up Comedy',
    'Sketch Comedy','Travel','Beach Clean-Up','Surfing','SCUBA Diving'
  ];

  const results: string[] = [];
  for (let i = 0; i < n; i++) {
    const adj1 = adjectives[Math.floor(Math.random() * adjectives.length)];
    const adj2 = secondaryAdjectives[Math.floor(Math.random() * secondaryAdjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    results.push(`${adj1} ${adj2} ${noun}`);
  }
  return results;
}

//-----------------------------------------------------------------
// Example: generating random student names with letter-based indexes
//-----------------------------------------------------------------
function generateMockStudentNames(n: number): string[] {
  const firstNames = [
    'Alice','Bob','Charlie','Diana','Ethan','Fiona','George','Hannah','Ian','Julia',
    'Kevin','Laura','Mike','Nina','Oscar','Paula','Quentin','Rachel','Steve','Tina',
    'Uma','Victor','Wendy','Xander','Yvonne','Zach','Aarav','Rithika','Sahana','Sahil',
    /* ... etc. ... */
  ];
  const lastNames = [
    'Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Wilson',
    'Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson',
    'White','Lee','Perez','Clark','Lewis','Robinson','Walker','Kumar','Patel','Shah','Singh',
    /* ... etc. ... */
  ];

  const results: string[] = [];
  for (let i = 1; i <= n; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const mi = numberToLetters(i);
    results.push(`${fn} ${mi} ${ln}`);
  }
  return results;
}

function numberToLetters(num: number): string {
  // A=1, B=2, ..., Z=26, AA=27, etc.
  let letters = '';
  while (num > 0) {
    num--;
    const remainder = num % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    num = Math.floor(num / 26);
  }
  return letters;
}

//-----------------------------------------------------------------
// Weighted random picks for activity & peer preferences
//-----------------------------------------------------------------
function assignActivityPreferences(students: RawStudentMock[], activityNames: string[], count: number) {
  // Weighted approach to favor early indexes
  const heavilyWeighted = [
    ...activityNames,
    ...activityNames.slice(0,20),
    ...activityNames.slice(0,10),
    ...activityNames.slice(0,10),
    ...activityNames.slice(0,5),
    ...activityNames.slice(0,5),
  ];
  students.forEach(s => {
    s.activityPreferences = getRandomUniqueElements(heavilyWeighted, count);
  });
}

function assignPeerPreferences(students: RawStudentMock[], count: number) {
  const allNames = students.map(s => s.name);
  students.forEach(student => {
    const possiblePeers = allNames.filter(name => name !== student.name);
    const heavilyWeighted = [
      ...possiblePeers,
      ...possiblePeers.slice(0,100),
      ...possiblePeers.slice(0,50),
      ...possiblePeers.slice(0,20),
      // ... etc. ...
    ];
    student.peerPreferences = getRandomUniqueElements(heavilyWeighted, count);
  });
}

function assignPreferenceWeights(students: RawStudentMock[], activityPrefs: number, peerPrefs: number) {
  students.forEach(student => {
    const prioritizeActivity = Math.random() < 0.5;
    if (prioritizeActivity) {
      student.activityWeights = [30,25,10,10].slice(0, activityPrefs);
      student.peerWeights     = [20,15,10,10].slice(0, peerPrefs);
    } else {
      student.activityWeights = [20,15,10,10].slice(0, activityPrefs);
      student.peerWeights     = [30,25,10,10].slice(0, peerPrefs);
    }
  });
}

//-----------------------------------------------------------------
// Helper: getRandomUniqueElements
//-----------------------------------------------------------------
function getRandomUniqueElements<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) return [...arr];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}