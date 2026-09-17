/**
 * ============================================================================
 * MODUL AUTENTIKASI (LOGIN & SESI)
 * Menangani login 4 peran: Admin, Kepala Sekolah, Wali Kelas, dan Wali Murid
 * ============================================================================
 */

/**
 * Login Handler Utama
 * @param {Object} payload { role: 'ADMIN'|'KEPSEK'|'WALI_KELAS'|'ORTU', identifier: string, secret: string }
 */
function handleLogin(payload) {
  try {
    if (!payload || !payload.role || !payload.identifier || !payload.secret) {
      return apiResponse(false, null, "Mohon lengkapi data login Anda.");
    }

    var ss = getDatabaseSpreadsheet();
    if (!ss) {
      initialSetup();
      ss = getDatabaseSpreadsheet();
    }

    if (!ss) {
      return apiResponse(false, null, "Database belum dapat diakses. Silakan hubungi Administrator.");
    }

    var role = String(payload.role).toUpperCase();
    var identifier = String(payload.identifier).trim();
    var secret = String(payload.secret).trim();

    // 1. AUTENTIKASI WALI MURID (Menggunakan NIS & PIN Akses/Tanggal Lahir)
    if (role === 'ORTU' || role === 'ORANG_TUA' || role === 'WALI_MURID') {
      var muridSheet = ss.getSheetByName("DB_Murid") || ss.getSheetByName("DB_Siswa");
      if (!muridSheet) {
        setupSheetMurid(ss);
        muridSheet = ss.getSheetByName("DB_Murid");
      }

      var dataMurid = muridSheet.getDataRange().getValues();
      
      // Header: [NIS, Nama_Lengkap, Nama_Panggilan, Jenis_Kelamin, Jenjang, ID_Kelompok, Tempat_Lahir, Tanggal_Lahir, Nama_Ayah, Nama_Ibu, Kontak_Ortu, Status_Murid, Alamat, PIN_Akses, Timestamp]
      for (var i = 1; i < dataMurid.length; i++) {
        var row = dataMurid[i];
        if (!row[0]) continue;

        var nis = String(row[0]).trim();
        var pin = String(row[13] || "").trim();
        var status = String(row[11] || "AKTIF").trim().toUpperCase();

        if (nis.toLowerCase() === identifier.toLowerCase() && pin === secret) {
          if (status !== 'AKTIF') {
            return apiResponse(false, null, "Status murid ini tidak aktif. Silakan hubungi pihak sekolah.");
          }

          var tglLahirStr = "";
          if (row[7]) {
            if (row[7] instanceof Date) {
              tglLahirStr = Utilities.formatDate(row[7], "GMT+7", "yyyy-MM-dd");
            } else {
              tglLahirStr = String(row[7]);
            }
          }

          var userData = {
            role: "ORTU",
            nis: nis,
            namaMurid: String(row[1] || ""),
            namaPanggilan: String(row[2] || row[1] || ""),
            jenisKelamin: String(row[3] || ""),
            jenjang: String(row[4] || ""),
            idKelompok: String(row[5] || ""),
            tempatLahir: String(row[6] || ""),
            tanggalLahir: tglLahirStr,
            namaAyah: String(row[8] || ""),
            namaIbu: String(row[9] || ""),
            kontakOrtu: String(row[10] || ""),
            alamat: String(row[12] || "")
          };

          logActivity(userData.namaMurid + " (" + nis + ")", "ORTU", "LOGIN", "Login berhasil via Portal Wali Murid");
          return apiResponse(true, userData, "Selamat datang, Ayah/Bunda dari " + userData.namaMurid + "!");
        }
      }
      return apiResponse(false, null, "NIS atau PIN yang dimasukkan tidak cocok.");
    }

    // 2. AUTENTIKASI ADMIN, KEPALA SEKOLAH, & WALI KELAS (Username & Password)
    var usersSheet = ss.getSheetByName("DB_Users");
    if (!usersSheet) {
      setupSheetUsers(ss);
      usersSheet = ss.getSheetByName("DB_Users");
    }

    var usersData = usersSheet.getDataRange().getValues();
    
    // Header: [ID_User, Username, Password, Nama_Lengkap, Role, Kelompok_Diampu, Kontak_WA, Status, Timestamp]
    for (var j = 1; j < usersData.length; j++) {
      var uRow = usersData[j];
      if (!uRow[0]) continue;

      var uId = String(uRow[0]).trim();
      var uName = String(uRow[1]).trim().toLowerCase();
      var uPass = String(uRow[2]).trim();
      var uFullName = String(uRow[3] || "");
      var uRole = String(uRow[4] || "").trim().toUpperCase();
      var uKelompok = String(uRow[5] || "");
      var uStatus = String(uRow[7] || "AKTIF").trim().toUpperCase();

      if (uName === identifier.toLowerCase() && uPass === secret) {
        if (uStatus !== 'AKTIF') {
          return apiResponse(false, null, "Akun Anda berstatus non-aktif. Silakan hubungi Administrator.");
        }

        // Cek kecocokan role
        if (role !== 'ANY' && uRole !== role) {
          return apiResponse(false, null, "Akun ini terdaftar sebagai " + uRole + ", bukan " + role);
        }

        var staffData = {
          userId: uId,
          username: uName,
          namaLengkap: uFullName,
          role: uRole,
          kelompokDiampu: uKelompok,
          kontakWa: String(uRow[6] || "")
        };

        logActivity(uFullName + " (" + uName + ")", uRole, "LOGIN", "Login berhasil ke Portal " + uRole);
        return apiResponse(true, staffData, "Selamat datang, " + uFullName + "!");
      }
    }

    return apiResponse(false, null, "Username atau kata sandi salah.");

  } catch (err) {
    console.error("Login Error: " + err.stack);
    return apiResponse(false, null, "Terjadi kesalahan server: " + err.message);
  }
}
