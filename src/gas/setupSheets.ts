import { ActivityPreference, DEFAULT_SCORING_OPTIONS } from "../types";
import {
  activityColumnName,
  preferenceSheetName,
  activitySheetName,
  universalPrefsSheetName,
  buildDataSheetName,
  scoringSettingsSheetName,
} from "./constants";

const log = (...args: unknown[]) => {
  console.log(...args);
};
export const IDCOL = "identifier";
export const ASSIGNED_ACTIVITY_COL = "activity";
export const OVERRIDE_COL = "override";
export const WEIGHT_HEADER = "wght";
export const SCORE_HEADER = "score";
export const LIVE_SCORE_HEADER = "liveScore";
export const COMPUTED_SCORE_HEADER = "computedScore";
export const STARTER_COLS = [
  IDCOL,
  ASSIGNED_ACTIVITY_COL,
  OVERRIDE_COL,
  LIVE_SCORE_HEADER,
  COMPUTED_SCORE_HEADER,
];
const WEIGHT_WIDTH = 30;
const ACTIVITY_WIDTH = 100;
const PEER_WIDTH = 150;

export function setupPreferencesSheet(
  activity_preferences = 4,
  peer_preferences = 4
) {
  let sheet = getPreferencesSheet();
  let columns = [...STARTER_COLS];

  // Clear all existing data validations and conditional formatting
  sheet.getDataRange().clearDataValidations();
  sheet.clearConditionalFormatRules();

  let weightValidation = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(-10000, 10000)
    .build();
  let lastRow = Math.max(sheet.getMaxRows(), 2);
  let rules = []; // Store conditional formatting rules

  sheet.setColumnWidth(columns.length, 100);

  const liveScoreColumnIndex = STARTER_COLS.indexOf(LIVE_SCORE_HEADER) + 1;
  const computedScoreColumnIndex =
    STARTER_COLS.indexOf(COMPUTED_SCORE_HEADER) + 1;
  sheet.setColumnWidth(liveScoreColumnIndex, 100);
  sheet.setColumnWidth(computedScoreColumnIndex, 120);
  let scoreFormula: string[] = [];
  let activityMatchChecks: string[] = [];
  let peerMatchChecks: string[] = [];

  // Loop to handle activity preferences
  for (let i = 0; i < activity_preferences; i++) {
    columns.push(`${activityColumnName} ${i + 1}`);
    sheet.setColumnWidth(columns.length, ACTIVITY_WIDTH);
    columns.push(WEIGHT_HEADER);
    sheet.setColumnWidth(columns.length, WEIGHT_WIDTH);

    // Set validation on the weight column (just added)
    sheet
      .getRange(2, columns.length, lastRow - 1, 1)
      .setDataValidation(weightValidation);

    // Add conditional formatting for activity columns
    let activityColIndex = columns.length - 1; // Activity column index
    let activityRange = sheet.getRange(2, activityColIndex, lastRow - 1);
    let activityRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        `=and(not(isblank($B2)),${sheet
          .getRange(2, activityColIndex)
          .getA1Notation()}=$B2)`
      )
      .setBackground("#D9F2D9") // Light green for match
      .setRanges([activityRange])
      .build();
    rules.push(activityRule);

    // Add activity score formula
    let activityScoreFormula = `IF(${sheet
      .getRange(2, activityColIndex)
      .getA1Notation()}=$B2,${sheet
      .getRange(2, activityColIndex + 1)
      .getA1Notation()},0)`;
    scoreFormula.push(activityScoreFormula);
    activityMatchChecks.push(
      `IF(${sheet.getRange(2, activityColIndex).getA1Notation()}=$B2,1,0)`
    );
  }

  let peerValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(
      sheet.getRange(2, STARTER_COLS.indexOf(IDCOL) + 1, lastRow - 1, 1)
    )
    .build();
  // Loop to handle peer preferences
  for (let i = 0; i < peer_preferences; i++) {
    columns.push(`Peer ${i + 1}`);
    sheet.setColumnWidth(columns.length, PEER_WIDTH);
    columns.push(WEIGHT_HEADER);
    sheet.setColumnWidth(columns.length, WEIGHT_WIDTH);

    // Set validation on the weight column (just added)
    sheet
      .getRange(2, columns.length, lastRow - 1, 1)
      .setDataValidation(weightValidation);

    // Add conditional formatting for peer columns
    let peerColIndex = columns.length - 1; // Peer column index
    let peerRange = sheet.getRange(2, peerColIndex, lastRow - 1);
    // Create new data validation requiring peers to be in our
    // identify column list...
    sheet
      .getRange(2, peerColIndex, lastRow - 1, 1)
      .setDataValidation(peerValidation);
    let peerRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        `=AND(NOT(ISBLANK($B2)),vlookup(${sheet
          .getRange(2, peerColIndex)
          .getA1Notation()},$A:$B,2,false)=$B2)`
      )
      .setBackground("#F2D9D9") // Light red for match
      .setRanges([peerRange])
      .build();
    rules.push(peerRule);

    // Add peer score formula
    let peerScoreFormula = `IFERROR(IF(VLOOKUP(${sheet
      .getRange(2, peerColIndex)
      .getA1Notation()},$A:$B,2,FALSE)=$B2,${sheet
      .getRange(2, peerColIndex + 1)
      .getA1Notation()},0),0)`;
    scoreFormula.push(peerScoreFormula);
    peerMatchChecks.push(
      `IFERROR(IF(VLOOKUP(${sheet
        .getRange(2, peerColIndex)
        .getA1Notation()},$A:$B,2,FALSE)=$B2,1,0),0)`
    );
  }

  // Combine all score formulas into a single formula with penalties
  const peerPenaltyLookup = `IFERROR(VLOOKUP("noPeerPenalty", '${scoringSettingsSheetName}'!A:B, 2, FALSE), 0)`;
  const activityPenaltyLookup = `IFERROR(VLOOKUP("noActivityPenalty", '${scoringSettingsSheetName}'!A:B, 2, FALSE), 0)`;

  const positiveTerms =
    scoreFormula.length > 0 ? scoreFormula.join(" + ") : "0";
  const peerPenaltyFormula =
    peerMatchChecks.length > 0
      ? `IF((${peerMatchChecks.join(" + ")})=0, ${peerPenaltyLookup}, 0)`
      : "0";
  const activityPenaltyFormula =
    activityMatchChecks.length > 0
      ? `IF((${activityMatchChecks.join(
          " + "
        )})=0, ${activityPenaltyLookup}, 0)`
      : "0";
  const penaltyTerms = `${peerPenaltyFormula} + ${activityPenaltyFormula}`;

  const combinedScoreFormula = `=IF(ISBLANK($B2), 0, ((${positiveTerms}) - (${penaltyTerms})))`;

  // Apply all conditional formatting rules
  sheet.setConditionalFormatRules(rules);

  // Set frozen rows and columns
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Set column headers
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

  sheet
    .getRange(2, liveScoreColumnIndex, lastRow - 1)
    .setFormula(combinedScoreFormula);
  log(
    "setupPreferencesSheet: wrote live score formula to column",
    liveScoreColumnIndex,
    "covering",
    lastRow - 1,
    "rows"
  );
  // Ensure scoring settings sheet exists with defaults if missing
  getScoringSettingsSheet();
}

export function getPreferencesSheet() {
  let sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(preferenceSheetName);
  if (!sheet) {
    sheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet(preferenceSheetName);
  }
  return sheet;
}

export function setupActivitiesSheet() {
  let sheet = getActivitiesSheet();
  let columns = ["Activity", "Capacity", "Minimum", "# Assigned", "Roster"];
  const preferenceSheetName = "Preferences";

  // Dynamically retrieve column indexes from STARTER_COLS
  const IDCOL_INDEX = STARTER_COLS.indexOf(IDCOL) + 1;
  const ASSIGNED_ACTIVITY_COL_INDEX =
    STARTER_COLS.indexOf(ASSIGNED_ACTIVITY_COL) + 1;

  if (IDCOL_INDEX === 0 || ASSIGNED_ACTIVITY_COL_INDEX === 0) {
    throw new Error("IDCOL or ASSIGNED_ACTIVITY_COL not found in STARTER_COLS");
  }

  // Set up the header row
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

  // Add data validation for the Capacity column
  sheet
    .getRange(2, 2, sheet.getMaxRows(), 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation().requireNumberBetween(0, 1000).build()
    );

  // Add data validation for the Minimum column
  sheet
    .getRange(2, 3, sheet.getMaxRows(), 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation().requireNumberBetween(0, 1000).build()
    );

  let lastRow = Math.max(sheet.getMaxRows(), 2); // At least one row of data

  // Add formula for "# Assigned" column using R1C1 notation (now column 4)
  sheet
    .getRange(2, 4, lastRow - 1, 1)
    .setFormulaR1C1(
      `=IF(NOT(ISBLANK(RC[-3])),COUNTIF('${preferenceSheetName}'!C${ASSIGNED_ACTIVITY_COL_INDEX}, RC[-3]),"")`
    );

  // Add formula for the "Roster" column using R1C1 notation (now column 5)
  sheet
    .getRange(2, 5, lastRow - 1, 1)
    .setFormulaR1C1(
      `=IF(NOT(ISBLANK(RC[-4])),TRANSPOSE(FILTER('${preferenceSheetName}'!C${IDCOL_INDEX}, '${preferenceSheetName}'!C${ASSIGNED_ACTIVITY_COL_INDEX}=RC[-4])),"")`
    );

  // Adjust column widths for better readability
  sheet.setColumnWidth(1, 200); // Activity
  sheet.setColumnWidth(2, 100); // Capacity
  sheet.setColumnWidth(3, 100); // Minimum
  sheet.setColumnWidth(4, 120); // # Assigned
  sheet.setColumnWidth(5, 300); // Roster
}

export function getActivitiesSheet() {
  let sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(activitySheetName);
  if (!sheet) {
    sheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet(activitySheetName);
  }
  return sheet;
}

// Build Sheet Code
// For keeping track of generated schedules and scores

export const ID_HEADER = "id";
export const ALG_HEADER = "alg";
export const GEN_HEADER = "generation";

export const HASH_HEADER = "hash";
const BUILD_HEADERS = [
  SCORE_HEADER,
  GEN_HEADER,
  ALG_HEADER,
  ID_HEADER,
  HASH_HEADER,
];

export function getBuildSheet() {
  let sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(buildDataSheetName);
  if (!sheet) {
    sheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet(buildDataSheetName);
    setupBuildSheet(sheet);
  }
  return sheet;
}

export function setupBuildSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  sheet.setFrozenRows(1);
  sheet.appendRow(BUILD_HEADERS);
}

export function getUniversalPrefsSheet() {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    universalPrefsSheetName
  );
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(
      universalPrefsSheetName
    );
    setupUniversalPrefsSheet(sheet);
  }
  return sheet;
}

export function getScoringSettingsSheet() {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    scoringSettingsSheetName
  );
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(
      scoringSettingsSheetName
    );
    setupScoringSettingsSheet(sheet);
  }
  return sheet;
}

export function setupScoringSettingsSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): void;
export function setupScoringSettingsSheet(): void;
export function setupScoringSettingsSheet(
  sheet?: GoogleAppsScript.Spreadsheet.Sheet
) {
  if (!sheet) {
    sheet = getScoringSettingsSheet();
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
  const entries = Object.entries(DEFAULT_SCORING_OPTIONS);
  if (entries.length) {
    sheet.getRange(2, 1, entries.length, 2).setValues(entries);
  }
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
}

export function getUniversalPrefsData(): ActivityPreference[] {
  let sheet = getUniversalPrefsSheet();
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let activityIndex = headers.indexOf("activity");
  let weightIndex = headers.indexOf("weight");
  let prefs: ActivityPreference[] = [];
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let activity = row[activityIndex];
    let weight = row[weightIndex];
    prefs.push({ activity, weight });
  }
  return prefs;
}

export function setupUniversalPrefsSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
) {
  let columns = ["activity", "weight"];
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
}
