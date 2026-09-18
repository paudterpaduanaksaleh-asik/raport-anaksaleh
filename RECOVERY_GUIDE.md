# Panduan Pemulihan Sistem (Disaster Recovery Guide)
**PG - TK - DAYCARE ANAK SALEH - Sistem Raport Digital Cloud**

Dokumen ini berisi informasi konfigurasi master, arsitektur, dan langkah pemulihan (*recovery*) jika terjadi kendala atau perubahan sistem di masa mendatang.

---

## 1. Informasi Master Deployment & Cloud

| Komponen | Nilai / Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Domain Hosting Publik** | `https://raport-anaksaleh.web.app` | Firebase Hosting Live |
| **Google Apps Script Web App URL** | `https://script.google.com/macros/s/AKfycbyyKxXsxM4oWpAvD320rz7rovDTaK4s1UyRwWyCg5MVLYBJ__boqahAVTZKdwW4qs_ZHw/exec` | Backend Cloud (Sheets & Drive) |
| **Firebase Project ID** | `raport-anaksaleh` | Project Firebase |
| **Google Apps Script Script ID** | `1AFLKUR9HxZNSVSSo_R5K18YocRo8BgcMNI661pIcfShnf-Ce8OW5MAOz` | Script ID di `.clasp.json` |
| **Nama Spreadsheet Database** | `DB_RAPORT_ANAK_SALEH` | Berisi sheet: `DB_Users`, `DB_Murid`, `DB_Kelompok`, `DB_TahunAjaran`, `DB_Raport`, `DB_LogAktivitas` |
| **Nama Folder Google Drive** | `RAPORT_ANAK_SALEH_STORAGE` | Menyimpan file raport PDF & file logo sekolah |

---

## 2. Struktur Berkas Kritis

- **`index.html` & `static/index.html`**: File utama frontend yang berjalan di browser dan Firebase Hosting.
- **`Code.js`**: Dispatcher utama backend Google Apps Script (`doGet`, `doPost`, `executeAction`).
- **`AdminService.js`**: Layanan manajemen master murid, guru, rombel, tahun ajaran, dan pengaturan branding/logo sekolah ke Google Drive.
- **`TeacherService.js`**: Layanan wali kelas untuk pengunggahan raport PDF ke Google Drive dan pengajuan ke Kepala Sekolah.
- **`KepsekService.js`**: Layanan persetujuan (ACC), revisi, dan rekap statistik raport.
- **`ParentService.js`**: Layanan portal wali murid untuk melihat raport dan konfirmasi tanda terima.
- **`main.py` & `services/sheets_db.py`**: Backend alternatif Python FastAPI untuk server lokal / cloud mandiri.
- **`firebase.json` & `.firebaserc`**: Konfigurasi deployment Firebase Hosting (folder `static`).

---

## 3. Langkah-Langkah Pemulihan (Recovery Steps)

### Skenario A: Deploy Ulang Frontend ke Firebase Hosting
Jika ada perbaikan kode frontend pada `index.html`:
1. Pastikan perubahan disalin ke `static/index.html`:
   ```powershell
   Copy-Item index.html static/index.html -Force
   ```
2. Jalankan perintah deploy Firebase:
   ```bash
   firebase deploy --only hosting
   ```

---

### Skenario B: Memperbarui Kode di Google Apps Script (script.google.com)
Jika ada penambahan fungsi backend di Apps Script:
1. Buka [script.google.com](https://script.google.com).
2. Perbarui kode pada file `Code.gs` dan `AdminService.gs` (atau file service terkait).
3. **PENTING**: Buat versi deployment baru agar perubahan langsung aktif di URL yang sama:
   - Klik **Deploy** $\rightarrow$ **Manage deployments**.
   - Klik ikon **✏️ Pensil (Edit)**.
   - Pada dropdown **Version**, pilih **New version**.
   - Klik **Deploy**.

---

### Skenario C: Menjalankan Server Lokal (Python FastAPI)
Jika ingin menjalankan backend lokal:
```bash
pip install -r requirements.txt
python main.py
```
Aplikasi akan aktif di `http://localhost:8000`.

---

## 4. Akun Default untuk Login

- **Administrator**: `admin` / `admin123`
- **Kepala Sekolah**: `kepsek` / `kepsek123`
- **Guru / Wali Kelas**:
  - `bunda.nurul` / `guru123` (TK-A1)
  - `bunda.fatimah` / `guru123` (TK-B1)
  - `bunda.aisyah` / `guru123` (KB-A)
  - `bunda.maryam` / `guru123` (DC-1)
- **Wali Murid**: NIS murid (misal `202601` atau `202601001`) dengan PIN: `1234` atau 6 digit tanggal lahir (DDMMYY).
