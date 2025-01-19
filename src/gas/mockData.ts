/**
 * addMockData.js
 *
 * Populates the "Activities" and "Preferences" sheets with mock data
 * for testing the CAMP assignment logic. Columns and widths are
 * determined in setupSheets; we only fill the rows here.
 */

// Import only what's necessary from setupSheets
import {
    getActivitiesSheet,
    getPreferencesSheet,
    setupActivitiesSheet,
    setupPreferencesSheet,
    STARTER_COLS,           // e.g. [IDCOL, ASSIGNED_ACTIVITY_COL, OVERRIDE_COL]
    IDCOL,                  // 'identifier'
    ASSIGNED_ACTIVITY_COL,  // 'activity'
    OVERRIDE_COL,           // 'override'
    WEIGHT_HEADER           // 'wght'
  } from "./setupSheets";
  
  /**
   * Main function to generate and insert mock data into the Activities
   * and Preferences sheets. We do NOT define columns or widths here;
   * that logic lives in setupSheets.
   *
   * @param {number} activityPrefs - Number of activity preferences per student
   * @param {number} peerPrefs     - Number of peer preferences per student
   * @param {number} nstudents     - Number of mock students to generate
   * @param {number} nactivities   - Number of mock activities to generate
   */
  export function addMockData(
    activityPrefs = 4,
    peerPrefs = 4,
    nstudents = 400,
    nactivities = 30
  ) {
    // --------------------------
    // 1. Clear & Reinitialize Sheets
    // --------------------------
    const activitiesSheet = getActivitiesSheet();
    const preferencesSheet = getPreferencesSheet();
    clearSheet(activitiesSheet);
    clearSheet(preferencesSheet);
  
    // Re-setup sheets (creates column headers, validations, etc.)
    setupActivitiesSheet();
    setupPreferencesSheet(activityPrefs, peerPrefs);
  
    // --------------------------
    // 2. Generate Activities & Insert into "Activities" Sheet
    // --------------------------
    const activityNames = generateMockActivityNames(nactivities);
    const activityCapacities = activityNames.map(
      () => Math.floor(Math.random() * 31) + 10 // random capacity between 10 and 40
    );
  
    // Prepare activity data rows: [activityName, capacity]
    const activityData = activityNames.map((name, i) => [name, activityCapacities[i]]);
    // Write them starting from row 2 in the Activities sheet
    if (activityData.length > 0) {
      activitiesSheet
        .getRange(2, 1, activityData.length, activityData[0].length)
        .setValues(activityData);
    }
  
    // --------------------------
    // 3. Generate Students & Their Preferences
    // --------------------------
    const studentNames = generateMockStudentNames(nstudents);
  
    // Build student objects for simpler data handling
    const students = studentNames.map(name => ({ name }));
  
    // Assign activity preferences
    assignActivityPreferences(students, activityNames, activityPrefs);
  
    // Assign peer preferences
    assignPeerPreferences(students, peerPrefs);
  
    // Assign weights (how strongly each student feels about each preference type)
    assignPreferenceWeights(students, activityPrefs, peerPrefs);
  
    // --------------------------
    // 4. Insert Student Data into "Preferences" Sheet
    // --------------------------
    const preferencesData = students.map(student => buildPreferenceRow(student, activityPrefs, peerPrefs));
    // Place the data starting from row 2, column 1
    if (preferencesData.length > 0) {
      preferencesSheet
        .getRange(2, 1, preferencesData.length, preferencesData[0].length)
        .setValues(preferencesData);
    }
  
    Logger.log(`Mock data generated: ${nstudents} students, ${nactivities} activities.`);
  }
  
  /** 
   * Clears all content from the given sheet.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   */
  function clearSheet(sheet) {
    sheet.clearContents();
  }
  
  /**
   * Generates an array of mock activity names by combining random
   * adjectives and nouns.
   *
   * @param {number} n - Number of activity names to generate
   * @returns {string[]} - Array of generated activity names
   */
  function generateMockActivityNames(n) {
    const adjectives = [
      'Advanced', 'Beginner', 'Creative', 'Dynamic', 'Fun', 'Exciting',
      'Innovative', 'Ultimate', 'Super', 'Energetic','Absurd',
        'Silly', 'Serious', 'Challenging', 'Relaxing', 'Intense', 'Casual',
    ];
    const nouns = [
      'Underwater Basketweaving', 'Robotic Basketball', 'Skydiving', 'Cooking',
      'Painting', 'Dance', 'Coding', 'Photography', 'Chess', 'Hiking',
      'Martial Arts', 'Pottery', 'Gardening', 'Astronomy', 'Cycling', 'Yoga',
      'Knitting', 'Sailing', 'Rock Climbing', 'Origami','Mountain Biking',
      'Gravel Bike Adventures','Code Camp'
    ];
  
    const results = [];
    for (let i = 0; i < n; i++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      results.push(`${adj} ${noun}`);
    }
    return results;
  }
  
  /**
   * Generates an array of mock student names. 
   * Customize with your own names as desired.
   *
   * @param {number} n - Number of students
   * @returns {string[]} - Array of generated student names
   */
  function generateMockStudentNames(n) {
    const firstNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George',
      'Hannah', 'Ian', 'Julia', 'Kevin', 'Laura', 'Mike', 'Nina', 'Oscar',
      'Paula', 'Quentin', 'Rachel', 'Steve', 'Tina', 'Uma', 'Victor', 'Wendy',
      'Xander', 'Yvonne', 'Zach','Aarav','Rithika','Sahana','Sahil','Sai',
      'Cameron','Yadiel','Yahir','Yair','Yandel','Yaritza','Yazmin','Yosef',
      'Mohammed','Amir','Ali','Omar','Ahmed','Ibrahim','Abdullah','Yusuf',
        'Aisha','Fatima','Amina','Khadija','Zainab','Maryam','Sara','Noor',
        'Hannah','Sarah','Sophia','Olivia','Emma','Ava','Isabella','Mia',
        'Lauren','Lila','Clara','Grace','Maria','Josefina','Julia','Lucia',
        'Kailen','Kyler','Caleb','Aiden','Ethan','Elijah','Jayden','Michael',
        'Hayden','Mason','Logan','Liam','Noah','Oliver','William','James',
        'Benjamin','Lucas','Henry','Alexander','Daniel','Matthew','David',
        'Sarah','Suzanne','Samantha','Skyler','Raine','Riley','Bug'
    ];
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis',
      'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor',
      'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson',
      'White', 'Lee', 'Perez', 'Clark', 'Lewis', 'Robinson', 'Walker',
      "Nduop','Kumar','Patel','Shah','Singh','Khan','Ali','Hussain','Ahmed",
        'Gonzalez','Nelson','Carter','Mitchell','Perez','Roberts','Turner',
        'Ng','Wong','Wu','Chen','Chang','Chung','Kim','Park','Lee','Choi',
        'Patel','Shah','Singh','Khan','Ali','Hussain','Ahmed','Gonzalez',
        'Hartman','Henderson','Hernandez','Herrera','Hill','Hines','Hinton',
        'Friedrich','Fritz','Stevenson','Stewart','Stiles','Stevens','Szarzynski',
    ];
  
    const names = [];
    for (let i = 1; i <= n; i++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      names.push(`${fn} ${i} ${ln}`);
    }
    return names;
  }
  
  /**
   * Assigns random activity preferences to each student.
   *
   * @param {Object[]} students - Array of student objects, each with a name property
   * @param {string[]} activityNames - Array of possible activity names
   * @param {number} count - Number of activity preferences per student
   */
  function assignActivityPreferences(students, activityNames, count) {
    students.forEach(student => {        
      student.activityPreferences = getRandomUniqueElements(
        [...activityNames,
            ...activityNames.slice(0,20),
            ...activityNames.slice(0,10),
            ...activityNames.slice(0,10),
            ...activityNames.slice(0,10),
            ...activityNames.slice(0,5),
            ...activityNames.slice(0,5),
            ...activityNames.slice(0,5),
            ...activityNames.slice(0,3),
            ...activityNames.slice(0,2), // first activities are more popular...
            ...activityNames.slice(0,2), // first activities are more popular...
            ...activityNames.slice(0,2), // first activities are more popular...
            ...activityNames.slice(0,2), // first activities are more popular...
            ...activityNames.slice(0,2), // first activities are more popular...
        ], count);
    });
  }
  
  /**
   * Assigns random peer preferences to each student (excluding themselves).
   *
   * @param {Object[]} students - Array of student objects
   * @param {number} count - Number of peer preferences per student
   */
  function assignPeerPreferences(students, count) {
    const allNames = students.map(s => s.name);
    students.forEach(student => {
      const possiblePeers = allNames.filter(name => name !== student.name);
      student.peerPreferences = getRandomUniqueElements(
        [...possiblePeers,
            ...possiblePeers.slice(0,100),
            ...possiblePeers.slice(0,50),
            ...possiblePeers.slice(0,20),
            ...possiblePeers.slice(0,10),
            ...possiblePeers.slice(0,8),
            ...possiblePeers.slice(0,5),
            ...possiblePeers.slice(0,5),
            ...possiblePeers.slice(0,3),
            ...possiblePeers.slice(0,2), // first peers are more popular...
            ...possiblePeers.slice(0,2), // first peers are more popular...
            ...possiblePeers.slice(0,2) // first peers are more popular...
        ]
        , count);
    });
  }
  
  /**
   * Assigns weights (importance) for activity vs. peer preferences.
   * Students randomly prioritize either activity or peer preferences.
   *
   * @param {Object[]} students
   * @param {number} activityPrefs
   * @param {number} peerPrefs
   */
  function assignPreferenceWeights(students, activityPrefs, peerPrefs) {
    students.forEach(student => {
      const prioritizeActivity = Math.random() < 0.5;
  
      if (prioritizeActivity) {
        // e.g. 30, 25, 10, 10 for activity; 20, 15, 10, 10 for peers
        student.activityWeights = [30, 25, 10, 10].slice(0, activityPrefs);
        student.peerWeights = [20, 15, 10, 10].slice(0, peerPrefs);
      } else {
        // e.g. 20, 15, 10, 10 for activity; 30, 25, 10, 10 for peers
        student.activityWeights = [20, 15, 10, 10].slice(0, activityPrefs);
        student.peerWeights = [30, 25, 10, 10].slice(0, peerPrefs);
      }
    });
  }
  
  /**
   * Builds a single row of preferences data for insertion into the "Preferences" sheet,
   * matching the column structure defined in setupPreferencesSheet.
   *
   * Order of columns for each student row:
   *  1) IDCOL
   *  2) ASSIGNED_ACTIVITY_COL (blank for mock data)
   *  3) OVERRIDE_COL (blank for mock data)
   *  4) Activity Pref 1, Weight, Activity Pref 2, Weight, ...
   *  5) Peer Pref 1, Weight, Peer Pref 2, Weight, ...
   *
   * @param {Object} student
   * @param {number} activityPrefs
   * @param {number} peerPrefs
   * @returns {Array} - Row data
   */
  function buildPreferenceRow(student, activityPrefs, peerPrefs) {
    const row = [];
  
    // Starter columns from STARTER_COLS: [identifier, activity, override]
    row.push(student.name);   // identifier
    row.push('');             // assigned activity (mock data empty)
    row.push('');             // override (mock data empty)
  
    // Activity preferences + weights
    for (let i = 0; i < activityPrefs; i++) {
      row.push(student.activityPreferences[i] || '');
      row.push(student.activityWeights[i] || '');
    }
  
    // Peer preferences + weights
    for (let i = 0; i < peerPrefs; i++) {
      row.push(student.peerPreferences[i] || '');
      row.push(student.peerWeights[i] || '');
    }
  
    return row;
  }
  
  /**
   * Returns an array of unique random elements from a given array.
   *
   * @param {Array} arr - Source array
   * @param {number} count - Number of elements to extract
   * @returns {Array} - Array of extracted elements (could be fewer if arr is small)
   */
  function getRandomUniqueElements(arr, count) {
    if (count >= arr.length) return [...arr];
  
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }