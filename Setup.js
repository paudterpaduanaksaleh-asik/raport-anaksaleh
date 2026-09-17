/**
 * ============================================================================
 * SETUP & INISIALISASI DATABASE & GOOGLE DRIVE
 * Digunakan untuk pertama kali setup sistem secara otomatis (1-Click)
 * ============================================================================
 */

/**
 * Inisialisasi Database Spreadsheet dan Folder Drive
 * Bisa dipanggil langsung dari Script Editor atau melalui antarmuka Admin
 */
function initialSetup() {
  try {
    var props = PropertiesService.getScriptProperties();
    var ss = getDatabaseSpreadsheet();
    
    // 1. Buat Spreadsheet baru jika belum ada
    if (!ss) {
      ss = SpreadsheetApp.create("DB_RAPORT_ANAK_SALEH");
      props.setProperty(CONFIG.PROP_SHEET_ID_KEY, ss.getId());
    }

    // 2. Buat atau perbarui Sheet DB_Users
    setupSheetUsers(ss);

    // 3. Buat atau perbarui Sheet DB_Siswa
    setupSheetSiswa(ss);

    // 4. Buat atau perbarui Sheet DB_Kelas
    setupSheetKelas(ss);

    // 5. Buat atau perbarui Sheet DB_TahunAjaran
    setupSheetTahunAjaran(ss);

    // 6. Buat atau perbarui Sheet DB_Raport
    setupSheetRaport(ss);

    // 7. Buat atau perbarui Sheet DB_LogAktivitas
    setupSheetLogAktivitas(ss);

    // 8. Inisialisasi Folder Root Google Drive
    var rootFolder = getOrCreateRootFolder();

    // Catat log instalasi
    logActivity("SYSTEM", "ADMIN", "INITIAL_SETUP", "Inisialisasi sistem database dan storage Google Drive berhasil.");

    return apiResponse(true, {
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      driveFolderId: rootFolder.getId(),
      driveFolderUrl: rootFolder.getUrl()
    }, "Inisialisasi Database & Google Drive berhasil dilakukan!");

  } catch (err) {
    console.error("Setup Error: " + err.stack);
    return apiResponse(false, null, "Gagal inisialisasi: " + err.message);
  }
}

function setupSheetUsers(ss) {
  var sheet = ss.getSheetByName("DB_Users");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Users");
  }
  
  var headers = ["User_ID", "Username", "Password", "Nama_Lengkap", "Role", "Kelas_Diampu", "No_HP", "Status"];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length, "#0F766E"); // Deep Teal

    // Data Sample Pengguna Awal
    var sampleUsers = [
      ["USR001", "admin", "admin123", "Administrator Utama", "ADMIN", "SEMUA", "081234567890", "AKTIF"],
      ["USR002", "guru.pg", "guru123", "Ustadzah Fatimah, S.Pd", "WALI_KELAS", "PG-A", "081234567891", "AKTIF"],
      ["USR003", "guru.tka", "guru123", "Ustadzah Aisyah, S.Pd", "WALI_KELAS", "TK-A1", "081234567892", "AKTIF"],
      ["USR004", "guru.tkb", "guru123", "Ustadzah Khadijah, S.Pd", "WALI_KELAS", "TK-B1", "081234567893", "AKTIF"],
      ["USR005", "guru.daycare", "guru123", "Ustadzah Maryam", "WALI_KELAS", "DAYCARE-A", "081234567894", "AKTIF"]
    ];
    sheet.getRange(2, 1, sampleUsers.length, headers.length).setValues(sampleUsers);
  }
}

function setupSheetSiswa(ss) {
  var sheet = ss.getSheetByName("DB_Siswa");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Siswa");
  }

  var headers = ["NIS", "NISN", "Nama_Siswa", "Panggilan", "Jenjang", "Kelas", "Jenis_Kelamin", "Tanggal_Lahir", "Nama_Orangtua", "No_WA_Ortu", "PIN_Ortu", "Status"];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length, "#0369A1"); // Ocean Blue

    // Data Sample Siswa
    var sampleSiswa = [
      ["202601", "0012345001", "Muhammad Al-Fatih", "Fatih", "Playgroup (PG)", "PG-A", "Laki-laki", "2023-05-12", "Bapak Rahmat & Ibu Siti", "081200000001", "1234", "AKTIF"],
      ["202602", "0012345002", "Zahra Alya Putri", "Zahra", "Playgroup (PG)", "PG-A", "Perempuan", "2023-08-20", "Bapak Hendra & Ibu Dina", "081200000002", "1234", "AKTIF"],
      ["202603", "0012345003", "Ahmad Zaidan Robbani", "Zaidan", "TK-A", "TK-A1", "Laki-laki", "2022-03-15", "Bapak Faisal & Ibu Nur", "081200000003", "1234", "AKTIF"],
      ["202604", "0012345004", "Humaira Medina", "Medina", "TK-A", "TK-A1", "Perempuan", "2022-07-08", "Bapak Arif & Ibu Maya", "081200000004", "1234", "AKTIF"],
      ["202605", "0012345005", "Ibrahim Rayyan Malik", "Rayyan", "TK-B", "TK-B1", "Laki-laki", "2021-01-25", "Bapak Danang & Ibu Wati", "081200000005", "1234", "AKTIF"],
      ["202606", "0012345006", "Khansa Salsabila", "Khansa", "TK-B", "TK-B1", "Perempuan", "2021-09-11", "Bapak Eko & Ibu Rina", "081200000006", "1234", "AKTIF"],
      ["202607", "0012345007", "Bilal Arkananta", "Bilal", "Daycare", "DAYCARE-A", "Laki-laki", "2024-02-14", "Bapak Yoga & Ibu Lestari", "081200000007", "1234", "AKTIF"]
    ];
    sheet.getRange(2, 1, sampleSiswa.length, headers.length).setValues(sampleSiswa);
  }
}

function setupSheetKelas(ss) {
  var sheet = ss.getSheetByName("DB_Kelas");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Kelas");
  }

  var headers = ["ID_Kelas", "Nama_Kelas", "Jenjang", "ID_Wali_Kelas", "Nama_Wali_Kelas", "Kapasitas"];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length, "#7C3AED"); // Purple

    var sampleKelas = [
      ["PG-A", "Kelas Al-Kautsar (PG)", "Playgroup (PG)", "USR002", "Ustadzah Fatimah, S.Pd", 15],
      ["TK-A1", "Kelas Ar-Rahman (TK-A)", "TK-A", "USR003", "Ustadzah Aisyah, S.Pd", 20],
      ["TK-B1", "Kelas Al-Ikhlas (TK-B)", "TK-B", "USR004", "Ustadzah Khadijah, S.Pd", 20],
      ["DAYCARE-A", "Bintang Cilik (Daycare)", "Daycare", "USR005", "Ustadzah Maryam", 10]
    ];
    sheet.getRange(2, 1, sampleKelas.length, headers.length).setValues(sampleKelas);
  }
}

function setupSheetTahunAjaran(ss) {
  var sheet = ss.getSheetByName("DB_TahunAjaran");
  if (!sheet) {
    sheet = ss.insertSheet("DB_TahunAjaran");
  }

  var headers = ["ID_Tahun", "Tahun_Ajaran", "Semester", "Status_Aktif", "Akses_Raport_Ortu"];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length, "#B45309"); // Amber

    var sampleTA = [
      ["TA2627-1", "2026/2027", "Ganjil (Semester 1)", "AKTIF", "DIBUKA"],
      ["TA2627-2", "2026/2027", "Genap (Semester 2)", "NONAKTIF", "DITUTUP"],
      ["TA2526-2", "2025/2026", "Genap (Semester 2)", "NONAKTIF", "DIBUKA"]
    ];
    sheet.getRange(2, 1, sampleTA.length, headers.length).setValues(sampleTA);
  }
}

function setupSheetRaport(ss) {
  var sheet = ss.getSheetByName("DB_Raport");
  if (!sheet) {
    sheet = ss.insertSheet("DB_Raport");
  }

  var headers = [
    "ID_Raport", 
    "NIS", 
    "Nama_Siswa", 
    "Kelas", 
    "Jenjang", 
    "Tahun_Ajaran", 
    "Semester", 
    "File_ID_Drive", 
    "Nama_File", 
    "Drive_Preview_URL", 
    "Drive_Download_URL", 
    "Status_Publish", 
    "Catatan_Guru", 
    "Tanggal_Upload", 
    "Uploader_User", 
    "Status_Konfirmasi_Ortu", 
    "Tanggal_Dilihat_Ortu"
  ];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length, "#047857"); // Emerald
  }
}

function setupSheetLogAktivitas(ss) {
  var sheet = ss.getSheetByName("DB_LogAktivitas");
  if (!sheet) {
    sheet = ss.insertSheet("DB_LogAktivitas");
  }

  var headers = ["Waktu", "User", "Role", "Aksi", "Keterangan"];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length, "#475569"); // Slate
  }
}

function formatHeaderRow(sheet, colCount, hexColor) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground(hexColor)
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setFrozenRows(1);
}

/**
 * Kosongkan Seluruh Data Dummy / Sampel untuk Simulasi Baru
 * Menyisakan Akun Utama Admin, Struktur Sheet Bersih, dan Format Header.
 */
function resetDataForSimulation() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    if (!ss) {
      return apiResponse(false, null, "Spreadsheet tidak ditemukan.");
    }

    // 1. Kosongkan DB_Siswa (Pertahankan Header Baris 1)
    var siswaSheet = ss.getSheetByName("DB_Siswa");
    if (siswaSheet && siswaSheet.getLastRow() > 1) {
      siswaSheet.deleteRows(2, siswaSheet.getLastRow() - 1);
    }

    // 2. Kosongkan DB_Kelas (Pertahankan Header Baris 1)
    var kelasSheet = ss.getSheetByName("DB_Kelas");
    if (kelasSheet && kelasSheet.getLastRow() > 1) {
      kelasSheet.deleteRows(2, kelasSheet.getLastRow() - 1);
    }

    // 3. Kosongkan DB_Users (Sisakan Akun Utama Admin)
    var usersSheet = ss.getSheetByName("DB_Users");
    if (usersSheet) {
      if (usersSheet.getLastRow() > 1) {
        usersSheet.deleteRows(2, usersSheet.getLastRow() - 1);
      }
      // Tambahkan kembali 1 akun admin default
      usersSheet.appendRow(["USR001", "admin", "admin123", "Administrator Utama", "ADMIN", "SEMUA", "081234567890", "AKTIF"]);
    }

    // 4. Kosongkan DB_Raport (Pertahankan Header Baris 1)
    var raportSheet = ss.getSheetByName("DB_Raport");
    if (raportSheet && raportSheet.getLastRow() > 1) {
      raportSheet.deleteRows(2, raportSheet.getLastRow() - 1);
    }

    // 5. Catat Log
    logActivity("ADMIN", "ADMIN", "RESET_SIMULATION", "Seluruh data siswa, guru, kelas, dan raport telah dikosongkan untuk simulasi baru.");

    return apiResponse(true, null, "Seluruh data siswa, wali kelas, kelas, dan raport telah berhasil dikosongkan. Akun Admin tetap aktif (admin / admin123).");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengosongkan data: " + err.message);
  }
}
