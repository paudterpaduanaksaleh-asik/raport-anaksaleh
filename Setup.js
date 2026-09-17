/**
 * ============================================================================
 * MODUL SETUP & INISIALISASI DATABASE (SHEETS & DRIVE)
 * PG - TK - DAYCARE ANAK SALEH
 * ============================================================================
 */

/**
 * Inisialisasi awal database Spreadsheet & Folder Google Drive
 */
function initialSetup() {
  try {
    var props = PropertiesService.getScriptProperties();
    var ss = getDatabaseSpreadsheet();

    if (!ss) {
      ss = SpreadsheetApp.create("DB_RAPORT_ANAK_SALEH");
      props.setProperty(CONFIG.PROP_SHEET_ID_KEY, ss.getId());
    }

    // 1. Setup Sheet Pengguna (Admin, Kepala Sekolah, Wali Kelas/Guru)
    setupSheetUsers(ss);

    // 2. Setup Sheet Data Murid
    setupSheetMurid(ss);

    // 3. Setup Sheet Data Kelompok
    setupSheetKelompok(ss);

    // 4. Setup Sheet Tahun Pelajaran & Akses
    setupSheetTahunAjaran(ss);

    // 5. Setup Sheet Data Raport (dengan alur Approval & Revisi)
    setupSheetRaport(ss);

    // 6. Setup Sheet Log Aktivitas
    setupSheetLogAktivitas(ss);

    // 7. Setup Root Folder Google Drive
    getOrCreateRootFolder();

    // Hapus sheet default "Sheet1" / "Sheet1" jika ada
    var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
    if (defaultSheet && ss.getSheets().length > 1) {
      try { ss.deleteSheet(defaultSheet); } catch (e) {}
    }

    logActivity("SYSTEM", "SETUP", "Inisialisasi Database", "Database PG - TK - DAYCARE Anak Saleh berhasil diinisialisasi.");
    return apiResponse(true, { spreadsheetId: ss.getId(), url: ss.getUrl() }, "Inisialisasi database dan struktur raport berhasil!");
  } catch (err) {
    return apiResponse(false, null, "Gagal inisialisasi: " + err.message);
  }
}

/**
 * 1. Sheet DB_Users (Admin, Kepala Sekolah, Guru/Wali Kelas)
 */
function setupSheetUsers(ss) {
  var sheet = ss.getSheetByName("DB_Users");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Users");
  } else {
    sheet.clear();
  }

  var headers = [
    "ID_User", "Username", "Password", "Nama_Lengkap", "Role", "Kelompok_Diampu", "Kontak_WA", "Status", "Timestamp"
  ];
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length, "#0f766e");

  // Data Default Pengguna (Admin, Kepsek, 4 Guru Kelompok)
  var defaultUsers = [
    ["USR-ADM-01", "admin", "admin123", "Administrator Portal", "ADMIN", "SEMUA", "081234567890", "AKTIF", new Date()],
    ["USR-KPS-01", "kepsek", "kepsek123", "Hj. Siti Aminah, M.Pd.", "KEPSEK", "SEMUA", "081234567891", "AKTIF", new Date()],
    ["USR-GUR-01", "bunda.nurul", "guru123", "Bunda Nurul Hidayah, S.Pd.", "WALI_KELAS", "TK-A1", "081234567892", "AKTIF", new Date()],
    ["USR-GUR-02", "bunda.fatimah", "guru123", "Bunda Fatimah Az-Zahra, S.Pd.", "WALI_KELAS", "TK-B1", "081234567893", "AKTIF", new Date()],
    ["USR-GUR-03", "bunda.aisyah", "guru123", "Bunda Aisyah Humaira, S.Pd.", "WALI_KELAS", "KB-A", "081234567894", "AKTIF", new Date()],
    ["USR-GUR-04", "bunda.maryam", "guru123", "Bunda Maryam Shalihah, S.Pd.", "WALI_KELAS", "DC-1", "081234567895", "AKTIF", new Date()]
  ];

  for (var i = 0; i < defaultUsers.length; i++) {
    sheet.appendRow(defaultUsers[i]);
  }
}

/**
 * 2. Sheet DB_Murid (Data Master Murid PG, TK, Daycare)
 */
function setupSheetMurid(ss) {
  var sheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Murid");
  } else {
    sheet.setName("DB_Murid");
    sheet.clear();
  }

  var headers = [
    "NIS", "Nama_Lengkap", "Nama_Panggilan", "Jenis_Kelamin", "Jenjang", "ID_Kelompok", 
    "Tempat_Lahir", "Tanggal_Lahir", "Nama_Ayah", "Nama_Ibu", "Kontak_Ortu", "Status_Murid", "Alamat", "PIN_Akses", "Timestamp"
  ];
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length, "#0369a1");

  // Sample data murid
  var defaultMurid = [
    ["202601001", "Muhammad Al-Fatih Pratama", "Fatih", "L", "TK-A", "TK-A1", "Jakarta", "2021-03-15", "Hendra Pratama", "Rina Kartika", "081122334455", "AKTIF", "Jl. Melati No. 12, Kebayoran", "150321", new Date()],
    ["202601002", "Aisyah Zahira Putri", "Zahira", "P", "TK-A", "TK-A1", "Jakarta", "2021-05-20", "Rudi Hartono", "Siti Nurhaliza", "081122334456", "AKTIF", "Jl. Mawar Indah Blok B4", "200521", new Date()],
    ["202601003", "Kenzo Ahmad Rayyan", "Kenzo", "L", "TK-B", "TK-B1", "Depok", "2020-08-10", "Dedi Setiadi", "Ratna Sari", "081122334457", "AKTIF", "Jl. Anggrek Raya No. 45", "100820", new Date()],
    ["202601004", "Maryam Khadijah Azzahra", "Maryam", "P", "TK-B", "TK-B1", "Tangerang", "2020-11-25", "Yusuf Mansur", "Fatimah Zahra", "081122334458", "AKTIF", "Perumahan Cempaka Hijau No. 7", "251120", new Date()],
    ["202601005", "Arkan Bilal Ramadhan", "Bilal", "L", "Playgroup (PG)", "KB-A", "Jakarta", "2022-04-12", "Fajar Ramadhan", "Dewi Lestari", "081122334459", "AKTIF", "Jl. Kenanga Timur No. 3", "120422", new Date()],
    ["202601006", "Hafizhah Humaira Syakirah", "Maira", "P", "Daycare", "DC-1", "Jakarta", "2023-01-08", "Agus Santoso", "Laila Majnun", "081122334460", "AKTIF", "Jl. Flamboyan No. 18", "080123", new Date()]
  ];

  for (var i = 0; i < defaultMurid.length; i++) {
    sheet.appendRow(defaultMurid[i]);
  }
}

/**
 * 3. Sheet DB_Kelompok (Data Kelompok Belajar / Rombel)
 */
function setupSheetKelompok(ss) {
  var sheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Kelompok");
  } else {
    sheet.setName("DB_Kelompok");
    sheet.clear();
  }

  var headers = [
    "ID_Kelompok", "Nama_Kelompok", "Jenjang", "ID_Wali_Kelas", "Nama_Wali_Kelas", "Kapasitas", "Tahun_Ajaran", "Status", "Timestamp"
  ];
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length, "#4338ca");

  var defaultKelompok = [
    ["TK-A1", "Kelompok TK-A Bintang Ceria", "TK-A", "USR-GUR-01", "Bunda Nurul Hidayah, S.Pd.", 15, "2025/2026", "AKTIF", new Date()],
    ["TK-B1", "Kelompok TK-B Matahari Hebat", "TK-B", "USR-GUR-02", "Bunda Fatimah Az-Zahra, S.Pd.", 15, "2025/2026", "AKTIF", new Date()],
    ["KB-A", "Kelompok Bermain (PG) Pelangi", "Playgroup (PG)", "USR-GUR-03", "Bunda Aisyah Humaira, S.Pd.", 12, "2025/2026", "AKTIF", new Date()],
    ["DC-1", "Daycare Anak Saleh Kasih Bunda", "Daycare", "USR-GUR-04", "Bunda Maryam Shalihah, S.Pd.", 10, "2025/2026", "AKTIF", new Date()]
  ];

  for (var i = 0; i < defaultKelompok.length; i++) {
    sheet.appendRow(defaultKelompok[i]);
  }
}

/**
 * 4. Sheet DB_TahunAjaran (Tahun Pelajaran & Akses)
 */
function setupSheetTahunAjaran(ss) {
  var sheet = ss.getSheetByName("DB_TahunAjaran");
  if (!sheet) {
    sheet = ss.insertSheet("DB_TahunAjaran");
  } else {
    sheet.clear();
  }

  var headers = [
    "ID_TahunAjaran", "Nama_Tahun", "Semester", "Status_Aktif", "Status_Akses_Ortu", "Tanggal_Mulai", "Tanggal_Selesai", "Timestamp"
  ];
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length, "#b45309");

  var defaultTA = [
    ["TA-2025-2026-1", "2025/2026", "Ganjil", "AKTIF", "DIBUKA", "2025-07-15", "2025-12-20", new Date()],
    ["TA-2025-2026-2", "2025/2026", "Genap", "NONAKTIF", "DITUTUP", "2026-01-05", "2026-06-20", new Date()],
    ["TA-2024-2025-2", "2024/2025", "Genap", "NONAKTIF", "DIBUKA", "2025-01-06", "2025-06-21", new Date()]
  ];

  for (var i = 0; i < defaultTA.length; i++) {
    sheet.appendRow(defaultTA[i]);
  }
}

/**
 * 5. Sheet DB_Raport (Laporan Nilai, File PDF, Status Approval & Revisi)
 */
function setupSheetRaport(ss) {
  var sheet = ss.getSheetByName("DB_Raport");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Raport");
  } else {
    sheet.clear();
  }

  var headers = [
    "ID_Raport", "NIS", "ID_Kelompok", "ID_TahunAjaran", "Semester", 
    "URL_PDF", "File_ID", "Catatan_Perkembangan", "Status_Approval", "Catatan_Revisi", 
    "Uploader_User", "Reviewed_By", "Tanggal_Review", "Tanggal_Dilihat_Ortu", "Nama_Wali_Konfirmasi", "Timestamp"
  ];
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length, "#be123c");
}

/**
 * 6. Sheet DB_LogAktivitas (Audit Trail)
 */
function setupSheetLogAktivitas(ss) {
  var sheet = ss.getSheetByName("DB_LogAktivitas");
  if (!sheet) {
    sheet = ss.insertSheet("DB_LogAktivitas");
  } else {
    sheet.clear();
  }

  var headers = ["Timestamp", "User", "Role", "Aktivitas", "Detail"];
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers.length, "#334155");
}

/**
 * Helper pewarnaan baris Header pada Spreadsheet
 */
function formatHeaderRow(sheet, colCount, hexColor) {
  var range = sheet.getRange(1, 1, 1, colCount);
  range.setBackground(hexColor);
  range.setFontColor("#ffffff");
  range.setFontWeight("bold");
  range.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

/**
 * Helper untuk reset data simulasi jika ingin uji coba ulang
 */
function resetDataForSimulation() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database Spreadsheet tidak ditemukan.");

    // Re-run setup
    setupSheetUsers(ss);
    setupSheetMurid(ss);
    setupSheetKelompok(ss);
    setupSheetTahunAjaran(ss);
    setupSheetRaport(ss);
    setupSheetLogAktivitas(ss);

    logActivity("ADMIN", "ADMIN", "Reset Data Simulasi", "Seluruh data master, kelompok, dan murid berhasil di-reset untuk simulasi baru.");
    return apiResponse(true, null, "Data master, kelompok, murid, dan pengguna berhasil direset untuk simulasi baru!");
  } catch (err) {
    return apiResponse(false, null, "Gagal mereset data: " + err.message);
  }
}
