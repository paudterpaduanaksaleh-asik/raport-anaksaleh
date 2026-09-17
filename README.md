# 🌟 Sistem Raport Digital PG - TK - DAYCARE Anak Saleh

Aplikasi Portal Raport Digital Modern berbasis **Python (FastAPI)**, **Tailwind CSS**, dan **Alpine.js** dengan integrasi database **Google Sheets** dan penyimpanan berkas PDF **Google Drive**.

---

## 🚀 Keunggulan Arsitektur Python + Alpine.js
1. **⚡ Performa Sangat Cepat (<50ms response time)**: Menghilangkan cold start lag dan timeout pada Google Apps Script.
2. **📱 UI Modern, Ramah Anak, & Responsif**: Dibangun dengan Tailwind CSS dan Alpine.js yang interaktif, glassmorphic, dan ringan.
3. **📊 Google Sheets & Google Drive Tetap Berfungsi**: Data nilai dan master siswa tetap tersimpan di Google Sheets (`DB_RAPORT_ANAK_SALEH`), serta PDF raport otomatis tersimpan di Google Drive (`RAPORT_ANAK_SALEH_STORAGE`).
4. **🛡️ Fallback Offline/Local JSON**: Server dapat langsung berjalan dengan mock data jika Google Service Account belum disetel.
5. **👥 4 Peran Pengguna Lengkap**:
   - **Admin**: Manajemen Data Siswa (CRUD), Akun Guru/Kepsek, Rombel/Kelas, Tahun Ajaran, Log Aktivitas.
   - **Kepala Sekolah (Kepsek)**: Review berkas raport, baca PDF in-app, ACC/Terbitkan raport, atau kembalikan dengan Catatan Revisi.
   - **Wali Kelas / Guru**: Upload PDF raport (Drag & Drop / File chooser), input narasi capaian anak, perbaikan revisi.
   - **Wali Murid / Orang Tua**: Login dengan NIS & PIN, pratinjau raport resmi, unduh PDF, dan konfirmasi penerimaan raport.

---

## 🛠️ Panduan Menjalankan Secara Lokal (Local Development)

### 1. Prasyarat
- Python 3.10+ terinstal di sistem Anda.

### 2. Instalasi Dependensi
```bash
pip install -r requirements.txt
```

### 3. Konfigurasi Lingkungan (Opsional - untuk Google Sheets & Drive)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel berikut:
```env
SPREADSHEET_ID=1Nfjr65ckfBN3wNLIEiU-zEEbW4qjBoh1vN05s9EFva4
DRIVE_FOLDER_ID=1nN9q9b7f5uL47Q07x6X80_example_id
GOOGLE_SERVICE_ACCOUNT_JSON=service_account.json
PORT=8000
```
> *Catatan: Jika `service_account.json` belum ada, sistem akan otomatis menggunakan penyimpanan lokal JSON di folder `static/data/` dan `static/uploads/` sehingga tetap dapat diuji secara penuh.*

### 4. Jalankan Web Server
```bash
python main.py
```
atau
```bash
uvicorn main:app --reload --port 8000
```
Buka browser Anda di `http://localhost:8000`.

---

## 🌐 Panduan Deploy ke Render.com (Gratis & Cepat)

1. **Push Proyek ke GitHub**:
   ```bash
   git add .
   git commit -m "feat: Python FastAPI + Tailwind CSS + Alpine.js"
   git push origin main
   ```

2. **Buka Render.com**:
   - Login ke [Render.com](https://render.com) dan buat **New Web Service**.
   - Hubungkan repositori GitHub Anda: `paudterpaduanaksaleh-asik/raport-anaksaleh`.
   - Pilih environment **Python 3**.
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Set Environment Variables di Render**:
   - `SPREADSHEET_ID`: ID Google Sheets Anda
   - `DRIVE_FOLDER_ID`: ID Folder Google Drive Anda
   - `GOOGLE_SERVICE_ACCOUNT_JSON_RAW`: *(Opsional)* Isi string JSON dari Service Account Key.

4. Klik **Deploy Web Service**. Website Anda akan langsung aktif dengan domain HTTPS gratis (contoh: `https://raport-anaksaleh.onrender.com`).

---

## 🔑 Akun & Kredensial Pengguna (Default Demo)

| Peran | Username / NIS | Password / PIN | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Administrator Utama Sekolah |
| **Kepala Sekolah** | `kepsek` | `kepsek123` | Peninjau & Otorisator Raport |
| **Wali Kelas PG** | `guru.pg` | `guru123` | Wali Kelas PG-A (Bintang Kecil) |
| **Wali Kelas TK-A** | `guru.tka` | `guru123` | Wali Kelas TK-A1 (Pelangi) |
| **Wali Kelas TK-B** | `guru.tkb` | `guru123` | Wali Kelas TK-B1 (Mentari) |
| **Wali Kelas Daycare** | `guru.daycare` | `guru123` | Pengasuh Daycare (Kasih Ibu) |
| **Wali Murid** | `202601` | `1234` | Orang Tua M. Al-Fatih (PG-A) |
| **Wali Murid** | `202603` | `1234` | Orang Tua Ahmad Zaidan (TK-A1) |
| **Wali Murid** | `202605` | `1234` | Orang Tua Ibrahim Rayyan (TK-B1) |
| **Wali Murid** | `202607` | `1234` | Orang Tua Bilal Arkananta (Daycare) |

---

## 📁 Struktur Proyek

```
raport-anaksaleh/
├── main.py                  # Server FastAPI & REST API Endpoints
├── requirements.txt         # Dependensi Python (FastAPI, Uvicorn, GSpread, Google Client)
├── render.yaml              # Konfigurasi Infrastructure-as-Code Render.com
├── Procfile                 # File start process untuk hosting PaaS
├── .env.example             # Contoh file konfigurasi environment
├── services/
│   ├── sheets_db.py         # Service konektor Google Sheets & Fallback Local JSON
│   └── drive_storage.py     # Service penyimpanan Google Drive v3 & Local Upload
└── static/
    ├── index.html           # SPA Tailwind CSS + Alpine.js
    ├── uploads/             # Direktori penyimpanan berkas PDF lokal (fallback)
    └── data/                # Data lokal JSON (fallback)
```

---

## 📄 Lisensi & Hak Cipta
Dikembangkan untuk **PAUD Terpadu Anak Saleh (PG - TK - DAYCARE)**.
