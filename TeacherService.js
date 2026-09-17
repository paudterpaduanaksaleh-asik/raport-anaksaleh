/**
 * ============================================================================
 * MODUL WALI KELAS (UPLOAD & PENGELOLAAN RAPORT SISWA)
 * ============================================================================
 */

/**
 * Mendapatkan Daftar Siswa beserta Status Raport di Kelas yang Diampu
 */
function getTeacherClassStudents(kelasDiampu) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    var siswaSheet = ss.getSheetByName("DB_Siswa");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    var siswaData = siswaSheet.getDataRange().getValues();
    var raportData = raportSheet.getDataRange().getValues();
    var taData = taSheet.getDataRange().getValues();

    // 1. Cari Tahun Ajaran Aktif
    var activeTA = { tahun: "2026/2027", semester: "Ganjil (Semester 1)" };
    for (var k = 1; k < taData.length; k++) {
      if (String(taData[k][3]).trim().toUpperCase() === "AKTIF") {
        activeTA.tahun = String(taData[k][1]).trim();
        activeTA.semester = String(taData[k][2]).trim();
        break;
      }
    }

    // 2. Index Raport yang sudah ada pada Tahun Ajaran & Semester Aktif berdasarkan NIS
    var raportMap = {};
    for (var r = 1; r < raportData.length; r++) {
      var rRow = raportData[r];
      var rNis = String(rRow[1]).trim();
      var rTahun = String(rRow[5]).trim();
      var rSem = String(rRow[6]).trim();

      if (rTahun === activeTA.tahun && rSem === activeTA.semester) {
        raportMap[rNis] = {
          idRaport: String(rRow[0]),
          fileId: String(rRow[7]),
          namaFile: rRow[8],
          previewUrl: rRow[9],
          downloadUrl: rRow[10],
          statusPublish: rRow[11] || "DRAFT",
          catatanGuru: rRow[12] || "",
          tanggalUpload: rRow[13] ? Utilities.formatDate(new Date(rRow[13]), "GMT+7", "dd/MM/yyyy HH:mm") : "-",
          statusKonfirmasiOrtu: rRow[15] || "BELUM",
          tanggalDilihatOrtu: rRow[16] ? Utilities.formatDate(new Date(rRow[16]), "GMT+7", "dd/MM/yyyy HH:mm") : "-"
        };
      }
    }

    // 3. Filter Siswa Sesuai Kelas Diampu (atau Semua jika Admin)
    var studentList = [];
    for (var i = 1; i < siswaData.length; i++) {
      var sRow = siswaData[i];
      if (!sRow[0]) continue;

      var sNis = String(sRow[0]).trim();
      var sKelas = String(sRow[5]).trim();
      var sStatus = String(sRow[11]).trim().toUpperCase();

      if (kelasDiampu && kelasDiampu !== "SEMUA" && sKelas !== kelasDiampu) {
        continue;
      }

      var raportInfo = raportMap[sNis] || null;

      studentList.push({
        nis: sNis,
        nisn: String(sRow[1]),
        namaSiswa: sRow[2],
        panggilan: sRow[3],
        jenjang: sRow[4],
        kelas: sKelas,
        jenisKelamin: sRow[6],
        namaOrangtua: sRow[8],
        noWa: String(sRow[9]),
        pinOrtu: String(sRow[10]),
        statusSiswa: sStatus,
        hasRaport: raportInfo !== null,
        raport: raportInfo
      });
    }

    return apiResponse(true, {
      activeTA: activeTA,
      kelas: kelasDiampu,
      students: studentList
    });

  } catch (err) {
    console.error("Teacher Class Students Error: " + err.stack);
    return apiResponse(false, null, "Gagal memuat data kelas: " + err.message);
  }
}

/**
 * Upload dan Simpan Berkas Raport Siswa (PDF) ke Google Drive & Database
 */
function uploadStudentReport(payload) {
  try {
    if (!payload || !payload.nis || !payload.fileBase64) {
      return apiResponse(false, null, "Data raport atau berkas file tidak lengkap.");
    }

    var ss = getDatabaseSpreadsheet();
    var raportSheet = ss.getSheetByName("DB_Raport");
    var rootFolder = getOrCreateRootFolder();

    var nis = String(payload.nis).trim();
    var namaSiswa = payload.namaSiswa || "Siswa";
    var kelas = payload.kelas || "Kelas";
    var jenjang = payload.jenjang || "TK";
    var tahunAjaran = payload.tahunAjaran || "2026-2027";
    var semester = payload.semester || "Ganjil";
    var catatanGuru = payload.catatanGuru || "";
    var uploader = payload.uploaderUser || "Wali Kelas";

    // 1. Buat / Dapatkan Hirarki Folder di Drive: [Tahun Ajaran] -> [Kelas]
    var safeTA = tahunAjaran.replace(/\//g, "-");
    var taFolder = getOrCreateSubFolder(rootFolder, safeTA);
    var classFolder = getOrCreateSubFolder(taFolder, kelas);

    // 2. Decode Base64 File & Simpan ke Drive
    var fileData = Utilities.base64Decode(payload.fileBase64.split(',').pop());
    var cleanFileName = "Raport_" + safeTA + "_" + kelas + "_" + nis + "_" + namaSiswa.replace(/[^a-zA-Z0-9]/g, "_") + ".pdf";
    var blob = Utilities.newBlob(fileData, payload.mimeType || "application/pdf", cleanFileName);
    
    var driveFile = classFolder.createFile(blob);
    // Atur izin baca publik untuk link preview
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = driveFile.getId();
    var previewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

    // 3. Periksa apakah sudah ada record sebelumnya untuk NIS & TA ini
    var raportData = raportSheet.getDataRange().getValues();
    var foundRow = -1;
    var reportId = "RAP-" + nis + "-" + safeTA.replace(/-/g, "") + "-" + (semester.indexOf("1") !== -1 ? "1" : "2");

    for (var r = 1; r < raportData.length; r++) {
      var rNIS = String(raportData[r][1]).trim();
      var rTA = String(raportData[r][5]).trim();
      var rSem = String(raportData[r][6]).trim();

      if (rNIS === nis && rTA === tahunAjaran && rSem === semester) {
        foundRow = r + 1;
        // Hapus file lama di Drive jika ada
        try {
          var oldFileId = String(raportData[r][7]).trim();
          if (oldFileId) DriveApp.getFileById(oldFileId).setTrashed(true);
        } catch (e) {
          console.warn("Berkas lama tidak dapat dihapus: " + e.message);
        }
        break;
      }
    }

    var rowValues = [
      reportId,
      nis,
      namaSiswa,
      kelas,
      jenjang,
      tahunAjaran,
      semester,
      fileId,
      cleanFileName,
      previewUrl,
      downloadUrl,
      payload.statusPublish || "PUBLISHED",
      catatanGuru,
      new Date(),
      uploader,
      "BELUM",
      ""
    ];

    if (foundRow > 0) {
      raportSheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(uploader, "WALI_KELAS", "UPDATE_RAPORT", "Memperbarui raport untuk " + namaSiswa + " (" + nis + ")");
    } else {
      raportSheet.appendRow(rowValues);
      logActivity(uploader, "WALI_KELAS", "UPLOAD_RAPORT", "Mengunggah raport baru untuk " + namaSiswa + " (" + nis + ")");
    }

    return apiResponse(true, {
      reportId: reportId,
      fileId: fileId,
      previewUrl: previewUrl,
      downloadUrl: downloadUrl
    }, "Raport untuk ananda " + namaSiswa + " berhasil diunggah!");

  } catch (err) {
    console.error("Upload Report Error: " + err.stack);
    return apiResponse(false, null, "Gagal mengunggah raport: " + err.message);
  }
}

/**
 * Hapus Raport Siswa
 */
function deleteStudentReport(reportId, uploaderUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Raport");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        var fileId = String(data[i][7]).trim();
        var studentName = data[i][2];
        
        // Hapus file dari Drive
        if (fileId) {
          try {
            DriveApp.getFileById(fileId).setTrashed(true);
          } catch (e) {}
        }

        sheet.deleteRow(i + 1);
        logActivity(uploaderUser || "GURU", "WALI_KELAS", "DELETE_RAPORT", "Menghapus raport siswa: " + studentName + " (ID: " + reportId + ")");
        return apiResponse(true, null, "Raport ananda " + studentName + " berhasil dihapus.");
      }
    }
    return apiResponse(false, null, "Data raport tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}

/**
 * Helper mendapatkan atau membuat Sub Folder Drive
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
