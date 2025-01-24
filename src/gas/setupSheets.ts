import { activityColumnName } from "./constants";
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
            .whenFormulaSatisfied(`=and(not(isblank($B2),${sheet.getRange(2, activityColIndex).getA1Notation()}=$B2)`)
            .setBackground('#D9F2D9') // Light green for match
            .setRanges([activityRange])
            .build();
        rules.push(activityRule);
    }

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
                `=vlookup(${sheet.getRange(2, peerColIndex).getA1Notation()},$A:$B,2,false)=$B2`
            )
            .setBackground('#F2D9D9') // Light red for match
            .setRanges([peerRange])
            .build();
        rules.push(peerRule);
    }

    // Apply all conditional formatting rules
    sheet.setConditionalFormatRules(rules);

    // Set frozen rows and columns
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);

    // Set column headers
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
}

export function getPreferencesSheet() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Preferences');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Preferences');
    }
    return sheet;
}

export function setupActivitiesSheet () {
    let sheet = getActivitiesSheet();
    let columns = ['Activity', 'Capacity'];
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);    
    sheet.getRange(1,1,1,columns.length).setValues([columns]);    
    sheet.getRange(2,2,1,1).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0,1000).build());
}

export function getActivitiesSheet() {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activities');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Activities');
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


