/**
 * ============================================================================
 * MODUL WALI MURID (PORTAL RAPORT & PERKEMBANGAN ANAK)
 * PG - TK - DAYCARE ANAK SALEH
 * ============================================================================
 */

/**
 * Mengambil data profil murid dan daftar raport yang SUDAH DI-ACC (DISETUJUI) KEPALA SEKOLAH
 * @param {string} nis NIS Murid
 */
function getParentStudentReports(nis) {
  try {
    if (!nis) return apiResponse(false, null, "NIS tidak valid.");

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

    // Cari Data Murid
    var muridProfile = null;
    for (var i = 1; i < muridData.length; i++) {
      if (String(muridData[i][0]).trim() === String(nis).trim()) {
        var row = muridData[i];
        var tglLahirStr = "";
        if (row[7]) {
          if (row[7] instanceof Date) {
            tglLahirStr = Utilities.formatDate(row[7], "GMT+7", "yyyy-MM-dd");
          } else {
            tglLahirStr = String(row[7]);
          }
        }

        muridProfile = {
          nis: String(row[0]).trim(),
          namaLengkap: String(row[1] || ""),
          namaPanggilan: String(row[2] || row[1] || ""),
          jenisKelamin: String(row[3] || ""),
          jenjang: String(row[4] || ""),
          idKelompok: String(row[5] || ""),
          tempatLahir: String(row[6] || ""),
          tanggalLahir: tglLahirStr,
          namaAyah: String(row[8] || ""),
          namaIbu: String(row[9] || ""),
          kontakOrtu: String(row[10] || ""),
          statusMurid: String(row[11] || "AKTIF"),
          alamat: String(row[12] || "")
        };
        break;
      }
    }

    if (!muridProfile) {
      return apiResponse(false, null, "Data profil murid dengan NIS " + nis + " tidak ditemukan.");
    }

    // Cari Info Kelompok & Wali Kelas
    var namaKelompok = muridProfile.idKelompok;
    var namaWaliKelas = "-";
    for (var k = 1; k < kelompokData.length; k++) {
      if (String(kelompokData[k][0]).trim().toUpperCase() === String(muridProfile.idKelompok).trim().toUpperCase()) {
        namaKelompok = String(kelompokData[k][1] || muridProfile.idKelompok);
        namaWaliKelas = String(kelompokData[k][4] || "-");
        break;
      }
    }
    muridProfile.namaKelompok = namaKelompok;
    muridProfile.namaWaliKelas = namaWaliKelas;

    // Cek Status Akses Global Tahun Ajaran
    var aksesGlobalDibuka = false;
    var namaTAAktif = "-";
    for (var t = 1; t < taData.length; t++) {
      if (String(taData[t][3]).toUpperCase() === "AKTIF") {
        namaTAAktif = String(taData[t][1]) + " (Semester " + String(taData[t][2]) + ")";
        if (String(taData[t][4]).toUpperCase() === "DIBUKA") {
          aksesGlobalDibuka = true;
        }
        break;
      }
    }

    // Ambil Raport Murid yang DISETUJUI oleh Kepala Sekolah
    // Header: [0:ID, 1:NIS, 2:ID_Kelompok, 3:ID_TA, 4:Sem, 5:URL, 6:FileID, 7:Catatan, 8:Status_Approval, 9:Catatan_Revisi, 10:Uploader, 11:Reviewed_By, 12:Tgl_Review, 13:Tgl_Dilihat, 14:Wali_Konf, 15:Timestamp]
    var raportList = [];
    var pendingCount = 0;

    for (var r = 1; r < raportData.length; r++) {
      var rRow = raportData[r];
      if (!rRow[0]) continue;

      if (String(rRow[1]).trim() === String(nis).trim()) {
        var statusApp = String(rRow[8] || "DRAF").toUpperCase();
        
        // HANYA jika status sudah DISETUJUI oleh Kepala Sekolah
        if (statusApp === "DISETUJUI") {
          raportList.push({
            idRaport: String(rRow[0]),
            tahunAjaran: String(rRow[3]),
            semester: String(rRow[4]),
            urlPdf: String(rRow[5]),
            fileId: String(rRow[6]),
            catatanPerkembangan: String(rRow[7] || ""),
            statusApproval: statusApp,
            disetujuiOleh: String(rRow[11] || "Kepala Sekolah"),
            tanggalDisetujui: rRow[12] ? Utilities.formatDate(new Date(rRow[12]), "GMT+7", "dd/MM/yyyy") : "-",
            sudahDilihat: !!rRow[13],
            tanggalDilihat: rRow[13] ? Utilities.formatDate(new Date(rRow[13]), "GMT+7", "dd/MM/yyyy HH:mm") : null,
            waliKonfirmasi: String(rRow[14] || "")
          });
        } else {
          pendingCount++;
        }
      }
    }

    return apiResponse(true, {
      murid: muridProfile,
      raportList: raportList,
      pendingCount: pendingCount,
      aksesGlobalDibuka: aksesGlobalDibuka,
      tahunAjaranAktif: namaTAAktif
    }, "Data raport murid berhasil dimuat.");

  } catch (err) {
    return apiResponse(false, null, "Gagal memuat data raport murid: " + err.message);
  }
}

/**
 * Konfirmasi tanda terima raport oleh Orang Tua / Wali Murid
 */
function confirmReportViewedByParent(reportId, parentName) {
  try {
    if (!reportId) return apiResponse(false, null, "ID Raport tidak valid.");

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var raportSheet = ss.getSheetByName("DB_Raport");
    var data = raportSheet.getDataRange().getValues();
    var rowIndex = -1;
    var targetNis = "";

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reportId).trim()) {
        rowIndex = i + 1;
        targetNis = String(data[i][1]);
        break;
      }
    }

    if (rowIndex === -1) {
      return apiResponse(false, null, "Data raport tidak ditemukan.");
    }

    var now = new Date();
    // Kolom 14: Tanggal_Dilihat_Ortu (N), Kolom 15: Nama_Wali_Konfirmasi (O)
    raportSheet.getRange(rowIndex, 14).setValue(now);
    raportSheet.getRange(rowIndex, 15).setValue(parentName || "Wali Murid");

    logActivity(parentName || "Wali Murid", "ORTU", "KONFIRMASI RAPORT", "Wali Murid mengonfirmasi telah membaca raport ID: " + reportId + " (NIS: " + targetNis + ")");
    return apiResponse(true, { confirmedAt: Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm") }, "Terima kasih, konfirmasi penerimaan raport telah tersimpan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menyimpan konfirmasi: " + err.message);
  }
}
