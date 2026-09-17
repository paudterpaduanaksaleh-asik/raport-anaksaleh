/**
 * ============================================================================
 * MODUL KEPALA SEKOLAH (PORTAL REVIEW, ACC & REVISI RAPORT)
 * PG - TK - DAYCARE ANAK SALEH
 * ============================================================================
 */

/**
 * Ringkasan Statistik Dashboard Kepala Sekolah
 */
function getKepsekDashboardSummary() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum tersedia.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    var muridData = muridSheet ? muridSheet.getDataRange().getValues() : [];
    var raportData = raportSheet ? raportSheet.getDataRange().getValues() : [];
    var kelompokData = kelompokSheet ? kelompokSheet.getDataRange().getValues() : [];
    var taData = taSheet ? taSheet.getDataRange().getValues() : [];

    var totalMurid = 0;
    for (var i = 1; i < muridData.length; i++) {
      if (String(muridData[i][11] || "AKTIF").toUpperCase() === "AKTIF") totalMurid++;
    }

    var stats = {
      totalMurid: totalMurid,
      diajukan: 0,
      revisi: 0,
      disetujui: 0,
      draf: 0
    };

    // Header Raport: [0:ID, 1:NIS, 2:ID_Kelompok, 3:ID_TA, 4:Sem, 5:URL, 6:FileID, 7:Catatan, 8:Status_Approval, 9:Catatan_Revisi, 10:Uploader, 11:Reviewed_By, 12:Tgl_Review, 13:Tgl_Dilihat, 14:Wali_Konf, 15:Timestamp]
    for (var j = 1; j < raportData.length; j++) {
      var st = String(raportData[j][8] || "").toUpperCase();
      if (st === "DIAJUKAN") stats.diajukan++;
      else if (st === "REVISI") stats.revisi++;
      else if (st === "DISETUJUI") stats.disetujui++;
      else if (st === "DRAF") stats.draf++;
    }

    // Kelompok options
    var kelompokList = [];
    for (var k = 1; k < kelompokData.length; k++) {
      if (kelompokData[k][0]) {
        kelompokList.push({
          id: String(kelompokData[k][0]),
          nama: String(kelompokData[k][1]),
          jenjang: String(kelompokData[k][2]),
          waliKelas: String(kelompokData[k][4] || "")
        });
      }
    }

    // Active Tahun Ajaran
    var activeTA = { id: "", tahun: "-", semester: "-" };
    for (var t = 1; t < taData.length; t++) {
      if (String(taData[t][3]).toUpperCase() === "AKTIF") {
        activeTA = {
          id: String(taData[t][0]),
          tahun: String(taData[t][1]),
          semester: String(taData[t][2])
        };
        break;
      }
    }

    return apiResponse(true, {
      stats: stats,
      kelompokList: kelompokList,
      activeTA: activeTA
    }, "Data dashboard Kepala Sekolah berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal memuat summary Kepsek: " + err.message);
  }
}

/**
 * Mengambil daftar pengajuan raport untuk review Kepala Sekolah
 * @param {string} filterKelompok 
 * @param {string} filterStatus 'ALL'|'DIAJUKAN'|'REVISI'|'DISETUJUI'
 */
function getKepsekReportsList(filterKelompok, filterStatus) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");

    var muridData = muridSheet ? muridSheet.getDataRange().getValues() : [];
    var raportData = raportSheet ? raportSheet.getDataRange().getValues() : [];
    var kelompokData = kelompokSheet ? kelompokSheet.getDataRange().getValues() : [];

    // Map Murid: NIS -> { nama, panggilan, jenjang, kelompok, ortu }
    var muridMap = {};
    for (var i = 1; i < muridData.length; i++) {
      var nis = String(muridData[i][0]).trim();
      if (!nis) continue;
      muridMap[nis] = {
        nis: nis,
        nama: String(muridData[i][1] || ""),
        panggilan: String(muridData[i][2] || ""),
        jenisKelamin: String(muridData[i][3] || ""),
        jenjang: String(muridData[i][4] || ""),
        idKelompok: String(muridData[i][5] || ""),
        namaAyah: String(muridData[i][8] || ""),
        namaIbu: String(muridData[i][9] || ""),
        kontakOrtu: String(muridData[i][10] || "")
      };
    }

    // Map Kelompok: ID -> { nama, waliKelas }
    var kelompokMap = {};
    for (var k = 1; k < kelompokData.length; k++) {
      var kid = String(kelompokData[k][0]).trim();
      if (!kid) continue;
      kelompokMap[kid] = {
        nama: String(kelompokData[k][1] || kid),
        waliKelas: String(kelompokData[k][4] || "")
      };
    }

    var results = [];
    // Loop raport
    for (var r = 1; r < raportData.length; r++) {
      var row = raportData[r];
      if (!row[0]) continue;

      var rId = String(row[0]);
      var rNis = String(row[1]).trim();
      var rKelompok = String(row[2]).trim();
      var rTA = String(row[3]);
      var rSem = String(row[4]);
      var rUrl = String(row[5] || "");
      var rFileId = String(row[6] || "");
      var rCatatan = String(row[7] || "");
      var rStatus = String(row[8] || "DRAF").toUpperCase();
      var rRevisi = String(row[9] || "");
      var rUploader = String(row[10] || "");
      var rReviewer = String(row[11] || "");
      var rTglReview = row[12] ? Utilities.formatDate(new Date(row[12]), "GMT+7", "dd/MM/yyyy HH:mm") : "-";

      // Apply Filters
      if (filterKelompok && filterKelompok !== "SEMUA" && rKelompok !== filterKelompok) {
        continue;
      }

      if (filterStatus && filterStatus !== "SEMUA") {
        if (rStatus !== String(filterStatus).toUpperCase()) continue;
      }

      var mInfo = muridMap[rNis] || { nama: "Murid (" + rNis + ")", panggilan: "-", jenjang: "-", idKelompok: rKelompok, kontakOrtu: "-" };
      var kInfo = kelompokMap[rKelompok] || { nama: rKelompok, waliKelas: rUploader };

      results.push({
        idRaport: rId,
        nis: rNis,
        namaMurid: mInfo.nama,
        namaPanggilan: mInfo.panggilan,
        jenisKelamin: mInfo.jenisKelamin,
        jenjang: mInfo.jenjang,
        idKelompok: rKelompok,
        namaKelompok: kInfo.nama,
        waliKelas: kInfo.waliKelas,
        tahunAjaran: rTA,
        semester: rSem,
        urlPdf: rUrl,
        fileId: rFileId,
        catatanPerkembangan: rCatatan,
        statusApproval: rStatus,
        catatanRevisi: rRevisi,
        uploaderUser: rUploader,
        reviewedBy: rReviewer,
        tanggalReview: rTglReview
      });
    }

    // Urutkan: DIAJUKAN paling atas, lalu REVISI, lalu DISETUJUI, lalu DRAF
    var priority = { "DIAJUKAN": 1, "REVISI": 2, "DISETUJUI": 3, "DRAF": 4 };
    results.sort(function(a, b) {
      var pA = priority[a.statusApproval] || 99;
      var pB = priority[b.statusApproval] || 99;
      return pA - pB;
    });

    return apiResponse(true, results, "Daftar raport untuk Kepala Sekolah berhasil diambil.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengambil daftar review raport: " + err.message);
  }
}

/**
 * Kepala Sekolah menyetujui (ACC) Raport -> Status berubah DISETUJUI & Langsung Diterbitkan ke Wali Murid
 */
function approveReportKepsek(reportId, kepsekUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database tidak ditemukan.");

    var raportSheet = ss.getSheetByName("DB_Raport");
    if (!raportSheet) return apiResponse(false, null, "Tabel raport tidak ditemukan.");

    var data = raportSheet.getDataRange().getValues();
    var rowIndex = -1;
    var targetNIS = "";

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        rowIndex = i + 1;
        targetNIS = String(data[i][1]);
        break;
      }
    }

    if (rowIndex === -1) {
      return apiResponse(false, null, "Data raport dengan ID tersebut tidak ditemukan.");
    }

    var now = new Date();
    // Kolom 9: Status_Approval (I), Kolom 10: Catatan_Revisi (J), Kolom 12: Reviewed_By (L), Kolom 13: Tanggal_Review (M)
    raportSheet.getRange(rowIndex, 9).setValue("DISETUJUI");
    raportSheet.getRange(rowIndex, 10).setValue(""); // Kosongkan catatan revisi karena sudah di-ACC
    raportSheet.getRange(rowIndex, 12).setValue(kepsekUser || "Kepala Sekolah");
    raportSheet.getRange(rowIndex, 13).setValue(now);

    logActivity(kepsekUser || "Kepala Sekolah", "KEPSEK", "ACC RAPORT", "Menyetujui & menerbitkan raport ID: " + reportId + " (NIS: " + targetNIS + ")");
    return apiResponse(true, { reportId: reportId, status: "DISETUJUI" }, "Raport berhasil di-ACC dan langsung diterbitkan ke Wali Murid!");
  } catch (err) {
    return apiResponse(false, null, "Gagal menyetujui raport: " + err.message);
  }
}

/**
 * Kepala Sekolah menolak / meminta perbaikan (Revisi) Raport -> Status REVISI + Catatan Revisi
 */
function rejectReportKepsek(reportId, catatanRevisi, kepsekUser) {
  try {
    if (!catatanRevisi || String(catatanRevisi).trim() === "") {
      return apiResponse(false, null, "Mohon berikan catatan revisi agar Wali Kelas mengetahui bagian yang perlu diperbaiki.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database tidak ditemukan.");

    var raportSheet = ss.getSheetByName("DB_Raport");
    if (!raportSheet) return apiResponse(false, null, "Tabel raport tidak ditemukan.");

    var data = raportSheet.getDataRange().getValues();
    var rowIndex = -1;
    var targetNIS = "";

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        rowIndex = i + 1;
        targetNIS = String(data[i][1]);
        break;
      }
    }

    if (rowIndex === -1) {
      return apiResponse(false, null, "Data raport tidak ditemukan.");
    }

    var now = new Date();
    // Kolom 9: Status_Approval (I), Kolom 10: Catatan_Revisi (J), Kolom 12: Reviewed_By (L), Kolom 13: Tanggal_Review (M)
    raportSheet.getRange(rowIndex, 9).setValue("REVISI");
    raportSheet.getRange(rowIndex, 10).setValue(String(catatanRevisi).trim());
    raportSheet.getRange(rowIndex, 12).setValue(kepsekUser || "Kepala Sekolah");
    raportSheet.getRange(rowIndex, 13).setValue(now);

    logActivity(kepsekUser || "Kepala Sekolah", "KEPSEK", "REVISI RAPORT", "Mengembalikan raport ID: " + reportId + " (NIS: " + targetNIS + ") dengan catatan revisi.");
    return apiResponse(true, { reportId: reportId, status: "REVISI" }, "Raport berhasil dikembalikan ke Wali Kelas untuk direvisi.");
  } catch (err) {
    return apiResponse(false, null, "Gagal meminta revisi raport: " + err.message);
  }
}

/**
 * Kepala Sekolah melakukan ACC Massal (Bulk Approval)
 */
function bulkApproveReportsKepsek(reportIds, kepsekUser) {
  try {
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return apiResponse(false, null, "Tidak ada raport yang dipilih untuk di-ACC.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database tidak ditemukan.");

    var raportSheet = ss.getSheetByName("DB_Raport");
    var data = raportSheet.getDataRange().getValues();

    var successCount = 0;
    var now = new Date();

    for (var i = 1; i < data.length; i++) {
      var rId = String(data[i][0]).trim();
      if (reportIds.indexOf(rId) !== -1) {
        var row = i + 1;
        raportSheet.getRange(row, 9).setValue("DISETUJUI");
        raportSheet.getRange(row, 10).setValue("");
        raportSheet.getRange(row, 12).setValue(kepsekUser || "Kepala Sekolah");
        raportSheet.getRange(row, 13).setValue(now);
        successCount++;
      }
    }

    logActivity(kepsekUser || "Kepala Sekolah", "KEPSEK", "BULK ACC RAPORT", "Menyetujui massal " + successCount + " berkas raport.");
    return apiResponse(true, { count: successCount }, "Berhasil menyetujui dan menerbitkan " + successCount + " raport sekaligus!");
  } catch (err) {
    return apiResponse(false, null, "Gagal melakukan ACC massal: " + err.message);
  }
}
