export interface AddOnInterface {
  initUi: () => GoogleAppsScript.Base.Ui;
  addToMenu: (menu: GoogleAppsScript.Base.Menu) => void;
}

export interface UniversalMenuInterface {
  addToMenu: (menu: GoogleAppsScript.Base.Menu) => void;
}

const universalMenu: UniversalMenuInterface = {
  addToMenu(menu: GoogleAppsScript.Base.Menu) {
    menu.addItem("Open Scheduler", "showSidebar");
  },
};

export function getAddOnEnvironment():
  | "Slides"
  | "Docs"
  | "Sheets"
  | "Unknown" {
  return "Sheets";
}

export function onOpen(e: any): void {
  // Call all registered AddOn onOpen methods...
  let ui: GoogleAppsScript.Base.Ui;
  const menu = SpreadsheetApp.getUi().createMenu("CAMP");
  universalMenu.addToMenu(menu);
  menu.addToUi();
}

export function onInstall(e: any): void {
  // Call all registered AddOn onInstall methods
  // According to Google Apps Script documentation, onInstall should call onOpen
  // to set up the menu on first installation
  onOpen(e);
}
