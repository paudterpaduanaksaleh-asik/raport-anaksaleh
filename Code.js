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
  var action = e && e.parameter ? e.parameter.action : null;
  var callback = e && e.parameter ? e.parameter.callback : null;

  // Jika dipanggil via API query parameter (JSON atau JSONP)
  if (action) {
    var args = [];
    if (e.parameter.args) {
      try {
        args = JSON.parse(e.parameter.args);
      } catch (err) {
        args = [e.parameter.args];
      }
    }
    var result = executeAction(action, args);

    if (callback) {
      var jsonpText = String(callback) + "(" + JSON.stringify(result) + ");";
      return ContentService.createTextOutput(jsonpText)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

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
 * Entry point HTTP POST untuk API eksternal (GitHub Pages, dsb.)
 */
function doPost(e) {
  try {
    var rawData = e && e.postData ? e.postData.contents : null;
    var parsed = {};
    if (rawData) {
      try {
        parsed = JSON.parse(rawData);
      } catch (err) {
        parsed = e.parameter || {};
      }
    } else if (e && e.parameter) {
      parsed = e.parameter;
    }

    var action = parsed.action || "";
    var args = parsed.args || [];
    
    var result = executeAction(action, args);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Server Error: " + err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Dispatcher untuk mengeksekusi fungsi backend berdasarkan nama aksi
 */
function executeAction(action, args) {
  if (!Array.isArray(args)) args = [];
  
  switch (action) {
    case 'handleLogin':
      return handleLogin(args[0]);
    case 'getAdminAllData':
      return getAdminAllData();
    case 'getAdminDashboardSummary':
      return getAdminDashboardSummary();
    case 'getStudentsListAdmin':
      return getStudentsListAdmin(args[0], args[1]);
    case 'saveStudentAdmin':
      return saveStudentAdmin(args[0], args[1]);
    case 'bulkSaveStudentsAdmin':
      return bulkSaveStudentsAdmin(args[0], args[1]);
    case 'deleteStudentAdmin':
      return deleteStudentAdmin(args[0], args[1]);
    case 'getTeachersListAdmin':
      return getTeachersListAdmin();
    case 'saveTeacherAdmin':
      return saveTeacherAdmin(args[0], args[1]);
    case 'resetTeacherPasswordAdmin':
    case 'resetPasswordTeacherAdmin':
      return resetTeacherPasswordAdmin(args[0], args[1], args[2]);
    case 'deleteTeacherAdmin':
      return deleteTeacherAdmin(args[0], args[1]);
    case 'getClassesListAdmin':
      return getClassesListAdmin();
    case 'saveClassAdmin':
      return saveClassAdmin(args[0], args[1]);
    case 'deleteClassAdmin':
      return deleteClassAdmin(args[0], args[1]);
    case 'getClassStudentsAdmin':
      return getClassStudentsAdmin(args[0]);
    case 'getAcademicYearsListAdmin':
      return getAcademicYearsListAdmin();
    case 'saveAcademicYearAdmin':
      return saveAcademicYearAdmin(args[0], args[1]);
    case 'deleteAcademicYearAdmin':
      return deleteAcademicYearAdmin(args[0], args[1]);
    case 'setAcademicYearSettingsAdmin':
      return setAcademicYearSettingsAdmin(args[0], args[1], args[2], args[3]);
    case 'saveSchoolSettingsAdmin':
      return saveSchoolSettingsAdmin(args[0], args[1]);
    case 'getSchoolSettingsAdmin':
      return getSchoolSettingsAdmin();
    case 'toggleReportPublishStatus':
      return toggleReportPublishStatus(args[0], args[1], args[2]);
    case 'getActivityLogsAdmin':
      return getActivityLogsAdmin(args[0]);
    // Endpoint Kepala Sekolah
    case 'getKepsekDashboardSummary':
      return getKepsekDashboardSummary();
    case 'getKepsekReportsList':
      return getKepsekReportsList(args[0], args[1]);
    case 'approveReportKepsek':
      return approveReportKepsek(args[0], args[1]);
    case 'rejectReportKepsek':
      return rejectReportKepsek(args[0], args[1], args[2]);
    case 'bulkApproveReportsKepsek':
      return bulkApproveReportsKepsek(args[0], args[1]);
    // Endpoint Wali Kelas
    case 'getTeacherClassStudents':
      return getTeacherClassStudents(args[0]);
    case 'uploadStudentReport':
      return uploadStudentReport(args[0]);
    case 'submitReportToKepsek':
      return submitReportToKepsek(args[0], args[1]);
    case 'deleteStudentReport':
      return deleteStudentReport(args[0], args[1]);
    // Endpoint Wali Murid
    case 'getParentStudentReports':
      return getParentStudentReports(args[0]);
    case 'confirmReportViewedByParent':
      return confirmReportViewedByParent(args[0], args[1]);
    case 'resetDataForSimulation':
      return resetDataForSimulation();
    case 'syncAllDataAdmin':
      return syncAllDataAdmin(args[0], args[1]);
    case 'initialSetup':
      return initialSetup();
    default:
      return { success: false, message: "Aksi '" + action + "' tidak dikenali di server." };
  }
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
