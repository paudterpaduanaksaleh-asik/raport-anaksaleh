# 🌟 Sistem Dashboard Raport PG - TK - DAYCARE Anak Saleh
Aplikasi Dashboard Raport Digital berbasis **Google Apps Script (GAS)**, **Google Sheets**, dan **Google Drive**.

---

## 📋 Fitur Utama

1. **🛡️ Portal Admin (Kontrol Data Master & Publikasi)**:
   - Manajemen Master Data Siswa (Playgroup, TK-A, TK-B, Daycare).
   - Manajemen Akun Guru & Wali Kelas.
   - Manajemen Rombongan Belajar (Kelas).
   - Kontrol Periode Tahun Ajaran & Semester.
   - Buka/Tutup Hak Akses Raport untuk Orang Tua.
   - Audit Jejak Aktivitas Sistem (Log Aktivitas).
   - Tombol **1-Click Auto Setup Database**.

2. **👩‍🏫 Portal Wali Kelas (Upload & Manajemen Raport)**:
   - Filter otomatis data siswa sesuai kelas yang diampu.
   - Upload berkas PDF raport langsung ke Google Drive.
   - Input Catatan Perkembangan Anak (Narasi Guru).
   - Status tracking: Raport Terunggah, Belum Diunggah, & Sudah Dilihat Orang Tua.
   - Preview PDF interaktif langsung di dalam aplikasi.

3. **👨‍👩‍👧 Portal Orang Tua (Akses & Konfirmasi Raport)**:
   - Login mudah ramah HP menggunakan **NIS / NISN** dan **PIN Orang Tua**.
   - Kartu Profil Identitas Ananda yang ceria dan ramah anak.
   - Pratinjau langsung berkas raport digital (PDF Reader in-app).
   - Tombol unduh resmi berkas PDF.
   - Konfirmasi penerimaan dan baca raport dari orang tua.

---

## 🚀 Panduan Instalasi & Deploy ke Google Apps Script

### Langkah 1: Buat Proyek Google Apps Script Baru
1. Buka [script.google.com](https://script.google.com) atau buat langsung dari Google Drive (`Baru` > `Lainnya` > `Google Apps Script`).
2. Beri nama proyek, misalnya: `Raport Digital Anak Saleh`.

### Langkah 2: Salin File Proyek
Buat file-file berikut di Script Editor dengan nama yang sama persis:

#### File Script (.gs):
1. `Code.gs` ➡️ Salin seluruh isi dari `Code.js`
2. `Setup.gs` ➡️ Salin seluruh isi dari `Setup.js`
3. `Auth.gs` ➡️ Salin seluruh isi dari `Auth.js`
4. `AdminService.gs` ➡️ Salin seluruh isi dari `AdminService.js`
5. `TeacherService.gs` ➡️ Salin seluruh isi dari `TeacherService.js`
6. `ParentService.gs` ➡️ Salin seluruh isi dari `ParentService.js`

#### File HTML:
1. `Index.html` ➡️ Salin seluruh isi dari `Index.html`
2. `Styles.html` ➡️ Salin seluruh isi dari `Styles.html`
3. `Scripts.html` ➡️ Salin seluruh isi dari `Scripts.html`
4. `AdminView.html` ➡️ Salin seluruh isi dari `AdminView.html`
5. `TeacherView.html` ➡️ Salin seluruh isi dari `TeacherView.html`
6. `ParentView.html` ➡️ Salin seluruh isi dari `ParentView.html`

### Langkah 3: Inisialisasi Database (1-Click Setup)
1. Pada editor Google Apps Script, pilih fungsi `initialSetup` pada dropdown fungsi di toolbar atas.
2. Klik tombol **Jalankan** (Run).
3. Berikan izin otorisasi akses Google Drive dan Google Sheets saat diminta.
4. Sistem akan otomatis:
   - Membuat file Spreadsheet bernama `DB_RAPORT_ANAK_SALEH` lengkap dengan tabel dan contoh data awal.
   - Membuat Folder Google Drive bernama `RAPORT_ANAK_SALEH_STORAGE` untuk menampung file PDF raport.

### Langkah 4: Publikasikan sebagai Web App
1. Klik tombol **Terapkan (Deploy)** di pojok kanan atas > pilih **Penerapan Baru (New Deployment)**.
2. Pilih jenis: **Aplikasi Web (Web App)**.
3. Konfigurasi:
   - **Deskripsi**: `Versi 1.0`
   - **Jalankan sebagai (Execute as)**: `Saya (email Anda)`
   - **Siapa yang memiliki akses (Who has access)**: `Siapa saja (Anyone)`
4. Klik **Terapkan (Deploy)**.
5. Salin tautan **URL Aplikasi Web** yang dihasilkan. Tautan ini siap dibagikan ke Admin, Guru, dan Orang Tua!

---

## 🔑 Akun & Kredensial Contoh Awal (Demo)

| Peran | Username / NIS | Password / PIN | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Administrator Utama Sekolah |
| **Wali Kelas PG** | `guru.pg` | `guru123` | Wali Kelas PG-A |
| **Wali Kelas TK-A** | `guru.tka` | `guru123` | Wali Kelas TK-A1 |
| **Wali Kelas TK-B** | `guru.tkb` | `guru123` | Wali Kelas TK-B1 |
| **Wali Kelas Daycare** | `guru.daycare` | `guru123` | Pengasuh / Guru Daycare |
| **Orang Tua** | `202601` | `1234` | Orang Tua dari Muhammad Al-Fatih (PG) |
| **Orang Tua** | `202603` | `1234` | Orang Tua dari Ahmad Zaidan (TK-A) |
| **Orang Tua** | `202605` | `1234` | Orang Tua dari Ibrahim Rayyan (TK-B) |
| **Orang Tua** | `202607` | `1234` | Orang Tua dari Bilal Arkananta (Daycare) |

---

## 🗄️ Struktur Sheet Database (`DB_RAPORT_ANAK_SALEH`)

1. `DB_Users`: Daftar akun admin dan guru / wali kelas beserta kelas yang diampu.
2. `DB_Siswa`: Master data siswa (NIS, NISN, Nama, Jenjang, Kelas, Orang Tua, No WA, PIN).
3. `DB_Kelas`: Data rombel kelas (PG, TK-A, TK-B, Daycare).
4. `DB_TahunAjaran`: Periode aktif dan status penguncian/pembukaan akses orang tua.
5. `DB_Raport`: Riwayat arsip raport, ID file Drive, URL pratinjau, catatan guru, dan status konfirmasi ortu.
6. `DB_LogAktivitas`: Rekaman audit aktivitas sistem.
