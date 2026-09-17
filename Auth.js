/**
 * ============================================================================
 * MODUL AUTENTIKASI (LOGIN & SESI)
 * Menangani login multi-peran: Admin, Wali Kelas, dan Orang Tua
 * ============================================================================
 */

/**
 * Login Handler Utama
 * @param {Object} payload { role: 'ADMIN'|'WALI_KELAS'|'ORTU', identifier: string, secret: string }
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
      return apiResponse(false, null, "Database belum dapat diakses. Silakan jalankan initialSetup() terlebih dahulu.");
    }

    var role = String(payload.role).toUpperCase();
    var identifier = String(payload.identifier).trim();
    var secret = String(payload.secret).trim();

    // 1. AUTENTIKASI ORANG TUA (Menggunakan NIS/NISN & PIN Ortu)
    if (role === 'ORTU' || role === 'ORANG_TUA') {
      var siswaSheet = ss.getSheetByName("DB_Siswa");
      if (!siswaSheet) {
        setupSheetSiswa(ss);
        siswaSheet = ss.getSheetByName("DB_Siswa");
      }

      var dataSiswa = siswaSheet.getDataRange().getValues();
      
      // Header: [NIS, NISN, Nama_Siswa, Panggilan, Jenjang, Kelas, Jenis_Kelamin, Tanggal_Lahir, Nama_Orangtua, No_WA_Ortu, PIN_Ortu, Status]
      for (var i = 1; i < dataSiswa.length; i++) {
        var row = dataSiswa[i];
        if (!row[0]) continue;

        var nis = String(row[0]).trim();
        var nisn = String(row[1] || "").trim();
        var pin = String(row[10] || "").trim();
        var status = String(row[11] || "AKTIF").trim().toUpperCase();

        if ((nis === identifier || nisn === identifier) && pin === secret) {
          if (status !== 'AKTIF') {
            return apiResponse(false, null, "Status siswa ini tidak aktif. Silakan hubungi tata usaha sekolah.");
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
            nisn: nisn,
            namaSiswa: String(row[2] || ""),
            namaPanggilan: String(row[3] || row[2] || ""),
            jenjang: String(row[4] || ""),
            kelas: String(row[5] || ""),
            jenisKelamin: String(row[6] || ""),
            tanggalLahir: tglLahirStr,
            namaOrangtua: String(row[8] || ""),
            noWa: String(row[9] || "")
          };

          logActivity(userData.namaSiswa + " (" + nis + ")", "ORTU", "LOGIN", "Login berhasil via Portal Orang Tua");
          return apiResponse(true, userData, "Selamat datang, Ayah/Bunda dari " + userData.namaSiswa + "!");
        }
      }
      return apiResponse(false, null, "NIS/NISN atau PIN yang dimasukkan tidak cocok.");
    }

    // 2. AUTENTIKASI ADMIN & WALI KELAS (Menggunakan Username & Password)
    var usersSheet = ss.getSheetByName("DB_Users");
    if (!usersSheet) {
      setupSheetUsers(ss);
      usersSheet = ss.getSheetByName("DB_Users");
    }

    var usersData = usersSheet.getDataRange().getValues();
    
    // Header: [User_ID, Username, Password, Nama_Lengkap, Role, Kelas_Diampu, No_HP, Status]
    for (var j = 1; j < usersData.length; j++) {
      var uRow = usersData[j];
      if (!uRow[0]) continue;

      var uId = String(uRow[0]).trim();
      var uName = String(uRow[1]).trim().toLowerCase();
      var uPass = String(uRow[2]).trim();
      var uFullName = String(uRow[3] || "");
      var uRole = String(uRow[4] || "").trim().toUpperCase();
      var uClass = String(uRow[5] || "");
      var uStatus = String(uRow[7] || "AKTIF").trim().toUpperCase();

      if (uName === identifier.toLowerCase() && uPass === secret) {
        if (uStatus !== 'AKTIF') {
          return apiResponse(false, null, "Akun Anda berstatus non-aktif. Silakan hubungi Admin.");
        }

        // Cek kecocokan role yang dipilih
        if (role !== 'ANY' && uRole !== role) {
          return apiResponse(false, null, "Akun ini tidak memiliki hak akses sebagai " + role);
        }

        var staffData = {
          userId: uId,
          username: uName,
          namaLengkap: uFullName,
          role: uRole,
          kelasDiampu: uClass,
          noHp: String(uRow[6] || "")
        };

        logActivity(uFullName + " (" + uName + ")", uRole, "LOGIN", "Login berhasil ke Dashboard " + uRole);
        return apiResponse(true, staffData, "Selamat datang, " + uFullName + "!");
      }
    }

    return apiResponse(false, null, "Username atau kata sandi salah.");

  } catch (err) {
    console.error("Login Error: " + err.stack);
    return apiResponse(false, null, "Terjadi kesalahan server: " + err.message);
  }
}
