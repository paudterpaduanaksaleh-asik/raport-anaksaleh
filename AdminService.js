/**
 * ============================================================================
 * MODUL ADMIN (KONTROL DATA MASTER & PUBLIKASI)
 * ============================================================================
 */

/**
 * Ringkasan Statistik Dashboard Admin
 */
function getAdminDashboardSummary() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    var siswaSheet = ss.getSheetByName("DB_Siswa");
    var usersSheet = ss.getSheetByName("DB_Users");
    var kelasSheet = ss.getSheetByName("DB_Kelas");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    var siswaData = siswaSheet.getDataRange().getValues();
    var usersData = usersSheet.getDataRange().getValues();
    var kelasData = kelasSheet.getDataRange().getValues();
    var raportData = raportSheet.getDataRange().getValues();
    var taData = taSheet.getDataRange().getValues();

    // Hitung Siswa Aktif
    var totalSiswa = 0;
    var perJenjang = { "Playgroup (PG)": 0, "TK-A": 0, "TK-B": 0, "Daycare": 0 };
    for (var i = 1; i < siswaData.length; i++) {
      if (String(siswaData[i][11]).trim().toUpperCase() === "AKTIF") {
        totalSiswa++;
        var jg = siswaData[i][4];
        if (perJenjang[jg] !== undefined) perJenjang[jg]++;
      }
    }

    // Hitung Wali Kelas
    var totalWaliKelas = 0;
    for (var j = 1; j < usersData.length; j++) {
      if (String(usersData[j][4]).trim().toUpperCase() === "WALI_KELAS" && String(usersData[j][7]).trim().toUpperCase() === "AKTIF") {
        totalWaliKelas++;
      }
    }

    // Tahun Ajaran Aktif
    var activeTA = { id: "", tahun: "-", semester: "-", statusAksesOrtu: "DITUTUP" };
    for (var k = 1; k < taData.length; k++) {
      if (String(taData[k][3]).trim().toUpperCase() === "AKTIF") {
        activeTA = {
          id: taData[k][0],
          tahun: taData[k][1],
          semester: taData[k][2],
          statusAksesOrtu: taData[k][4]
        };
        break;
      }
    }

    // Hitung Raport Terunggah & Terpublikasi pada TA Aktif
    var totalRaportUploaded = 0;
    var totalRaportPublished = 0;
    var totalRaportDilihatOrtu = 0;

    for (var r = 1; r < raportData.length; r++) {
      var rTA = String(raportData[r][5]).trim();
      var rSem = String(raportData[r][6]).trim();
      if (rTA === activeTA.tahun && rSem === activeTA.semester) {
        totalRaportUploaded++;
        if (String(raportData[r][11]).trim().toUpperCase() === "PUBLISHED") {
          totalRaportPublished++;
        }
        if (String(raportData[r][15]).trim().toUpperCase() === "SUDAH_DILIHAT" || raportData[r][16]) {
          totalRaportDilihatOrtu++;
        }
      }
    }

    return apiResponse(true, {
      totalSiswa: totalSiswa,
      perJenjang: perJenjang,
      totalWaliKelas: totalWaliKelas,
      totalKelas: Math.max(0, kelasData.length - 1),
      activeTA: activeTA,
      totalRaportUploaded: totalRaportUploaded,
      totalRaportPublished: totalRaportPublished,
      totalRaportDilihatOrtu: totalRaportDilihatOrtu
    });

  } catch (err) {
    console.error("Admin Summary Error: " + err.stack);
    return apiResponse(false, null, "Gagal mengambil data ringkasan: " + err.message);
  }
}

/**
 * Mendapatkan Semua Data Siswa
 */
function getStudentsListAdmin(filterJenjang, filterKelas) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Siswa");
    var data = sheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      
      var sJenjang = row[4];
      var sKelas = row[5];

      if (filterJenjang && filterJenjang !== "SEMUA" && sJenjang !== filterJenjang) continue;
      if (filterKelas && filterKelas !== "SEMUA" && sKelas !== filterKelas) continue;

      list.push({
        nis: String(row[0]),
        nisn: String(row[1]),
        namaSiswa: row[2],
        namaPanggilan: row[3],
        jenjang: row[4],
        kelas: row[5],
        jenisKelamin: row[6],
        tanggalLahir: row[7],
        namaOrangtua: row[8],
        noWa: String(row[9]),
        pinOrtu: String(row[10]),
        status: row[11]
      });
    }

    return apiResponse(true, list);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Tambah atau Perbarui Data Siswa
 */
function saveStudentAdmin(student, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Siswa");
    var data = sheet.getDataRange().getValues();
    
    var nis = String(student.nis).trim();
    if (!nis) return apiResponse(false, null, "NIS wajib diisi!");

    var foundRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === nis) {
        foundRow = i + 1;
        break;
      }
    }

    var rowValues = [
      nis,
      String(student.nisn || ""),
      student.namaSiswa,
      student.namaPanggilan || "",
      student.jenjang,
      student.kelas,
      student.jenisKelamin,
      student.tanggalLahir || "",
      student.namaOrangtua || "",
      String(student.noWa || ""),
      String(student.pinOrtu || "1234"),
      student.status || "AKTIF"
    ];

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE_SISWA", "Memperbarui data siswa: " + student.namaSiswa + " (" + nis + ")");
      return apiResponse(true, null, "Data siswa " + student.namaSiswa + " berhasil diperbarui.");
    } else {
      sheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "CREATE_SISWA", "Menambahkan siswa baru: " + student.namaSiswa + " (" + nis + ")");
      return apiResponse(true, null, "Siswa baru " + student.namaSiswa + " berhasil ditambahkan.");
    }
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Bulk Import Data Siswa Secara Massal (CSV / Array)
 */
function bulkSaveStudentsAdmin(studentsList, adminUser) {
  try {
    if (!studentsList || !studentsList.length) {
      return apiResponse(false, null, "Data siswa massal kosong.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    var sheet = ss.getSheetByName("DB_Siswa");
    if (!sheet) {
      setupSheetSiswa(ss);
      sheet = ss.getSheetByName("DB_Siswa");
    }

    var data = sheet.getDataRange().getValues();
    var nisRowMap = {};
    for (var i = 1; i < data.length; i++) {
      var n = String(data[i][0]).trim();
      if (n) nisRowMap[n] = i + 1;
    }

    var newRows = [];
    var updatedCount = 0;
    var insertedCount = 0;

    for (var k = 0; k < studentsList.length; k++) {
      var s = studentsList[k];
      var sNis = String(s.nis || "").trim();
      var sNama = String(s.namaSiswa || "").trim();
      if (!sNis || !sNama) continue;

      var rowValues = [
        sNis,
        String(s.nisn || ""),
        sNama,
        String(s.namaPanggilan || sNama.split(" ")[0]),
        String(s.jenjang || "Playgroup (PG)"),
        String(s.kelas || "PG-A"),
        String(s.jenisKelamin || "Laki-laki"),
        String(s.tanggalLahir || ""),
        String(s.namaOrangtua || ""),
        String(s.noWa || ""),
        String(s.pinOrtu || "1234"),
        String(s.status || "AKTIF")
      ];

      if (nisRowMap[sNis]) {
        sheet.getRange(nisRowMap[sNis], 1, 1, rowValues.length).setValues([rowValues]);
        updatedCount++;
      } else {
        newRows.push(rowValues);
        nisRowMap[sNis] = true;
        insertedCount++;
      }
    }

    if (newRows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    logActivity(adminUser || "ADMIN", "ADMIN", "BULK_IMPORT_SISWA", "Import massal siswa: " + insertedCount + " baru, " + updatedCount + " diperbarui.");
    return apiResponse(true, { inserted: insertedCount, updated: updatedCount }, "Berhasil memproses " + (insertedCount + updatedCount) + " data siswa (" + insertedCount + " baru, " + updatedCount + " diperbarui)!");

  } catch (err) {
    return apiResponse(false, null, "Gagal import massal: " + err.message);
  }
}

/**
 * Hapus Data Siswa
 */
function deleteStudentAdmin(nis, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Siswa");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(nis).trim()) {
        var studentName = data[i][2];
        sheet.deleteRow(i + 1);
        logActivity(adminUser || "ADMIN", "ADMIN", "DELETE_SISWA", "Menghapus siswa: " + studentName + " (" + nis + ")");
        return apiResponse(true, null, "Siswa " + studentName + " berhasil dihapus.");
      }
    }
    return apiResponse(false, null, "Siswa dengan NIS " + nis + " tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Dapatkan Daftar Guru & Wali Kelas
 */
function getTeachersListAdmin() {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Users");
    var data = sheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      list.push({
        userId: String(row[0]),
        username: String(row[1]),
        password: String(row[2]),
        namaLengkap: row[3],
        role: row[4],
        kelasDiampu: row[5],
        noHp: String(row[6]),
        status: row[7]
      });
    }

    return apiResponse(true, list);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Simpan Data Guru/Pengguna
 */
function saveTeacherAdmin(userObj, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Users");
    var data = sheet.getDataRange().getValues();
    
    var userId = String(userObj.userId || "").trim();
    var username = String(userObj.username || "").trim().toLowerCase();

    if (!username) return apiResponse(false, null, "Username wajib diisi!");

    var foundRow = -1;
    for (var i = 1; i < data.length; i++) {
      if ((userId && String(data[i][0]).trim() === userId) || (String(data[i][1]).trim().toLowerCase() === username)) {
        foundRow = i + 1;
        userId = String(data[i][0]);
        break;
      }
    }

    if (!userId) {
      userId = "USR" + String(new Date().getTime()).slice(-4);
    }

    var rowValues = [
      userId,
      username,
      userObj.password || "guru123",
      userObj.namaLengkap,
      userObj.role || "WALI_KELAS",
      userObj.kelasDiampu || "",
      String(userObj.noHp || ""),
      userObj.status || "AKTIF"
    ];

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE_USER", "Memperbarui akun: " + userObj.namaLengkap + " (" + username + ")");
      return apiResponse(true, null, "Akun " + userObj.namaLengkap + " berhasil diperbarui.");
    } else {
      sheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "CREATE_USER", "Menambahkan akun baru: " + userObj.namaLengkap + " (" + username + ")");
      return apiResponse(true, null, "Akun baru " + userObj.namaLengkap + " berhasil dibuat.");
    }
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Dapatkan Daftar Rombongan Belajar (Kelas) Beserta Jumlah Siswa
 */
function getClassesListAdmin() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    var sheet = ss.getSheetByName("DB_Kelas");
    var siswaSheet = ss.getSheetByName("DB_Siswa");
    var data = sheet.getDataRange().getValues();
    var siswaData = siswaSheet.getDataRange().getValues();

    // Hitung jumlah siswa per kelas
    var countMap = {};
    for (var s = 1; s < siswaData.length; s++) {
      var sKelas = String(siswaData[s][5] || "").trim();
      var sStatus = String(siswaData[s][11] || "AKTIF").trim().toUpperCase();
      if (sKelas && sStatus === "AKTIF") {
        countMap[sKelas] = (countMap[sKelas] || 0) + 1;
      }
    }

    var list = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var idK = String(row[0]).trim();
      list.push({
        idKelas: idK,
        namaKelas: String(row[1] || ""),
        jenjang: String(row[2] || ""),
        idWaliKelas: String(row[3] || ""),
        namaWaliKelas: String(row[4] || ""),
        kapasitas: Number(row[5] || 20),
        totalSiswa: countMap[idK] || 0
      });
    }

    return apiResponse(true, list);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Tambah atau Perbarui Data Rombongan Belajar (Kelas)
 * dan Sinkronkan Penugasan Wali Kelas di DB_Users
 */
function saveClassAdmin(classObj, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Kelas");
    var usersSheet = ss.getSheetByName("DB_Users");
    var data = sheet.getDataRange().getValues();

    var idKelas = String(classObj.idKelas || "").trim();
    var namaKelas = String(classObj.namaKelas || "").trim();
    var jenjang = String(classObj.jenjang || "").trim();
    var idWaliKelas = String(classObj.idWaliKelas || "").trim();
    var namaWaliKelas = String(classObj.namaWaliKelas || "").trim();
    var kapasitas = Number(classObj.kapasitas || 20);

    if (!idKelas || !namaKelas) {
      return apiResponse(false, null, "Kode Kelas dan Nama Kelas wajib diisi!");
    }

    var foundRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === idKelas.toUpperCase()) {
        foundRow = i + 1;
        break;
      }
    }

    var rowValues = [idKelas, namaKelas, jenjang, idWaliKelas, namaWaliKelas, kapasitas];

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE_KELAS", "Memperbarui kelas: " + namaKelas + " (" + idKelas + ")");
    } else {
      sheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "CREATE_KELAS", "Menambahkan kelas baru: " + namaKelas + " (" + idKelas + ")");
    }

    // Sinkronkan penugasan kelas pada akun Guru / Wali Kelas di DB_Users
    if (idWaliKelas && usersSheet) {
      var usersData = usersSheet.getDataRange().getValues();
      for (var u = 1; u < usersData.length; u++) {
        var uId = String(usersData[u][0]).trim();
        if (uId === idWaliKelas) {
          usersSheet.getRange(u + 1, 6).setValue(idKelas); // Set Kelas_Diampu
          break;
        }
      }
    }

    return apiResponse(true, null, "Data kelas " + namaKelas + " berhasil disimpan!");
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Hapus Data Kelas
 */
function deleteClassAdmin(idKelas, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Kelas");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idKelas).trim()) {
        var className = data[i][1];
        sheet.deleteRow(i + 1);
        logActivity(adminUser || "ADMIN", "ADMIN", "DELETE_KELAS", "Menghapus kelas: " + className + " (" + idKelas + ")");
        return apiResponse(true, null, "Kelas " + className + " berhasil dihapus.");
      }
    }
    return apiResponse(false, null, "Kelas tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Ambil Detail Kelas Beserta Daftar Seluruh Murid di Dalamnya
 */
function getClassStudentsAdmin(idKelas) {
  try {
    var ss = getDatabaseSpreadsheet();
    var siswaSheet = ss.getSheetByName("DB_Siswa");
    var data = siswaSheet.getDataRange().getValues();
    var students = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var sKelas = String(row[5] || "").trim();

      if (sKelas === idKelas) {
        students.push({
          nis: String(row[0]),
          nisn: String(row[1] || ""),
          namaSiswa: String(row[2] || ""),
          panggilan: String(row[3] || ""),
          jenjang: String(row[4] || ""),
          kelas: sKelas,
          jenisKelamin: String(row[6] || ""),
          namaOrangtua: String(row[8] || ""),
          noWa: String(row[9] || ""),
          pinOrtu: String(row[10] || "1234"),
          status: String(row[11] || "AKTIF")
        });
      }
    }

    return apiResponse(true, students);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Dapatkan Daftar Tahun Ajaran
 */
function getAcademicYearsListAdmin() {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_TahunAjaran");
    var data = sheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      list.push({
        idTahun: String(row[0]),
        tahunAjaran: row[1],
        semester: row[2],
        statusAktif: row[3],
        aksesRaportOrtu: row[4]
      });
    }

    return apiResponse(true, list);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Set Tahun Ajaran Aktif & Toggle Akses Publikasi Ortu
 */
function setAcademicYearSettingsAdmin(idTahun, statusAktif, aksesOrtu, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_TahunAjaran");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var currentId = String(data[i][0]).trim();
      if (statusAktif === "AKTIF") {
        // Jika diset aktif, nonaktifkan baris lainnya
        sheet.getRange(i + 1, 4).setValue(currentId === idTahun ? "AKTIF" : "NONAKTIF");
      }
      if (currentId === idTahun && aksesOrtu) {
        sheet.getRange(i + 1, 5).setValue(aksesOrtu);
      }
    }

    logActivity(adminUser || "ADMIN", "ADMIN", "CONFIG_TA", "Mengubah pengaturan Tahun Ajaran ID: " + idTahun);
    return apiResponse(true, null, "Pengaturan Tahun Pelajaran berhasil diperbarui.");
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Mengubah Status Publikasi Raport Secara Massal (Publish / Unpublish)
 */
function toggleReportPublishStatus(reportIds, statusPublish, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Raport");
    var data = sheet.getDataRange().getValues();
    var count = 0;

    for (var i = 1; i < data.length; i++) {
      var rId = String(data[i][0]).trim();
      if (reportIds.indexOf(rId) !== -1) {
        sheet.getRange(i + 1, 12).setValue(statusPublish);
        count++;
      }
    }

    logActivity(adminUser || "ADMIN", "ADMIN", "PUBLISH_RAPORT", "Mengubah status " + count + " raport menjadi " + statusPublish);
    return apiResponse(true, count, count + " Raport berhasil diubah statusnya menjadi " + statusPublish);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Mengambil Riwayat Log Aktivitas
 */
function getActivityLogsAdmin(limit) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_LogAktivitas");
    var data = sheet.getDataRange().getValues();
    var logs = [];

    var start = Math.max(1, data.length - (limit || 50));
    for (var i = data.length - 1; i >= start; i--) {
      var row = data[i];
      if (!row[0]) continue;
      logs.push({
        waktu: Utilities.formatDate(new Date(row[0]), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
        user: row[1],
        role: row[2],
        aksi: row[3],
        keterangan: row[4]
      });
    }

    return apiResponse(true, logs);
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}
