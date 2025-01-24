import { activityColumnName, preferenceSheetName, activitySheetName } from "./constants";
export const IDCOL = 'identifier';
export const ASSIGNED_ACTIVITY_COL = 'activity';
export const OVERRIDE_COL = 'override';
export const WEIGHT_HEADER = 'wght';
export const SCORE_HEADER = 'score';
export const STARTER_COLS = [IDCOL, ASSIGNED_ACTIVITY_COL, OVERRIDE_COL, SCORE_HEADER];
const WEIGHT_WIDTH = 30;
const ACTIVITY_WIDTH = 100;
const PEER_WIDTH = 150;


export function setupPreferencesSheet(activity_preferences = 4, peer_preferences = 4) {
    let sheet = getPreferencesSheet();
    let columns = STARTER_COLS;

    // Clear all existing data validations and conditional formatting
    sheet.getDataRange().clearDataValidations();
    sheet.clearConditionalFormatRules();

    let weightValidation = SpreadsheetApp.newDataValidation().requireNumberBetween(-100, 100).build();
    let lastRow = Math.max(sheet.getMaxRows(), 2);
    let rules = []; // Store conditional formatting rules

        
    sheet.setColumnWidth(columns.length, 100);

    let scoreColumnIndex = STARTER_COLS.indexOf(SCORE_HEADER) + 1;
    let scoreFormula = [];

    // Loop to handle activity preferences
    for (let i = 0; i < activity_preferences; i++) {
        columns.push(`${activityColumnName} ${i + 1}`);
        sheet.setColumnWidth(columns.length, ACTIVITY_WIDTH);
        columns.push(WEIGHT_HEADER);
        sheet.setColumnWidth(columns.length, WEIGHT_WIDTH);

        sheet.getRange(2, columns.length, lastRow - 1, 1).setDataValidation(weightValidation);

        // Add conditional formatting for activity columns
        let activityColIndex = columns.length - 1; // Activity column index
        let activityRange = sheet.getRange(2, activityColIndex, lastRow - 1);
        let activityRule = SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(`=and(not(isblank($B2)),${sheet.getRange(2, activityColIndex).getA1Notation()}=$B2)`)
            .setBackground('#D9F2D9') // Light green for match
            .setRanges([activityRange])
            .build();
        rules.push(activityRule);

        // Add activity score formula
        let activityScoreFormula = `IF(${sheet.getRange(2, activityColIndex).getA1Notation()}=$B2,${sheet.getRange(2, activityColIndex + 1).getA1Notation()},0)`;
        scoreFormula.push(activityScoreFormula);
    }

    // Loop to handle peer preferences
    for (let i = 0; i < peer_preferences; i++) {
        columns.push(`Peer ${i + 1}`);
        sheet.setColumnWidth(columns.length, PEER_WIDTH);
        columns.push(WEIGHT_HEADER);
        sheet.setColumnWidth(columns.length, WEIGHT_WIDTH);

        sheet.getRange(2, columns.length, lastRow - 1, 1).setDataValidation(weightValidation);

        // Add conditional formatting for peer columns
        let peerColIndex = columns.length - 1; // Peer column index
        let peerRange = sheet.getRange(2, peerColIndex, lastRow - 1);
        let peerRule = SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(
                `=AND(NOT(ISBLANK($B2)),vlookup(${sheet.getRange(2, peerColIndex).getA1Notation()},$A:$B,2,false)=$B2)`
            )
            .setBackground('#F2D9D9') // Light red for match
            .setRanges([peerRange])
            .build();
        rules.push(peerRule);

        // Add peer score formula
        let peerScoreFormula = `IFERROR(IF(VLOOKUP(${sheet.getRange(2, peerColIndex).getA1Notation()},$A:$B,2,FALSE)=$B2,${sheet.getRange(2, peerColIndex + 1).getA1Notation()},0),0)`;
        scoreFormula.push(peerScoreFormula);
    }

    // Combine all score formulas into a single formula
    let combinedScoreFormula = `=IF(ISBLANK($B2), 0, (${scoreFormula.join(" + ")}))`;    
    

    // Apply the score formula to the "Score" column
    sheet.getRange(2, scoreColumnIndex, lastRow - 1).setFormula(combinedScoreFormula);

    // Apply all conditional formatting rules
    sheet.setConditionalFormatRules(rules);

    // Set frozen rows and columns
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);

    // Set column headers
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
}

export function getPreferencesSheet() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(preferenceSheetName);
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(preferenceSheetName);
    }
    return sheet;
}

export function setupActivitiesSheet() {
    let sheet = getActivitiesSheet();
    let columns = ['Activity', 'Capacity', '# Assigned', 'Roster'];
    const preferenceSheetName = 'Preferences';

    // Dynamically retrieve column indexes from STARTER_COLS
    const IDCOL_INDEX = STARTER_COLS.indexOf(IDCOL) + 1;
    const ASSIGNED_ACTIVITY_COL_INDEX = STARTER_COLS.indexOf(ASSIGNED_ACTIVITY_COL) + 1;

    if (IDCOL_INDEX === 0 || ASSIGNED_ACTIVITY_COL_INDEX === 0) {
        throw new Error('IDCOL or ASSIGNED_ACTIVITY_COL not found in STARTER_COLS');
    }

    // Set up the header row
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

    // Add data validation for the Capacity column
    sheet.getRange(2, 2, sheet.getMaxRows(), 1).setDataValidation(
        SpreadsheetApp.newDataValidation().requireNumberBetween(0, 1000).build()
    );

    let lastRow = Math.max(sheet.getMaxRows(), 2); // At least one row of data

    // Add formula for "# Assigned" column using R1C1 notation
    sheet.getRange(2, 3, lastRow - 1, 1).setFormulaR1C1(
        `=IF(NOT(ISBLANK(RC[-2])),COUNTIF('${preferenceSheetName}'!C${ASSIGNED_ACTIVITY_COL_INDEX}, RC[-2]),"")`
    );

    // Add formula for the "Roster" column using R1C1 notation
    sheet.getRange(2, 4, lastRow - 1, 1).setFormulaR1C1(
        `=IF(NOT(ISBLANK(RC[-3])),TRANSPOSE(FILTER('${preferenceSheetName}'!C${IDCOL_INDEX}, '${preferenceSheetName}'!C${ASSIGNED_ACTIVITY_COL_INDEX}=RC[-3])),"")`
    );

    // Adjust column widths for better readability
    sheet.setColumnWidth(1, 200); // Activity
    sheet.setColumnWidth(2, 100); // Capacity
    sheet.setColumnWidth(3, 120); // # Assigned
    sheet.setColumnWidth(4, 300); // Roster
}

export function getActivitiesSheet() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(activitySheetName);
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(activitySheetName);
    }
    return sheet;
}

// Build Sheet Code
// For keeping track of generated schedules and scores

export const ID_HEADER = 'id';
export const ALG_HEADER = 'alg';
export const GEN_HEADER = 'generation';
const BUILD_HEADERS = [SCORE_HEADER,GEN_HEADER,ALG_HEADER,ID_HEADER];

export function getBuildSheet () {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Build');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Build');
        setupBuildSheet(sheet);
    }
    return sheet;
}

export function setupBuildSheet (sheet : GoogleAppsScript.Spreadsheet.Sheet) {        
    sheet.setFrozenRows(1);
    sheet.appendRow(BUILD_HEADERS);
}


