/**
 * ============================================================================
 * SISTEM DASHBOARD RAPORT DIGITAL PG - TK - DAYCARE ANAK SALEH
 * Backend: Google Apps Script (GAS)
 * ============================================================================
 */

// Konfigurasi Utama
var CONFIG = {
  APP_NAME: "Portal Raport Anak Saleh",
  SCHOOL_NAME: "PG - TK - DAYCARE ANAK SALEH",
  SCHOOL_TAGLINE: "Membina Generasi Saleh, Cerdas, dan Berakhlak Mulia",
  DEFAULT_DRIVE_FOLDER_NAME: "RAPORT_ANAK_SALEH_STORAGE",
  PROP_SHEET_ID_KEY: "SPREADSHEET_ID",
  PROP_ROOT_FOLDER_KEY: "ROOT_FOLDER_ID"
};

/**
 * Entry point HTTP GET untuk Google Apps Script Web App
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  
  template.appConfig = {
    appName: CONFIG.APP_NAME,
    schoolName: CONFIG.SCHOOL_NAME,
    schoolTagline: CONFIG.SCHOOL_TAGLINE
  };

  return template.evaluate()
    .setTitle(CONFIG.SCHOOL_NAME + " - Dashboard Raport")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk menyertakan file HTML partial (CSS, JS, View)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Helper untuk mendapatkan instance Spreadsheet Database aktif
 */
function getDatabaseSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(CONFIG.PROP_SHEET_ID_KEY);
  
  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (err) {
      console.warn("Spreadsheet ID tersimpan tidak dapat dibuka: " + err.message);
    }
  }
  
  // Jika script ditempel di dalam Spreadsheet (Container-bound script)
  try {
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      props.setProperty(CONFIG.PROP_SHEET_ID_KEY, activeSpreadsheet.getId());
      return activeSpreadsheet;
    }
  } catch (e) {}

  // Fallback: Cari spreadsheet bernama "DB_RAPORT_ANAK_SALEH" di Drive
  var files = DriveApp.getFilesByName("DB_RAPORT_ANAK_SALEH");
  if (files.hasNext()) {
    var file = files.next();
    props.setProperty(CONFIG.PROP_SHEET_ID_KEY, file.getId());
    return SpreadsheetApp.openById(file.getId());
  }

  return null;
}

/**
 * Helper untuk mendapatkan atau membuat Root Folder Google Drive untuk file raport
 */
function getOrCreateRootFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty(CONFIG.PROP_ROOT_FOLDER_KEY);
  
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn("Folder ID tersimpan tidak valid: " + e.message);
    }
  }
  
  var folders = DriveApp.getFoldersByName(CONFIG.DEFAULT_DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    var existingFolder = folders.next();
    props.setProperty(CONFIG.PROP_ROOT_FOLDER_KEY, existingFolder.getId());
    return existingFolder;
  }
  
  // Buat folder baru jika belum ada
  var newFolder = DriveApp.createFolder(CONFIG.DEFAULT_DRIVE_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  props.setProperty(CONFIG.PROP_ROOT_FOLDER_KEY, newFolder.getId());
  return newFolder;
}

/**
 * Helper response format seragam untuk semua panggilan AJAX (Aman Serialisasi GAS)
 */
function apiResponse(success, data, message) {
  var cleanData = null;
  if (data !== undefined && data !== null) {
    try {
      cleanData = JSON.parse(JSON.stringify(data));
    } catch (e) {
      cleanData = String(data);
    }
  }
  return {
    success: !!success,
    data: cleanData,
    message: String(message || (success ? "Berhasil" : "Terjadi kesalahan"))
  };
}

/**
 * Helper untuk mencatat log aktivitas
 */
function logActivity(user, role, action, detail) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName("DB_LogAktivitas");
    if (!sheet) return;
    
    sheet.appendRow([
      new Date(),
      user || "Anonim",
      role || "-",
      action || "-",
      detail || "-"
    ]);
  } catch (err) {
    console.error("Gagal mencatat log: " + err.message);
  }
}
