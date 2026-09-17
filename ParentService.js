/**
 * ============================================================================
 * MODUL ORANG TUA (PORTAL AKSES RAPORT & KONFIRMASI)
 * ============================================================================
 */

/**
 * Mendapatkan Data Profil Siswa dan Daftar Raport yang Sudah Terbit
 */
function getParentStudentReports(nis) {
  try {
    if (!nis) return apiResponse(false, null, "NIS tidak valid.");

    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var siswaSheet = ss.getSheetByName("DB_Siswa");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    if (!siswaSheet || !raportSheet || !taSheet) {
      initialSetup();
      siswaSheet = ss.getSheetByName("DB_Siswa");
      raportSheet = ss.getSheetByName("DB_Raport");
      taSheet = ss.getSheetByName("DB_TahunAjaran");
    }

    var siswaData = siswaSheet.getDataRange().getValues();
    var raportData = raportSheet.getDataRange().getValues();
    var taData = taSheet.getDataRange().getValues();

    // 1. Ambil Profil Siswa
    var studentProfile = null;
    var cleanNis = String(nis).trim();

    for (var i = 1; i < siswaData.length; i++) {
      if (String(siswaData[i][0]).trim() === cleanNis) {
        var tglLahirStr = "";
        if (siswaData[i][7]) {
          if (siswaData[i][7] instanceof Date) {
            tglLahirStr = Utilities.formatDate(siswaData[i][7], "GMT+7", "yyyy-MM-dd");
          } else {
            tglLahirStr = String(siswaData[i][7]);
          }
        }

        studentProfile = {
          nis: cleanNis,
          nisn: String(siswaData[i][1] || ""),
          namaSiswa: String(siswaData[i][2] || ""),
          panggilan: String(siswaData[i][3] || ""),
          jenjang: String(siswaData[i][4] || ""),
          kelas: String(siswaData[i][5] || ""),
          jenisKelamin: String(siswaData[i][6] || ""),
          tanggalLahir: tglLahirStr,
          namaOrangtua: String(siswaData[i][8] || ""),
          noWa: String(siswaData[i][9] || "")
        };
        break;
      }
    }

    if (!studentProfile) {
      return apiResponse(false, null, "Data siswa tidak ditemukan.");
    }

    // 2. Cek Tahun Ajaran Aktif & Hak Akses Ortu
    var activeTA = { tahun: "2026/2027", semester: "Ganjil (Semester 1)", aksesOrtu: "DIBUKA" };
    for (var k = 1; k < taData.length; k++) {
      if (String(taData[k][3]).trim().toUpperCase() === "AKTIF") {
        activeTA.tahun = String(taData[k][1]).trim();
        activeTA.semester = String(taData[k][2]).trim();
        activeTA.aksesOrtu = String(taData[k][4] || "DIBUKA").trim().toUpperCase();
        break;
      }
    }

    // 3. Ambil Daftar Raport yang Terbit (PUBLISHED)
    var reports = [];
    for (var r = 1; r < raportData.length; r++) {
      var rRow = raportData[r];
      var rNIS = String(rRow[1]).trim();
      var rStatusPublish = String(rRow[11] || "").trim().toUpperCase();

      if (rNIS === cleanNis && rStatusPublish === "PUBLISHED") {
        var tglUploadStr = "-";
        if (rRow[13]) {
          tglUploadStr = rRow[13] instanceof Date ? Utilities.formatDate(rRow[13], "GMT+7", "dd MMMM yyyy") : String(rRow[13]);
        }
        var tglDilihatStr = null;
        if (rRow[16]) {
          tglDilihatStr = rRow[16] instanceof Date ? Utilities.formatDate(rRow[16], "GMT+7", "dd MMMM yyyy HH:mm") : String(rRow[16]);
        }

        reports.push({
          idRaport: String(rRow[0]),
          tahunAjaran: String(rRow[5] || ""),
          semester: String(rRow[6] || ""),
          namaFile: String(rRow[8] || ""),
          previewUrl: String(rRow[9] || ""),
          downloadUrl: String(rRow[10] || ""),
          catatanGuru: String(rRow[12] || "Teruslah bertumbuh dan belajar dengan gembira menjadi anak yang saleh dan mandiri!"),
          tanggalUpload: tglUploadStr,
          statusKonfirmasiOrtu: String(rRow[15] || "BELUM"),
          tanggalDilihatOrtu: tglDilihatStr
        });
      }
    }

    return apiResponse(true, {
      profile: studentProfile,
      activeTA: activeTA,
      isAccessOpen: activeTA.aksesOrtu === "DIBUKA",
      reports: reports
    });

  } catch (err) {
    console.error("Parent Reports Error: " + err.stack);
    return apiResponse(false, null, "Gagal memuat raport: " + err.message);
  }
}

/**
 * Konfirmasi Orang Tua Bahwa Raport Telah Dilihat / Diunduh
 */
function confirmReportViewedByParent(reportId, parentName) {
  try {
    var ss = getDatabaseSpreadsheet();
    var sheet = ss.getSheetByName("DB_Raport");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        sheet.getRange(i + 1, 16).setValue("SUDAH_DILIHAT");
        sheet.getRange(i + 1, 17).setValue(new Date());

        logActivity(parentName || "Orang Tua", "ORTU", "CONFIRM_RAPORT", "Orang tua mengonfirmasi telah melihat raport ID: " + reportId);
        return apiResponse(true, null, "Terima kasih Ayah/Bunda! Konfirmasi Anda telah tercatat oleh sistem.");
      }
    }
    return apiResponse(false, null, "Raport tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, err.message);
  }
}
