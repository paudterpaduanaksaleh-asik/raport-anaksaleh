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
 * Menyimpan Pengaturan Branding Sekolah & Logo ke Script Properties (Shared Cloud)
 */
function saveSchoolSettingsAdmin(settings, adminUser) {
  try {
    if (!settings) return apiResponse(false, null, "Data pengaturan kosong.");
    var props = PropertiesService.getScriptProperties();
    props.setProperty("SCHOOL_SETTINGS_JSON", JSON.stringify(settings));
    logActivity(adminUser || "ADMIN", "ADMIN", "PENGATURAN SEKOLAH", "Memperbarui branding dan logo sekolah");
    return apiResponse(true, settings, "Pengaturan dan logo sekolah berhasil disimpan ke cloud Google Apps Script.");
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

