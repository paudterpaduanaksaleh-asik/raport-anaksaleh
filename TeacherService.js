/**
 * ============================================================================
 * MODUL GURU / WALI KELAS (MANAJEMEN RAPORT & PENGAJUAN KE KEPSEK)
 * PG - TK - DAYCARE ANAK SALEH
 * ============================================================================
 */

/**
 * Mengambil daftar murid di kelompok yang diampu guru beserta status raportnya
 * @param {string} kelompokDiampu ID Kelompok yang diampu guru
 */
function getTeacherClassStudents(kelompokDiampu) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    var muridData = muridSheet ? muridSheet.getDataRange().getValues() : [];
    var raportData = raportSheet ? raportSheet.getDataRange().getValues() : [];
    var kelompokData = kelompokSheet ? kelompokSheet.getDataRange().getValues() : [];
    var taData = taSheet ? taSheet.getDataRange().getValues() : [];

    // Cari Info Kelompok Aktif
    var infoKelompok = {
      idKelompok: kelompokDiampu || "-",
      namaKelompok: kelompokDiampu || "-",
      jenjang: "-",
      namaWaliKelas: "-"
    };

    for (var k = 1; k < kelompokData.length; k++) {
      if (String(kelompokData[k][0]).trim().toUpperCase() === String(kelompokDiampu).trim().toUpperCase()) {
        infoKelompok.idKelompok = String(kelompokData[k][0]);
        infoKelompok.namaKelompok = String(kelompokData[k][1]);
        infoKelompok.jenjang = String(kelompokData[k][2]);
        infoKelompok.namaWaliKelas = String(kelompokData[k][4] || "");
        break;
      }
    }

    // Cari Tahun Ajaran Aktif
    var activeTA = { id: "", tahun: "2025/2026", semester: "Ganjil" };
    for (var t = 1; t < taData.length; t++) {
      if (String(taData[t][3]).toUpperCase() === "AKTIF") {
        activeTA.id = String(taData[t][0]);
        activeTA.tahun = String(taData[t][1]);
        activeTA.semester = String(taData[t][2]);
        break;
      }
    }

    // Map Raport: NIS -> Object Raport Terakhir
    // Header Raport: [0:ID, 1:NIS, 2:ID_Kelompok, 3:ID_TA, 4:Sem, 5:URL, 6:FileID, 7:Catatan, 8:Status_Approval, 9:Catatan_Revisi, 10:Uploader, 11:Reviewed_By, 12:Tgl_Review, 13:Tgl_Dilihat, 14:Wali_Konf, 15:Timestamp]
    var raportMap = {};
    for (var r = 1; r < raportData.length; r++) {
      var rRow = raportData[r];
      if (!rRow[0]) continue;

      var rNis = String(rRow[1]).trim();
      var rTA = String(rRow[3]);
      var rSem = String(rRow[4]);

      // Cocokkan tahun ajaran aktif atau ambil yang terbaru
      if (activeTA.id && rTA !== activeTA.id) continue;

      raportMap[rNis] = {
        idRaport: String(rRow[0]),
        nis: rNis,
        idKelompok: String(rRow[2]),
        tahunAjaran: rTA,
        semester: rSem,
        urlPdf: String(rRow[5] || ""),
        fileId: String(rRow[6] || ""),
        catatanPerkembangan: String(rRow[7] || ""),
        statusApproval: String(rRow[8] || "DRAF").toUpperCase(),
        catatanRevisi: String(rRow[9] || ""),
        uploaderUser: String(rRow[10] || ""),
        reviewedBy: String(rRow[11] || ""),
        tanggalReview: rRow[12] ? Utilities.formatDate(new Date(rRow[12]), "GMT+7", "dd/MM/yyyy HH:mm") : "-",
        tanggalDilihat: rRow[13] ? Utilities.formatDate(new Date(rRow[13]), "GMT+7", "dd/MM/yyyy HH:mm") : "-",
        namaWaliKonfirmasi: String(rRow[14] || "-")
      };
    }

    var listMurid = [];
    var totalMurid = 0;
    var totalUploaded = 0;
    var totalDiajukan = 0;
    var totalRevisi = 0;
    var totalDisetujui = 0;

    // Header Murid: [NIS, Nama_Lengkap, Nama_Panggilan, Jenis_Kelamin, Jenjang, ID_Kelompok, Tempat_Lahir, Tanggal_Lahir, Nama_Ayah, Nama_Ibu, Kontak_Ortu, Status_Murid, Alamat, PIN_Akses, Timestamp]
    for (var i = 1; i < muridData.length; i++) {
      var mRow = muridData[i];
      if (!mRow[0]) continue;

      var mKelompok = String(mRow[5] || "").trim().toUpperCase();
      var mStatus = String(mRow[11] || "AKTIF").toUpperCase();

      if (kelompokDiampu && kelompokDiampu !== "SEMUA" && mKelompok !== String(kelompokDiampu).trim().toUpperCase()) {
        continue;
      }

      if (mStatus !== "AKTIF") continue;

      totalMurid++;
      var nis = String(mRow[0]).trim();
      var rap = raportMap[nis] || null;

      var statusRaport = "BELUM_UPLOAD";
      if (rap) {
        totalUploaded++;
        statusRaport = rap.statusApproval;
        if (statusRaport === "DIAJUKAN") totalDiajukan++;
        else if (statusRaport === "REVISI") totalRevisi++;
        else if (statusRaport === "DISETUJUI") totalDisetujui++;
      }

      listMurid.push({
        nis: nis,
        namaLengkap: String(mRow[1] || ""),
        panggilan: String(mRow[2] || mRow[1] || ""),
        jenisKelamin: String(mRow[3] || "L"),
        jenjang: String(mRow[4] || ""),
        idKelompok: mKelompok,
        namaOrtu: String(mRow[8] || mRow[9] || "-"),
        kontakOrtu: String(mRow[10] || "-"),
        statusRaport: statusRaport,
        raportData: rap
      });
    }

    return apiResponse(true, {
      infoKelompok: infoKelompok,
      activeTA: activeTA,
      stats: {
        totalMurid: totalMurid,
        totalUploaded: totalUploaded,
        totalDiajukan: totalDiajukan,
        totalRevisi: totalRevisi,
        totalDisetujui: totalDisetujui,
        totalBelum: totalMurid - totalUploaded
      },
      muridList: listMurid
    }, "Data murid kelompok berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengambil data kelompok murid: " + err.message);
  }
}

/**
 * Mengunggah file Raport PDF Murid ke Google Drive dan Menyimpan Catatan
 * @param {Object} payload { nis, idKelompok, tahunAjaran, semester, catatan, fileBase64, fileName, mimeType, statusApproval, uploaderUser }
 */
function uploadStudentReport(payload) {
  try {
    if (!payload || !payload.nis || !payload.idKelompok) {
      return apiResponse(false, null, "Parameter data murid tidak lengkap.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var rootFolder = getOrCreateRootFolder();
    var taFolder = getOrCreateSubFolder(rootFolder, payload.tahunAjaran || "2025-2026");
    var kelompokFolder = getOrCreateSubFolder(taFolder, payload.idKelompok);

    var fileUrl = payload.existingUrl || "";
    var fileId = payload.existingFileId || "";

    // Simpan file baru jika ada base64
    if (payload.fileBase64) {
      try {
        var base64Data = payload.fileBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:.*;base64,/, "");
        var decodedBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decodedBytes, payload.mimeType || "application/pdf", payload.fileName || ("Raport_" + payload.nis + ".pdf"));

        var savedFile = kelompokFolder.createFile(blob);
        savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        fileUrl = "https://drive.google.com/file/d/" + savedFile.getId() + "/preview";
        fileId = savedFile.getId();
      } catch (fErr) {
        return apiResponse(false, null, "Gagal menyimpan file PDF ke Google Drive: " + fErr.message);
      }
    }

    if (!fileUrl && !payload.existingUrl) {
      return apiResponse(false, null, "File PDF raport wajib diunggah.");
    }

    var raportSheet = ss.getSheetByName("DB_Raport");
    if (!raportSheet) {
      setupSheetRaport(ss);
      raportSheet = ss.getSheetByName("DB_Raport");
    }

    var data = raportSheet.getDataRange().getValues();
    var rowIndex = -1;
    var existingId = "";

    // Cari apakah sudah ada data raport untuk murid ini di TA & Semester yang sama
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(payload.nis).trim() &&
          String(data[i][3]).trim() === String(payload.tahunAjaran).trim() &&
          String(data[i][4]).trim() === String(payload.semester).trim()) {
        rowIndex = i + 1;
        existingId = String(data[i][0]);
        break;
      }
    }

    var statusApproval = payload.statusApproval || "DIAJUKAN"; // Default diajukan ke Kepala Sekolah
    var idRaport = existingId || ("RAP-" + payload.nis + "-" + new Date().getTime().toString().slice(-4));
    var now = new Date();

    // Header Raport: [0:ID, 1:NIS, 2:ID_Kelompok, 3:ID_TA, 4:Sem, 5:URL, 6:FileID, 7:Catatan, 8:Status_Approval, 9:Catatan_Revisi, 10:Uploader, 11:Reviewed_By, 12:Tgl_Review, 13:Tgl_Dilihat, 14:Wali_Konf, 15:Timestamp]
    var rowValues = [
      idRaport,
      payload.nis,
      payload.idKelompok,
      payload.tahunAjaran || "2025/2026",
      payload.semester || "Ganjil",
      fileUrl,
      fileId,
      payload.catatan || "",
      statusApproval,
      "", // Kosongkan catatan revisi jika guru sudah upload perbaikan
      payload.uploaderUser || "Wali Kelas",
      "-",
      "",
      "",
      "",
      now
    ];

    if (rowIndex > 0) {
      raportSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(payload.uploaderUser || "Wali Kelas", "WALI_KELAS", "UPDATE RAPORT", "Memperbarui raport & mengajukan ke Kepsek: NIS " + payload.nis);
    } else {
      raportSheet.appendRow(rowValues);
      logActivity(payload.uploaderUser || "Wali Kelas", "WALI_KELAS", "UPLOAD RAPORT", "Mengunggah raport baru & mengajukan ke Kepsek: NIS " + payload.nis);
    }

    var pesan = statusApproval === "DIAJUKAN" ? 
      "Raport berhasil disimpan dan diajukan ke Kepala Sekolah untuk ditinjau!" : 
      "Raport berhasil disimpan sebagai draf sementara.";

    return apiResponse(true, { idRaport: idRaport, fileUrl: fileUrl, statusApproval: statusApproval }, pesan);

  } catch (err) {
    return apiResponse(false, null, "Gagal mengunggah raport: " + err.message);
  }
}

/**
 * Wali Kelas mengajukan raport yang berstatus DRAF / REVISI ke Kepala Sekolah
 */
function submitReportToKepsek(reportId, teacherUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var raportSheet = ss.getSheetByName("DB_Raport");
    var data = raportSheet.getDataRange().getValues();
    var rowIndex = -1;
    var nisTarget = "";

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        rowIndex = i + 1;
        nisTarget = String(data[i][1]);
        break;
      }
    }

    if (rowIndex === -1) {
      return apiResponse(false, null, "Data raport tidak ditemukan.");
    }

    // Ubah status ke DIAJUKAN, hapus catatan revisi lama
    raportSheet.getRange(rowIndex, 9).setValue("DIAJUKAN");
    raportSheet.getRange(rowIndex, 10).setValue("");

    logActivity(teacherUser || "Wali Kelas", "WALI_KELAS", "AJUKAN RAPORT", "Mengajukan raport ID: " + reportId + " (NIS: " + nisTarget + ") ke Kepala Sekolah.");
    return apiResponse(true, { reportId: reportId, status: "DIAJUKAN" }, "Raport berhasil diajukan ke Kepala Sekolah!");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengajukan raport: " + err.message);
  }
}

/**
 * Menghapus data raport dari spreadsheet dan Google Drive
 */
function deleteStudentReport(reportId, uploaderUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var raportSheet = ss.getSheetByName("DB_Raport");
    var data = raportSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        var fileId = String(data[i][6] || "").trim();
        var targetNis = String(data[i][1] || "").trim();

        // Hapus file dari Drive jika ada fileId
        if (fileId) {
          try {
            DriveApp.getFileById(fileId).setTrashed(true);
          } catch (e) {
            console.warn("Gagal menghapus file Drive: " + e.message);
          }
        }

        raportSheet.deleteRow(i + 1);
        logActivity(uploaderUser || "Wali Kelas", "WALI_KELAS", "HAPUS RAPORT", "Menghapus raport ID: " + reportId + " (NIS: " + targetNis + ")");
        return apiResponse(true, null, "Berkas raport berhasil dihapus.");
      }
    }

    return apiResponse(false, null, "Data raport tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menghapus raport: " + err.message);
  }
}

/**
 * Helper SubFolder Google Drive
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = parentFolder.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}
