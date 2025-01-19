const IDX = "index.html"; // file name for svelte output
const APPNAME = `CAMP`;

import { getAddOnEnvironment } from "./addOn";

export function doGet(e) {
  return HtmlService.createHtmlOutputFromFile(IDX);
}

export function showSidebar() {
  let template = HtmlService.createTemplateFromFile(IDX);
  let addOn = getAddOnEnvironment();
  template.context = `${addOn}.sidebar`;
  let html = template.evaluate();
  let app = SpreadsheetApp;
  if (app) {
    app.getUi().showSidebar(html);
  }
}


export function showDialog(title: string = APPNAME, modal = true) {
  let addOn = getAddOnEnvironment();
  let template = HtmlService.createTemplateFromFile(IDX);
  let context = `${addOn}.dialog.${modal ? "modal" : "modeless"}`;
  template.context = template;
  let app = getAppForAddOn(addOn);
  let html = template.evaluate();
  if (modal) {
    app.getUi().showModalDialog(html, title);
  } else {
    app.getUi().showModelessDialog(html, title);
  }
}
