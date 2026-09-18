/**
 * ============================================================================
 * MODUL ADMIN (KONTROL DATA MASTER MURID, GURU, KELOMPOK, & PUBLIKASI)
 * PG - TK - DAYCARE ANAK SALEH
 * ============================================================================
 */

/**
 * Master API: Mengambil seluruh data Admin (Summary, Murid, Guru, Kelompok, TA) dalam 1 kali roundtrip
 */
function getAdminAllData() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var usersSheet = ss.getSheetByName("DB_Users");
    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    var muridData = muridSheet ? muridSheet.getDataRange().getValues() : [];
    var usersData = usersSheet ? usersSheet.getDataRange().getValues() : [];
    var kelompokData = kelompokSheet ? kelompokSheet.getDataRange().getValues() : [];
    var raportData = raportSheet ? raportSheet.getDataRange().getValues() : [];
    var taData = taSheet ? taSheet.getDataRange().getValues() : [];

    // 1. Parse Murid
    var students = [];
    var totalMurid = 0;
    var perJenjang = { "Playgroup (PG)": 0, "TK-A": 0, "TK-B": 0, "Daycare": 0 };
    var muridCountMap = {};

    for (var i = 1; i < muridData.length; i++) {
      var row = muridData[i];
      if (!row[0]) continue;

      var jg = String(row[4] || "");
      var kId = String(row[5] || "");
      var st = String(row[11] || "AKTIF").toUpperCase();

      if (st === "AKTIF") {
        totalMurid++;
        if (perJenjang[jg] !== undefined) perJenjang[jg]++;
        if (kId) muridCountMap[kId] = (muridCountMap[kId] || 0) + 1;
      }

      var tglLahir = "";
      if (row[7]) {
        if (row[7] instanceof Date) {
          tglLahir = Utilities.formatDate(row[7], "GMT+7", "yyyy-MM-dd");
        } else {
          tglLahir = String(row[7]);
        }
      }

      students.push({
        nis: String(row[0]).trim(),
        namaLengkap: String(row[1] || ""),
        namaPanggilan: String(row[2] || ""),
        jenisKelamin: String(row[3] || "L"),
        jenjang: jg,
        idKelompok: kId,
        tempatLahir: String(row[6] || ""),
        tanggalLahir: tglLahir,
        namaAyah: String(row[8] || ""),
        namaIbu: String(row[9] || ""),
        kontakOrtu: String(row[10] || ""),
        status: st,
        alamat: String(row[12] || ""),
        pin: String(row[13] || "")
      });
    }

    // 2. Parse Users (Guru & Kepsek)
    var teachers = [];
    var totalGuru = 0;
    var totalKepsek = 0;
    for (var j = 1; j < usersData.length; j++) {
      var uRow = usersData[j];
      if (!uRow[0]) continue;
      var role = String(uRow[4] || "WALI_KELAS").toUpperCase();
      var uStatus = String(uRow[7] || "AKTIF").toUpperCase();
      if (uStatus === "AKTIF") {
        if (role === "WALI_KELAS" || role === "GURU") totalGuru++;
        else if (role === "KEPSEK") totalKepsek++;
      }
      teachers.push({
        userId: String(uRow[0]).trim(),
        username: String(uRow[1] || "").trim(),
        password: String(uRow[2] || ""),
        namaLengkap: String(uRow[3] || ""),
        role: role,
        kelompokDiampu: String(uRow[5] || ""),
        kontakWa: String(uRow[6] || ""),
        status: uStatus
      });
    }

    // 3. Parse Kelompok
    var classes = [];
    for (var c = 1; c < kelompokData.length; c++) {
      var cRow = kelompokData[c];
      if (!cRow[0]) continue;
      var idKel = String(cRow[0]).trim();
      classes.push({
        idKelompok: idKel,
        namaKelompok: String(cRow[1] || ""),
        jenjang: String(cRow[2] || ""),
        idWaliKelas: String(cRow[3] || ""),
        namaWaliKelas: String(cRow[4] || ""),
        kapasitas: Number(cRow[5] || 15),
        tahunAjaran: String(cRow[6] || "2025/2026"),
        status: String(cRow[7] || "AKTIF"),
        jumlahMurid: muridCountMap[idKel] || 0
      });
    }

    // 4. Parse Raport Stats
    var raportStats = {
      total: Math.max(0, raportData.length - 1),
      draf: 0,
      diajukan: 0,
      revisi: 0,
      disetujui: 0
    };
    for (var rp = 1; rp < raportData.length; rp++) {
      var appSt = String(raportData[rp][8] || "").toUpperCase();
      if (appSt === "DIAJUKAN") raportStats.diajukan++;
      else if (appSt === "REVISI") raportStats.revisi++;
      else if (appSt === "DISETUJUI") raportStats.disetujui++;
      else if (appSt === "DRAF") raportStats.draf++;
    }

    // 5. Parse Tahun Ajaran
    var years = [];
    var activeTA = { id: "", tahun: "-", semester: "-", statusAksesOrtu: "DITUTUP" };
    for (var t = 1; t < taData.length; t++) {
      var tRow = taData[t];
      if (!tRow[0]) continue;
      var taItem = {
        idTahun: String(tRow[0]),
        namaTahun: String(tRow[1]),
        semester: String(tRow[2]),
        statusAktif: String(tRow[3]),
        statusAksesOrtu: String(tRow[4])
      };
      years.push(taItem);
      if (taItem.statusAktif.toUpperCase() === "AKTIF") {
        activeTA = taItem;
      }
    }

    return apiResponse(true, {
      summary: {
        totalMurid: totalMurid,
        perJenjang: perJenjang,
        totalGuru: totalGuru,
        totalKepsek: totalKepsek,
        totalKelompok: classes.length,
        raportStats: raportStats,
        activeTA: activeTA
      },
      students: students,
      teachers: teachers,
      classes: classes,
      years: years
    }, "Data admin berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal memuat data master: " + err.message);
  }
}

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

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var usersSheet = ss.getSheetByName("DB_Users");
    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var raportSheet = ss.getSheetByName("DB_Raport");
    var taSheet = ss.getSheetByName("DB_TahunAjaran");

    var muridData = muridSheet ? muridSheet.getDataRange().getValues() : [];
    var usersData = usersSheet ? usersSheet.getDataRange().getValues() : [];
    var kelompokData = kelompokSheet ? kelompokSheet.getDataRange().getValues() : [];
    var raportData = raportSheet ? raportSheet.getDataRange().getValues() : [];
    var taData = taSheet ? taSheet.getDataRange().getValues() : [];

    // Hitung Murid Aktif
    var totalMurid = 0;
    var perJenjang = { "Playgroup (PG)": 0, "TK-A": 0, "TK-B": 0, "Daycare": 0 };
    for (var i = 1; i < muridData.length; i++) {
      if (String(muridData[i][11] || "AKTIF").trim().toUpperCase() === "AKTIF") {
        totalMurid++;
        var jg = muridData[i][4];
        if (perJenjang[jg] !== undefined) perJenjang[jg]++;
      }
    }

    // Hitung Guru & Kepsek
    var totalGuru = 0;
    var totalKepsek = 0;
    for (var j = 1; j < usersData.length; j++) {
      var r = String(usersData[j][4] || "").trim().toUpperCase();
      var st = String(usersData[j][7] || "AKTIF").trim().toUpperCase();
      if (st === "AKTIF") {
        if (r === "WALI_KELAS" || r === "GURU") totalGuru++;
        else if (r === "KEPSEK") totalKepsek++;
      }
    }

    // Hitung Kelompok
    var totalKelompok = Math.max(0, kelompokData.length - 1);

    // Hitung Status Raport
    var raportStats = {
      total: Math.max(0, raportData.length - 1),
      draf: 0,
      diajukan: 0,
      revisi: 0,
      disetujui: 0
    };
    for (var rp = 1; rp < raportData.length; rp++) {
      var appSt = String(raportData[rp][8] || "").toUpperCase();
      if (appSt === "DIAJUKAN") raportStats.diajukan++;
      else if (appSt === "REVISI") raportStats.revisi++;
      else if (appSt === "DISETUJUI") raportStats.disetujui++;
      else if (appSt === "DRAF") raportStats.draf++;
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

    // Daftar Kelompok untuk Dropdown Filter
    var kelompokOptions = [];
    for (var c = 1; c < kelompokData.length; c++) {
      if (kelompokData[c][0]) {
        kelompokOptions.push({
          id: String(kelompokData[c][0]),
          nama: String(kelompokData[c][1]),
          jenjang: String(kelompokData[c][2]),
          waliKelas: String(kelompokData[c][4] || "")
        });
      }
    }

    var summary = {
      totalMurid: totalMurid,
      perJenjang: perJenjang,
      totalGuru: totalGuru,
      totalKepsek: totalKepsek,
      totalKelompok: totalKelompok,
      raportStats: raportStats,
      activeTA: activeTA,
      kelompokOptions: kelompokOptions
    };

    return apiResponse(true, summary, "Data summary Admin berhasil dimuat.");
  } catch (err) {
    console.error("Admin Summary Error: " + err.stack);
    return apiResponse(false, null, "Gagal memuat summary dashboard: " + err.message);
  }
}

/**
 * Mengambil daftar data murid lengkap dengan filter jenjang & kelompok
 */
function getStudentsListAdmin(filterJenjang, filterKelompok) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var data = muridSheet.getDataRange().getValues();
    var list = [];

    // Header: [NIS, Nama_Lengkap, Nama_Panggilan, Jenis_Kelamin, Jenjang, ID_Kelompok, Tempat_Lahir, Tanggal_Lahir, Nama_Ayah, Nama_Ibu, Kontak_Ortu, Status_Murid, Alamat, PIN_Akses, Timestamp]
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;

      var jenjang = String(row[4] || "");
      var kelompok = String(row[5] || "");

      if (filterJenjang && filterJenjang !== "SEMUA" && jenjang !== filterJenjang) continue;
      if (filterKelompok && filterKelompok !== "SEMUA" && kelompok !== filterKelompok) continue;

      var tglLahir = "";
      if (row[7]) {
        if (row[7] instanceof Date) {
          tglLahir = Utilities.formatDate(row[7], "GMT+7", "yyyy-MM-dd");
        } else {
          tglLahir = String(row[7]);
        }
      }

      list.push({
        nis: String(row[0]).trim(),
        namaLengkap: String(row[1] || ""),
        namaPanggilan: String(row[2] || ""),
        jenisKelamin: String(row[3] || ""),
        jenjang: jenjang,
        idKelompok: kelompok,
        tempatLahir: String(row[6] || ""),
        tanggalLahir: tglLahir,
        namaAyah: String(row[8] || ""),
        namaIbu: String(row[9] || ""),
        kontakOrtu: String(row[10] || ""),
        status: String(row[11] || "AKTIF"),
        alamat: String(row[12] || ""),
        pin: String(row[13] || "")
      });
    }

    return apiResponse(true, list, "Data murid berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengambil data murid: " + err.message);
  }
}

/**
 * Menyimpan atau memperbarui data murid (Single)
 */
function saveStudentAdmin(student, adminUser) {
  try {
    if (!student || !student.nis || !student.namaLengkap) {
      return apiResponse(false, null, "NIS dan Nama Lengkap murid wajib diisi.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var data = muridSheet.getDataRange().getValues();
    
    var nis = String(student.nis).trim();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === nis) {
        rowIndex = i + 1;
        break;
      }
    }

    // Default PIN: 6 digit tanggal lahir (DDMMYY) atau 123456
    var pin = student.pin || "123456";
    if (student.tanggalLahir && (!student.pin || student.pin === "")) {
      var parts = String(student.tanggalLahir).split("-");
      if (parts.length === 3) {
        pin = parts[2] + parts[1] + parts[0].slice(-2);
      }
    }

    var rowValues = [
      nis,
      student.namaLengkap,
      student.namaPanggilan || student.namaLengkap,
      student.jenisKelamin || "L",
      student.jenjang || "TK-A",
      student.idKelompok || "-",
      student.tempatLahir || "",
      student.tanggalLahir || "",
      student.namaAyah || "",
      student.namaIbu || "",
      student.kontakOrtu || "",
      student.status || "AKTIF",
      student.alamat || "",
      pin,
      new Date()
    ];

    if (rowIndex > 0) {
      // Update data murid
      muridSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE MURID", "Memperbarui data murid NIS: " + nis + " (" + student.namaLengkap + ")");
      return apiResponse(true, student, "Data murid berhasil diperbarui.");
    } else {
      // Tambah murid baru
      muridSheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "TAMBAH MURID", "Menambahkan murid baru NIS: " + nis + " (" + student.namaLengkap + ")");
      return apiResponse(true, student, "Murid baru berhasil ditambahkan.");
    }

  } catch (err) {
    return apiResponse(false, null, "Gagal menyimpan data murid: " + err.message);
  }
}

/**
 * Bulk Import / Simpan Massal Data Murid
 */
function bulkSaveStudentsAdmin(studentsList, adminUser) {
  try {
    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return apiResponse(false, null, "Tidak ada data murid yang diproses.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var data = muridSheet.getDataRange().getValues();

    // Map existing NIS -> row index
    var nisMap = {};
    for (var i = 1; i < data.length; i++) {
      var n = String(data[i][0]).trim();
      if (n) nisMap[n] = i + 1;
    }

    var inserted = 0;
    var updated = 0;

    for (var s = 0; s < studentsList.length; s++) {
      var st = studentsList[s];
      if (!st.nis || !st.namaLengkap) continue;

      var nis = String(st.nis).trim();
      var pin = st.pin || "123456";
      if (st.tanggalLahir && (!st.pin || st.pin === "")) {
        var parts = String(st.tanggalLahir).split("-");
        if (parts.length === 3) {
          pin = parts[2] + parts[1] + parts[0].slice(-2);
        }
      }

      var rowValues = [
        nis,
        st.namaLengkap,
        st.namaPanggilan || st.namaLengkap,
        st.jenisKelamin || "L",
        st.jenjang || "TK-A",
        st.idKelompok || "-",
        st.tempatLahir || "",
        st.tanggalLahir || "",
        st.namaAyah || "",
        st.namaIbu || "",
        st.kontakOrtu || "",
        st.status || "AKTIF",
        st.alamat || "",
        pin,
        new Date()
      ];

      if (nisMap[nis]) {
        muridSheet.getRange(nisMap[nis], 1, 1, rowValues.length).setValues([rowValues]);
        updated++;
      } else {
        muridSheet.appendRow(rowValues);
        inserted++;
      }
    }

    logActivity(adminUser || "ADMIN", "ADMIN", "BULK IMPORT MURID", "Import massal murid: " + inserted + " baru, " + updated + " diperbarui.");
    return apiResponse(true, { inserted: inserted, updated: updated }, "Berhasil memproses " + (inserted + updated) + " data murid (" + inserted + " baru, " + updated + " diupdate).");
  } catch (err) {
    return apiResponse(false, null, "Gagal import massal murid: " + err.message);
  }
}

/**
 * Hapus Data Murid
 */
function deleteStudentAdmin(nis, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var data = muridSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(nis).trim()) {
        muridSheet.deleteRow(i + 1);
        logActivity(adminUser || "ADMIN", "ADMIN", "HAPUS MURID", "Menghapus data murid NIS: " + nis);
        return apiResponse(true, null, "Data murid berhasil dihapus.");
      }
    }

    return apiResponse(false, null, "Data murid tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menghapus murid: " + err.message);
  }
}

/**
 * Mengambil daftar Guru, Kepala Sekolah, dan Staff
 */
function getTeachersListAdmin() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var usersSheet = ss.getSheetByName("DB_Users");
    var data = usersSheet.getDataRange().getValues();
    var list = [];

    // Header: [ID_User, Username, Password, Nama_Lengkap, Role, Kelompok_Diampu, Kontak_WA, Status, Timestamp]
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;

      list.push({
        userId: String(row[0]).trim(),
        username: String(row[1] || "").trim(),
        password: String(row[2] || ""),
        namaLengkap: String(row[3] || ""),
        role: String(row[4] || "WALI_KELAS"),
        kelompokDiampu: String(row[5] || ""),
        kontakWa: String(row[6] || ""),
        status: String(row[7] || "AKTIF")
      });
    }

    return apiResponse(true, list, "Data pengguna/guru berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengambil data guru: " + err.message);
  }
}

/**
 * Menyimpan / Update Data Guru, Kepala Sekolah, atau Admin
 */
function saveTeacherAdmin(userObj, adminUser) {
  try {
    if (!userObj || !userObj.username || !userObj.namaLengkap) {
      return apiResponse(false, null, "Username dan Nama Lengkap wajib diisi.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var usersSheet = ss.getSheetByName("DB_Users");
    var data = usersSheet.getDataRange().getValues();
    
    var username = String(userObj.username).trim().toLowerCase();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim().toLowerCase() === username) {
        rowIndex = i + 1;
        break;
      }
    }

    var userId = userObj.userId || ("USR-" + new Date().getTime().toString().slice(-6));
    var rowValues = [
      userId,
      username,
      userObj.password || "guru123",
      userObj.namaLengkap,
      userObj.role || "WALI_KELAS",
      userObj.kelompokDiampu || "-",
      userObj.kontakWa || "",
      userObj.status || "AKTIF",
      new Date()
    ];

    if (rowIndex > 0) {
      // Pertahankan password lama jika tidak diisi baru
      if (!userObj.password || userObj.password.trim() === "") {
        rowValues[2] = data[rowIndex - 1][2];
      }
      rowValues[0] = data[rowIndex - 1][0]; // Pertahankan User ID
      usersSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE USER", "Memperbarui akun " + userObj.role + ": " + username);
      return apiResponse(true, userObj, "Data akun berhasil diperbarui.");
    } else {
      usersSheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "TAMBAH USER", "Menambahkan akun " + userObj.role + ": " + username);
      return apiResponse(true, userObj, "Akun pengguna baru berhasil ditambahkan.");
    }

  } catch (err) {
    return apiResponse(false, null, "Gagal menyimpan akun: " + err.message);
  }
}

/**
 * Reset Password Akun Guru / Staff oleh Administrator
 */
function resetTeacherPasswordAdmin(userId, newPassword, adminUser) {
  try {
    if (!userId || !newPassword) {
      return apiResponse(false, null, "User ID dan Password Baru wajib diisi.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var usersSheet = ss.getSheetByName("DB_Users");
    var data = usersSheet.getDataRange().getValues();
    var targetUser = null;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(userId).trim()) {
        usersSheet.getRange(i + 1, 3).setValue(String(newPassword).trim());
        targetUser = String(data[i][3] || data[i][1]);
        break;
      }
    }

    if (targetUser) {
      logActivity(adminUser || "ADMIN", "ADMIN", "RESET PASSWORD", "Mereset password akun: " + targetUser);
      return apiResponse(true, null, "Password akun " + targetUser + " berhasil direset.");
    }

    return apiResponse(false, null, "Akun pengguna tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mereset password: " + err.message);
  }
}

/**
 * Hapus Akun Guru / Staff oleh Administrator
 */
function deleteTeacherAdmin(userId, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var usersSheet = ss.getSheetByName("DB_Users");
    var data = usersSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(userId).trim()) {
        var nama = String(data[i][3] || data[i][1]);
        usersSheet.deleteRow(i + 1);
        logActivity(adminUser || "ADMIN", "ADMIN", "HAPUS USER", "Menghapus akun: " + nama);
        return apiResponse(true, null, "Akun " + nama + " berhasil dihapus.");
      }
    }

    return apiResponse(false, null, "Akun tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menghapus akun: " + err.message);
  }
}

/**
 * Mengambil daftar Data Kelompok Belajar (Rombel)
 */
function getClassesListAdmin() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");

    var kelompokData = kelompokSheet.getDataRange().getValues();
    var muridData = muridSheet ? muridSheet.getDataRange().getValues() : [];

    // Hitung jumlah murid per kelompok
    var muridCountMap = {};
    for (var m = 1; m < muridData.length; m++) {
      var kId = String(muridData[m][5] || "").trim();
      var st = String(muridData[m][11] || "AKTIF").toUpperCase();
      if (kId && st === "AKTIF") {
        muridCountMap[kId] = (muridCountMap[kId] || 0) + 1;
      }
    }

    var list = [];
    // Header: [ID_Kelompok, Nama_Kelompok, Jenjang, ID_Wali_Kelas, Nama_Wali_Kelas, Kapasitas, Tahun_Ajaran, Status, Timestamp]
    for (var i = 1; i < kelompokData.length; i++) {
      var row = kelompokData[i];
      if (!row[0]) continue;

      var idKelompok = String(row[0]).trim();
      list.push({
        idKelompok: idKelompok,
        namaKelompok: String(row[1] || ""),
        jenjang: String(row[2] || ""),
        idWaliKelas: String(row[3] || ""),
        namaWaliKelas: String(row[4] || ""),
        kapasitas: Number(row[5] || 15),
        tahunAjaran: String(row[6] || ""),
        status: String(row[7] || "AKTIF"),
        jumlahMurid: muridCountMap[idKelompok] || 0
      });
    }

    return apiResponse(true, list, "Data kelompok berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengambil data kelompok: " + err.message);
  }
}

/**
 * Menyimpan / Update Data Kelompok
 */
function saveClassAdmin(kelompokObj, adminUser) {
  try {
    if (!kelompokObj || !kelompokObj.idKelompok || !kelompokObj.namaKelompok) {
      return apiResponse(false, null, "ID Kelompok dan Nama Kelompok wajib diisi.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var data = kelompokSheet.getDataRange().getValues();
    
    var idKelompok = String(kelompokObj.idKelompok).trim().toUpperCase();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === idKelompok) {
        rowIndex = i + 1;
        break;
      }
    }

    var rowValues = [
      idKelompok,
      kelompokObj.namaKelompok,
      kelompokObj.jenjang || "TK-A",
      kelompokObj.idWaliKelas || "",
      kelompokObj.namaWaliKelas || "",
      Number(kelompokObj.kapasitas || 15),
      kelompokObj.tahunAjaran || "2025/2026",
      kelompokObj.status || "AKTIF",
      new Date()
    ];

    if (rowIndex > 0) {
      kelompokSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE KELOMPOK", "Memperbarui kelompok: " + idKelompok + " (" + kelompokObj.namaKelompok + ")");
      return apiResponse(true, kelompokObj, "Data kelompok berhasil diperbarui.");
    } else {
      kelompokSheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "TAMBAH KELOMPOK", "Menambahkan kelompok baru: " + idKelompok);
      return apiResponse(true, kelompokObj, "Kelompok baru berhasil ditambahkan.");
    }

  } catch (err) {
    return apiResponse(false, null, "Gagal menyimpan kelompok: " + err.message);
  }
}

/**
 * Hapus Data Kelompok
 */
function deleteClassAdmin(idKelompok, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
    var data = kelompokSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === String(idKelompok).trim().toUpperCase()) {
        kelompokSheet.deleteRow(i + 1);
        logActivity(adminUser || "ADMIN", "ADMIN", "HAPUS KELOMPOK", "Menghapus kelompok: " + idKelompok);
        return apiResponse(true, null, "Data kelompok berhasil dihapus.");
      }
    }

    return apiResponse(false, null, "Data kelompok tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menghapus kelompok: " + err.message);
  }
}

/**
 * Mengambil daftar murid di dalam kelompok tertentu
 */
function getClassStudentsAdmin(idKelompok) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
    var data = muridSheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[5] || "").trim().toUpperCase() === String(idKelompok).trim().toUpperCase()) {
        list.push({
          nis: String(row[0]),
          namaLengkap: String(row[1]),
          panggilan: String(row[2] || row[1]),
          jenisKelamin: String(row[3]),
          jenjang: String(row[4]),
          status: String(row[11] || "AKTIF")
        });
      }
    }

    return apiResponse(true, list, "Data anggota kelompok berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal memuat anggota kelompok: " + err.message);
  }
}

/**
 * Mengambil daftar Tahun Pelajaran
 */
function getAcademicYearsListAdmin() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var taSheet = ss.getSheetByName("DB_TahunAjaran");
    var data = taSheet.getDataRange().getValues();
    var list = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      list.push({
        idTahun: String(row[0]),
        namaTahun: String(row[1]),
        semester: String(row[2]),
        statusAktif: String(row[3]),
        statusAksesOrtu: String(row[4])
      });
    }

    return apiResponse(true, list, "Data tahun pelajaran berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengambil data tahun pelajaran: " + err.message);
  }
}

/**
 * Mengatur Tahun Pelajaran Aktif & Status Akses Wali Murid
 */
function setAcademicYearSettingsAdmin(idTahun, statusAktif, aksesOrtu, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var taSheet = ss.getSheetByName("DB_TahunAjaran");
    var data = taSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var curId = String(data[i][0]).trim();
      if (curId === String(idTahun).trim()) {
        if (statusAktif) taSheet.getRange(i + 1, 4).setValue("AKTIF");
        if (aksesOrtu) taSheet.getRange(i + 1, 5).setValue(aksesOrtu);
      } else if (statusAktif === "AKTIF") {
        // Matikan tahun ajaran lain jika yang ini diaktifkan
        taSheet.getRange(i + 1, 4).setValue("NONAKTIF");
      }
    }

    logActivity(adminUser || "ADMIN", "ADMIN", "PENGATURAN TA", "Mengubah pengaturan tahun ajaran: " + idTahun);
    return apiResponse(true, null, "Pengaturan tahun pelajaran dan publikasi berhasil diperbarui.");
  } catch (err) {
    return apiResponse(false, null, "Gagal mengubah pengaturan: " + err.message);
  }
}

/**
 * Mengambil Log Aktivitas Sistem
 */
function getActivityLogsAdmin(limit) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var logSheet = ss.getSheetByName("DB_LogAktivitas");
    if (!logSheet) return apiResponse(true, [], "Belum ada log.");

    var data = logSheet.getDataRange().getValues();
    var list = [];
    var max = limit || 50;

    for (var i = data.length - 1; i >= 1 && list.length < max; i--) {
      var row = data[i];
      if (!row[0]) continue;
      var tglStr = row[0] instanceof Date ? Utilities.formatDate(row[0], "GMT+7", "dd/MM/yyyy HH:mm:ss") : String(row[0]);
      list.push({
        timestamp: tglStr,
        user: String(row[1] || "-"),
        role: String(row[2] || "-"),
        aktivitas: String(row[3] || "-"),
        detail: String(row[4] || "-")
      });
    }

    return apiResponse(true, list, "Log aktivitas berhasil dimuat.");
  } catch (err) {
    return apiResponse(false, null, "Gagal memuat log: " + err.message);
  }
}

/**
 * Menyimpan Pengaturan Branding Sekolah & Logo ke Script Properties & Google Drive
 */
function saveSchoolSettingsAdmin(settings, adminUser) {
  try {
    if (!settings) return apiResponse(false, null, "Data pengaturan kosong.");
    
    // Jika ada upload gambar logo baru dalam format base64
    if (settings.logoImg && typeof settings.logoImg === 'string' && settings.logoImg.indexOf('data:image/') === 0) {
      try {
        var rootFolder = getOrCreateRootFolder();
        var mimeType = "image/png";
        var ext = "png";
        if (settings.logoImg.indexOf('data:image/jpeg') === 0 || settings.logoImg.indexOf('data:image/jpg') === 0) {
          mimeType = "image/jpeg";
          ext = "jpg";
        } else if (settings.logoImg.indexOf('data:image/svg+xml') === 0) {
          mimeType = "image/svg+xml";
          ext = "svg";
        }
        
        var base64Data = settings.logoImg.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, "").replace(/^data:.*;base64,/, "");
        var decodedBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decodedBytes, mimeType, "LOGO_SEKOLAH_ANAK_SALEH." + ext);
        
        // Hapus file logo lama di folder Drive jika ada
        var existingLogoFiles = rootFolder.getFilesByName("LOGO_SEKOLAH_ANAK_SALEH.png");
        while (existingLogoFiles.hasNext()) {
          try { existingLogoFiles.next().setTrashed(true); } catch(e) {}
        }
        var existingLogoJpg = rootFolder.getFilesByName("LOGO_SEKOLAH_ANAK_SALEH.jpg");
        while (existingLogoJpg.hasNext()) {
          try { existingLogoJpg.next().setTrashed(true); } catch(e) {}
        }
        
        var savedLogo = rootFolder.createFile(blob);
        savedLogo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var fileId = savedLogo.getId();
        settings.logoImg = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w500";
        settings.logoFileId = fileId;
      } catch (imgErr) {
        console.warn("Gagal menyimpan logo ke Drive: " + imgErr.message);
      }
    }

    var props = PropertiesService.getScriptProperties();
    props.setProperty("SCHOOL_SETTINGS_JSON", JSON.stringify(settings));
    logActivity(adminUser || "ADMIN", "ADMIN", "PENGATURAN SEKOLAH", "Memperbarui branding dan logo sekolah di cloud");
    return apiResponse(true, settings, "Pengaturan dan logo sekolah berhasil disimpan ke cloud Google Apps Script & Google Drive.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menyimpan pengaturan: " + err.message);
  }
}

/**
 * Mengambil Pengaturan Branding Sekolah & Logo dari Cloud
 */
function getSchoolSettingsAdmin() {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty("SCHOOL_SETTINGS_JSON");
    if (raw) {
      return apiResponse(true, JSON.parse(raw), "Pengaturan sekolah berhasil dimuat.");
    }
    return apiResponse(true, {
      name: "PG - TK - DAYCARE ANAK SALEH",
      tagline: "Portal Raport & Perkembangan Anak Usia Dini",
      logoType: "emoji",
      logoEmoji: "🌱",
      logoImg: "",
      alamat: "Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan",
      telepon: "0812-3456-7890"
    }, "Menggunakan pengaturan default.");
  } catch (err) {
    return apiResponse(false, null, "Gagal memuat pengaturan: " + err.message);
  }
}

/**
 * Menyimpan / Update Tahun Ajaran (Tapel)
 */
function saveAcademicYearAdmin(yearObj, adminUser) {
  try {
    if (!yearObj || !yearObj.idTahun) return apiResponse(false, null, "ID Tahun Ajaran wajib diisi.");
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var taSheet = ss.getSheetByName("DB_TahunAjaran");
    var data = taSheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(yearObj.idTahun).trim()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (yearObj.statusAktif === "AKTIF") {
      for (var k = 1; k < data.length; k++) {
        taSheet.getRange(k + 1, 4).setValue("NONAKTIF");
      }
    }

    var rowValues = [
      yearObj.idTahun,
      yearObj.namaTahun || "2025/2026",
      yearObj.semester || "Ganjil (Semester 1)",
      yearObj.statusAktif || "NONAKTIF",
      yearObj.statusAksesOrtu || "DITUTUP"
    ];

    if (rowIndex > 0) {
      taSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      logActivity(adminUser || "ADMIN", "ADMIN", "UPDATE TA", "Memperbarui tahun pelajaran: " + yearObj.idTahun);
      return apiResponse(true, yearObj, "Tahun pelajaran berhasil diperbarui.");
    } else {
      taSheet.appendRow(rowValues);
      logActivity(adminUser || "ADMIN", "ADMIN", "TAMBAH TA", "Menambahkan tahun pelajaran baru: " + yearObj.idTahun);
      return apiResponse(true, yearObj, "Tahun pelajaran baru berhasil ditambahkan.");
    }
  } catch (err) {
    return apiResponse(false, null, "Gagal menyimpan tahun pelajaran: " + err.message);
  }
}

/**
 * Hapus Tahun Ajaran (Tapel)
 */
function deleteAcademicYearAdmin(idTahun, adminUser) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return apiResponse(false, null, "Database belum siap.");

    var taSheet = ss.getSheetByName("DB_TahunAjaran");
    var data = taSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idTahun).trim()) {
        taSheet.deleteRow(i + 1);
        logActivity(adminUser || "ADMIN", "ADMIN", "HAPUS TA", "Menghapus tahun pelajaran: " + idTahun);
        return apiResponse(true, null, "Tahun pelajaran berhasil dihapus.");
      }
    }
    return apiResponse(false, null, "Tahun pelajaran tidak ditemukan.");
  } catch (err) {
    return apiResponse(false, null, "Gagal menghapus tahun pelajaran: " + err.message);
  }
}

/**
 * Full Sync: Menyinkronkan seluruh data lokal (murid, guru, kelompok, TA, raport, settings) ke Google Sheets
 */
function syncAllDataAdmin(payload, adminUser) {
  try {
    if (!payload || typeof payload !== 'object') {
      return apiResponse(false, null, "Payload sinkronisasi kosong atau tidak valid.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    var totalSynced = { murid: 0, users: 0, kelompok: 0, tahun_ajaran: 0, raport: 0 };

    // 1. Sinkronisasi Data Murid
    if (Array.isArray(payload.murid) && payload.murid.length > 0) {
      var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
      if (muridSheet) {
        var existingMurid = muridSheet.getDataRange().getValues();
        var existingNisMap = {};
        for (var i = 1; i < existingMurid.length; i++) {
          if (existingMurid[i][0]) existingNisMap[String(existingMurid[i][0]).trim()] = i + 1;
        }

        payload.murid.forEach(function(m) {
          if (!m || !m.nis) return;
          var nis = String(m.nis).trim();
          var rowValues = [
            nis,
            m.namaLengkap || "",
            m.namaPanggilan || "",
            m.jenisKelamin || "L",
            m.jenjang || "TK-A",
            m.idKelompok || "",
            m.tempatLahir || "",
            m.tanggalLahir || "",
            m.namaAyah || "",
            m.namaIbu || "",
            m.kontakOrtu || "",
            m.status || "AKTIF",
            m.alamat || "",
            m.pin || (m.tanggalLahir ? String(m.tanggalLahir).replace(/-/g, '') : "1234"),
            new Date()
          ];

          if (existingNisMap[nis]) {
            muridSheet.getRange(existingNisMap[nis], 1, 1, rowValues.length).setValues([rowValues]);
          } else {
            muridSheet.appendRow(rowValues);
            existingNisMap[nis] = muridSheet.getLastRow();
          }
          totalSynced.murid++;
        });
      }
    }

    // 2. Sinkronisasi Data Users (Guru/Kepsek/Admin)
    if (Array.isArray(payload.users) && payload.users.length > 0) {
      var usersSheet = ss.getSheetByName("DB_Users");
      if (usersSheet) {
        var existingUsers = usersSheet.getDataRange().getValues();
        var existingUserMap = {};
        for (var j = 1; j < existingUsers.length; j++) {
          if (existingUsers[j][0]) existingUserMap[String(existingUsers[j][0]).trim()] = j + 1;
          if (existingUsers[j][1]) existingUserMap[String(existingUsers[j][1]).trim().toLowerCase()] = j + 1;
        }

        payload.users.forEach(function(u) {
          if (!u || (!u.userId && !u.username)) return;
          var uId = String(u.userId || ("USR-" + String(u.username).toUpperCase())).trim();
          var uName = String(u.username || "").trim();
          var rowValues = [
            uId,
            uName,
            u.password || "guru123",
            u.namaLengkap || uName,
            u.role || "WALI_KELAS",
            u.kelompokDiampu || "",
            u.kontakWa || "",
            u.status || "AKTIF",
            new Date()
          ];

          var targetRow = existingUserMap[uId] || existingUserMap[uName.toLowerCase()];
          if (targetRow) {
            usersSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
          } else {
            usersSheet.appendRow(rowValues);
            existingUserMap[uId] = usersSheet.getLastRow();
          }
          totalSynced.users++;
        });
      }
    }

    // 3. Sinkronisasi Data Kelompok
    if (Array.isArray(payload.kelompok) && payload.kelompok.length > 0) {
      var kelompokSheet = ss.getSheetByName("DB_Kelompok") || ss.getSheetByName("DB_Kelas");
      if (kelompokSheet) {
        var existingKelompok = kelompokSheet.getDataRange().getValues();
        var existingKelMap = {};
        for (var k = 1; k < existingKelompok.length; k++) {
          if (existingKelompok[k][0]) existingKelMap[String(existingKelompok[k][0]).trim().toUpperCase()] = k + 1;
        }

        payload.kelompok.forEach(function(c) {
          if (!c || !c.idKelompok) return;
          var idK = String(c.idKelompok).trim().toUpperCase();
          var rowValues = [
            idK,
            c.namaKelompok || idK,
            c.jenjang || "TK-A",
            c.idWaliKelas || "",
            c.namaWaliKelas || "",
            Number(c.kapasitas || 15),
            c.tahunAjaran || "2025/2026",
            c.status || "AKTIF",
            new Date()
          ];

          if (existingKelMap[idK]) {
            kelompokSheet.getRange(existingKelMap[idK], 1, 1, rowValues.length).setValues([rowValues]);
          } else {
            kelompokSheet.appendRow(rowValues);
            existingKelMap[idK] = kelompokSheet.getLastRow();
          }
          totalSynced.kelompok++;
        });
      }
    }

    // 4. Sinkronisasi Tahun Ajaran
    if (Array.isArray(payload.tahun_ajaran) && payload.tahun_ajaran.length > 0) {
      var taSheet = ss.getSheetByName("DB_TahunAjaran");
      if (taSheet) {
        var existingTa = taSheet.getDataRange().getValues();
        var existingTaMap = {};
        for (var t = 1; t < existingTa.length; t++) {
          if (existingTa[t][0]) existingTaMap[String(existingTa[t][0]).trim()] = t + 1;
        }

        payload.tahun_ajaran.forEach(function(ta) {
          if (!ta || !ta.idTahun) return;
          var idT = String(ta.idTahun).trim();
          var rowValues = [
            idT,
            ta.namaTahun || "2025/2026",
            ta.semester || "Ganjil (Semester 1)",
            ta.statusAktif || "NONAKTIF",
            ta.statusAksesOrtu || "DITUTUP"
          ];

          if (existingTaMap[idT]) {
            taSheet.getRange(existingTaMap[idT], 1, 1, rowValues.length).setValues([rowValues]);
          } else {
            taSheet.appendRow(rowValues);
            existingTaMap[idT] = taSheet.getLastRow();
          }
          totalSynced.tahun_ajaran++;
        });
      }
    }

    // 5. Sinkronisasi Data Raport
    if (Array.isArray(payload.raport) && payload.raport.length > 0) {
      var raportSheet = ss.getSheetByName("DB_Raport");
      if (raportSheet) {
        var existingRaport = raportSheet.getDataRange().getValues();
        var existingRapMap = {};
        for (var r = 1; r < existingRaport.length; r++) {
          if (existingRaport[r][0]) existingRapMap[String(existingRaport[r][0]).trim()] = r + 1;
        }

        payload.raport.forEach(function(rp) {
          if (!rp || !rp.idRaport) return;
          var idR = String(rp.idRaport).trim();
          var rowValues = [
            idR,
            rp.nis || "",
            rp.idKelompok || "",
            rp.tahunAjaran || "2025/2026",
            rp.semester || "Ganjil (Semester 1)",
            rp.fileId || "",
            rp.urlPdf || "",
            rp.catatanPerkembangan || "",
            rp.statusApproval || "DIAJUKAN",
            rp.catatanRevisi || "",
            rp.uploaderUser || "Guru",
            rp.reviewedBy || "",
            rp.tanggalReview || "",
            rp.tanggalDilihat || "",
            rp.namaWaliKonfirmasi || "",
            rp.sudahDilihat ? "SUDAH" : "BELUM",
            new Date()
          ];

          if (existingRapMap[idR]) {
            raportSheet.getRange(existingRapMap[idR], 1, 1, rowValues.length).setValues([rowValues]);
          } else {
            raportSheet.appendRow(rowValues);
            existingRapMap[idR] = raportSheet.getLastRow();
          }
          totalSynced.raport++;
        });
      }
    }

    // 6. Sinkronisasi School Settings (Branding & Logo)
    if (payload.schoolSettings && typeof payload.schoolSettings === 'object') {
      var props = PropertiesService.getScriptProperties();
      props.setProperty("SCHOOL_SETTINGS_JSON", JSON.stringify(payload.schoolSettings));
    }

    logActivity(adminUser || "ADMIN", "SYNC", "SINKRONISASI LENGKAP", 
      Utilities.formatString("Sinkronisasi %d murid, %d guru, %d kelompok, %d raport", 
        totalSynced.murid, totalSynced.users, totalSynced.kelompok, totalSynced.raport));

    return apiResponse(true, totalSynced, "Seluruh data lokal berhasil disinkronkan ke Google Sheets!");
  } catch (err) {
    return apiResponse(false, null, "Gagal sinkronisasi data: " + err.message);
  }
}


