"""
Database Manager for Raport Digital PG - TK - DAYCARE Anak Saleh
Supports Google Sheets API (gspread) with auto-fallback to local JSON storage for seamless operation.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger("raport_db")

# Default Data Seeding
DEFAULT_USERS = [
    {"userId": "USR-ADM-01", "username": "admin", "password": "admin123", "namaLengkap": "Administrator Portal", "role": "ADMIN", "kelompokDiampu": "SEMUA", "kontakWa": "081234567890", "status": "AKTIF"},
    {"userId": "USR-KPS-01", "username": "kepsek", "password": "kepsek123", "namaLengkap": "Hj. Siti Aminah, M.Pd.", "role": "KEPSEK", "kelompokDiampu": "SEMUA", "kontakWa": "081234567891", "status": "AKTIF"},
    {"userId": "USR-GUR-01", "username": "bunda.nurul", "password": "guru123", "namaLengkap": "Bunda Nurul Hidayah, S.Pd.", "role": "WALI_KELAS", "kelompokDiampu": "TK-A1", "kontakWa": "081234567892", "status": "AKTIF"},
    {"userId": "USR-GUR-02", "username": "bunda.fatimah", "password": "guru123", "namaLengkap": "Bunda Fatimah Az-Zahra, S.Pd.", "role": "WALI_KELAS", "kelompokDiampu": "TK-B1", "kontakWa": "081234567893", "status": "AKTIF"},
    {"userId": "USR-GUR-03", "username": "bunda.aisyah", "password": "guru123", "namaLengkap": "Bunda Aisyah Humaira, S.Pd.", "role": "WALI_KELAS", "kelompokDiampu": "KB-A", "kontakWa": "081234567894", "status": "AKTIF"},
    {"userId": "USR-GUR-04", "username": "bunda.maryam", "password": "guru123", "namaLengkap": "Bunda Maryam Shalihah, S.Pd.", "role": "WALI_KELAS", "kelompokDiampu": "DC-1", "kontakWa": "081234567895", "status": "AKTIF"}
]

DEFAULT_MURID = [
    {"nis": "202601001", "namaLengkap": "Muhammad Al-Fatih Pratama", "namaPanggilan": "Fatih", "jenisKelamin": "L", "jenjang": "TK-A", "idKelompok": "TK-A1", "tempatLahir": "Jakarta", "tanggalLahir": "2021-03-15", "namaAyah": "Hendra Pratama", "namaIbu": "Rina Kartika", "kontakOrtu": "081122334455", "status": "AKTIF", "alamat": "Jl. Melati No. 12, Kebayoran", "pin": "150321"},
    {"nis": "202601002", "namaLengkap": "Aisyah Zahira Putri", "namaPanggilan": "Zahira", "jenisKelamin": "P", "jenjang": "TK-A", "idKelompok": "TK-A1", "tempatLahir": "Jakarta", "tanggalLahir": "2021-05-20", "namaAyah": "Rudi Hartono", "namaIbu": "Siti Nurhaliza", "kontakOrtu": "081122334456", "status": "AKTIF", "alamat": "Jl. Mawar Indah Blok B4", "pin": "200521"},
    {"nis": "202601003", "namaLengkap": "Kenzo Ahmad Rayyan", "namaPanggilan": "Kenzo", "jenisKelamin": "L", "jenjang": "TK-B", "idKelompok": "TK-B1", "tempatLahir": "Depok", "tanggalLahir": "2020-08-10", "namaAyah": "Dedi Setiadi", "namaIbu": "Ratna Sari", "kontakOrtu": "081122334457", "status": "AKTIF", "alamat": "Jl. Anggrek Raya No. 45", "pin": "100820"},
    {"nis": "202601004", "namaLengkap": "Maryam Khadijah Azzahra", "namaPanggilan": "Maryam", "jenisKelamin": "P", "jenjang": "TK-B", "idKelompok": "TK-B1", "tempatLahir": "Tangerang", "tanggalLahir": "2020-11-25", "namaAyah": "Yusuf Mansur", "namaIbu": "Fatimah Zahra", "kontakOrtu": "081122334458", "status": "AKTIF", "alamat": "Perumahan Cempaka Hijau No. 7", "pin": "251120"},
    {"nis": "202601005", "namaLengkap": "Arkan Bilal Ramadhan", "namaPanggilan": "Bilal", "jenisKelamin": "L", "jenjang": "Playgroup (PG)", "idKelompok": "KB-A", "tempatLahir": "Jakarta", "tanggalLahir": "2022-04-12", "namaAyah": "Fajar Ramadhan", "namaIbu": "Dewi Lestari", "kontakOrtu": "081122334459", "status": "AKTIF", "alamat": "Jl. Kenanga Timur No. 3", "pin": "120422"},
    {"nis": "202601006", "namaLengkap": "Hafizhah Humaira Syakirah", "namaPanggilan": "Maira", "jenisKelamin": "P", "jenjang": "Daycare", "idKelompok": "DC-1", "tempatLahir": "Jakarta", "tanggalLahir": "2023-01-08", "namaAyah": "Agus Santoso", "namaIbu": "Laila Majnun", "kontakOrtu": "081122334460", "status": "AKTIF", "alamat": "Jl. Flamboyan No. 18", "pin": "080123"}
]

DEFAULT_KELOMPOK = [
    {"idKelompok": "TK-A1", "namaKelompok": "Kelas Ar-Rahman (TK-A)", "jenjang": "TK-A", "idWaliKelas": "USR-GUR-01", "namaWaliKelas": "Bunda Nurul Hidayah, S.Pd.", "kapasitas": 20, "tahunAjaran": "2025/2026", "status": "AKTIF", "jumlahMurid": 2},
    {"idKelompok": "TK-B1", "namaKelompok": "Kelas Al-Ikhlas (TK-B)", "jenjang": "TK-B", "idWaliKelas": "USR-GUR-02", "namaWaliKelas": "Bunda Fatimah Az-Zahra, S.Pd.", "kapasitas": 20, "tahunAjaran": "2025/2026", "status": "AKTIF", "jumlahMurid": 2},
    {"idKelompok": "KB-A", "namaKelompok": "Kelas Al-Kautsar (Playgroup)", "jenjang": "Playgroup (PG)", "idWaliKelas": "USR-GUR-03", "namaWaliKelas": "Bunda Aisyah Humaira, S.Pd.", "kapasitas": 15, "tahunAjaran": "2025/2026", "status": "AKTIF", "jumlahMurid": 1},
    {"idKelompok": "DC-1", "namaKelompok": "Bintang Cilik (Daycare)", "jenjang": "Daycare", "idWaliKelas": "USR-GUR-04", "namaWaliKelas": "Bunda Maryam Shalihah, S.Pd.", "kapasitas": 10, "tahunAjaran": "2025/2026", "status": "AKTIF", "jumlahMurid": 1}
]

DEFAULT_TAHUN_AJARAN = [
    {"idTahun": "TA-2025-GANJIL", "namaTahun": "2025/2026", "semester": "Ganjil (Semester 1)", "statusAktif": "AKTIF", "statusAksesOrtu": "DIBUKA"},
    {"idTahun": "TA-2025-GENAP", "namaTahun": "2025/2026", "semester": "Genap (Semester 2)", "statusAktif": "NONAKTIF", "statusAksesOrtu": "DITUTUP"},
    {"idTahun": "TA-2026-GANJIL", "namaTahun": "2026/2027", "semester": "Ganjil (Semester 1)", "statusAktif": "NONAKTIF", "statusAksesOrtu": "DITUTUP"}
]

DEFAULT_RAPORT = [
    {
        "idRaport": "RAP-202601001-01",
        "nis": "202601001",
        "idKelompok": "TK-A1",
        "tahunAjaran": "2025/2026",
        "semester": "Ganjil (Semester 1)",
        "urlPdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "fileId": "demo_pdf_01",
        "catatanPerkembangan": "Ananda Fatih menunjukkan perkembangan motorik dan sosial yang sangat baik, mandiri saat berwudhu dan antusias dalam hafalan surat pendek.",
        "statusApproval": "DISETUJUI",
        "catatanRevisi": "",
        "uploaderUser": "Bunda Nurul Hidayah, S.Pd.",
        "reviewedBy": "Hj. Siti Aminah, M.Pd.",
        "tanggalReview": "15/09/2026 09:30",
        "tanggalDilihat": "16/09/2026 14:20",
        "namaWaliKonfirmasi": "Hendra Pratama (Ayah)",
        "sudahDilihat": True
    },
    {
        "idRaport": "RAP-202601002-01",
        "nis": "202601002",
        "idKelompok": "TK-A1",
        "tahunAjaran": "2025/2026",
        "semester": "Ganjil (Semester 1)",
        "urlPdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "fileId": "demo_pdf_02",
        "catatanPerkembangan": "Ananda Zahira sangat kreatif dalam mewarnai dan memiliki daya ingat kuat dalam mengenal huruf hijaiyah.",
        "statusApproval": "DIAJUKAN",
        "catatanRevisi": "",
        "uploaderUser": "Bunda Nurul Hidayah, S.Pd.",
        "reviewedBy": "",
        "tanggalReview": "",
        "tanggalDilihat": "",
        "namaWaliKonfirmasi": "",
        "sudahDilihat": False
    }
]

class DatabaseManager:
    def __init__(self):
        # Determine writable directory (use /tmp if running in serverless environment)
        default_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        try:
            os.makedirs(default_dir, exist_ok=True)
            self.data_dir = default_dir
        except Exception:
            self.data_dir = "/tmp"
            try:
                os.makedirs(self.data_dir, exist_ok=True)
            except Exception:
                pass

        self.local_file = os.path.join(self.data_dir, "local_db.json")
        
        self.sheets_client = None
        self.spreadsheet = None
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID", "1Nfjr65ckfBN3wNLIEiU-zEEbW4qjBoh1vN05s9EFva4")
        
        self._init_data()
        self._init_google_sheets()

    def _init_data(self):
        """Initialize in-memory data with file persistence"""
        if os.path.exists(self.local_file):
            try:
                with open(self.local_file, "r", encoding="utf-8") as f:
                    self.db = json.load(f)
                return
            except Exception as e:
                logger.warning(f"Failed to read local_db.json: {e}")
        
        self.db = {
            "users": list(DEFAULT_USERS),
            "murid": list(DEFAULT_MURID),
            "kelompok": list(DEFAULT_KELOMPOK),
            "tahun_ajaran": list(DEFAULT_TAHUN_AJARAN),
            "raport": list(DEFAULT_RAPORT),
            "logs": [
                {
                    "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                    "user": "SYSTEM",
                    "role": "SETUP",
                    "aktivitas": "Inisialisasi Database",
                    "detail": "Database Raport Digital Anak Saleh siap digunakan."
                }
            ]
        }
        self._save_local()

    def _save_local(self):
        try:
            with open(self.local_file, "w", encoding="utf-8") as f:
                json.dump(self.db, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving local db: {e}")

    def _init_google_sheets(self):
        """Attempt connection to Google Sheets via gspread if credentials exist"""
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
        if os.path.exists(creds_path):
            try:
                import gspread
                self.sheets_client = gspread.service_account(filename=creds_path)
                if self.spreadsheet_id:
                    self.spreadsheet = self.sheets_client.open_by_key(self.spreadsheet_id)
                    logger.info(f"Connected to Google Sheets: {self.spreadsheet.title}")
            except Exception as e:
                logger.warning(f"Google Sheets connection skipped/failed: {e}")

    def log_activity(self, user: str, role: str, aktivitas: str, detail: str):
        log_entry = {
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "user": user,
            "role": role,
            "aktivitas": aktivitas,
            "detail": detail
        }
        self.db.setdefault("logs", []).insert(0, log_entry)
        if len(self.db["logs"]) > 100:
            self.db["logs"] = self.db["logs"][:100]
        self._save_local()

    # ================= AUTHENTICATION =================
    def authenticate_user(self, role: str, identifier: str, secret: str) -> Optional[Dict[str, Any]]:
        role_upper = role.upper()
        identifier_clean = identifier.strip().lower()
        secret_clean = secret.strip()

        if role_upper in ["ORTU", "ORANG_TUA", "WALI_MURID"]:
            for m in self.db["murid"]:
                if m.get("nis", "").strip().lower() == identifier_clean and m.get("pin", "").strip() == secret_clean:
                    if m.get("status", "AKTIF").upper() != "AKTIF":
                        return None
                    return {
                        "role": "ORTU",
                        "nis": m["nis"],
                        "namaMurid": m["namaLengkap"],
                        "namaPanggilan": m.get("namaPanggilan", ""),
                        "jenjang": m.get("jenjang", ""),
                        "idKelompok": m.get("idKelompok", ""),
                        "namaAyah": m.get("namaAyah", ""),
                        "namaIbu": m.get("namaIbu", ""),
                        "kontakOrtu": m.get("kontakOrtu", ""),
                        "alamat": m.get("alamat", "")
                    }
            return None

        # Staff Roles: ADMIN, KEPSEK, WALI_KELAS
        for u in self.db["users"]:
            if u.get("username", "").strip().lower() == identifier_clean and u.get("password", "").strip() == secret_clean:
                if u.get("status", "AKTIF").upper() != "AKTIF":
                    return None
                user_role = u.get("role", "").upper()
                if role_upper == "WALI_KELAS" and user_role in ["WALI_KELAS", "GURU"]:
                    return u
                if role_upper == user_role:
                    return u
        return None

    # ================= ADMIN SUMMARY & MASTER DATA =================
    def get_admin_all_data(self) -> Dict[str, Any]:
        students = self.db.get("murid", [])
        teachers = self.db.get("users", [])
        classes = self.db.get("kelompok", [])
        years = self.db.get("tahun_ajaran", [])
        reports = self.db.get("raport", [])

        # Count per jenjang & active students
        total_murid = 0
        per_jenjang = {"Playgroup (PG)": 0, "TK-A": 0, "TK-B": 0, "Daycare": 0}
        murid_count_map = {}

        for s in students:
            if s.get("status", "AKTIF").upper() == "AKTIF":
                total_murid += 1
                jg = s.get("jenjang", "")
                if jg in per_jenjang:
                    per_jenjang[jg] += 1
                k_id = s.get("idKelompok", "")
                if k_id:
                    murid_count_map[k_id] = murid_count_map.get(k_id, 0) + 1

        # Count teachers
        total_guru = sum(1 for t in teachers if t.get("role") in ["WALI_KELAS", "GURU"] and t.get("status") == "AKTIF")
        total_kepsek = sum(1 for t in teachers if t.get("role") == "KEPSEK" and t.get("status") == "AKTIF")

        # Class student count sync
        for c in classes:
            c["jumlahMurid"] = murid_count_map.get(c.get("idKelompok", ""), 0)

        # Active TA
        active_ta = next((y for y in years if y.get("statusAktif") == "AKTIF"), {
            "idTahun": "TA-AKTIF", "namaTahun": "2025/2026", "semester": "Ganjil", "statusAktif": "AKTIF", "statusAksesOrtu": "DIBUKA"
        })

        # Report stats
        raport_stats = {
            "total": len(reports),
            "draf": sum(1 for r in reports if r.get("statusApproval") == "DRAF"),
            "diajukan": sum(1 for r in reports if r.get("statusApproval") == "DIAJUKAN"),
            "revisi": sum(1 for r in reports if r.get("statusApproval") == "REVISI"),
            "disetujui": sum(1 for r in reports if r.get("statusApproval") == "DISETUJUI")
        }

        return {
            "summary": {
                "totalMurid": total_murid,
                "perJenjang": per_jenjang,
                "totalGuru": total_guru,
                "totalKepsek": total_kepsek,
                "totalKelompok": len(classes),
                "raportStats": raport_stats,
                "activeTA": active_ta
            },
            "students": students,
            "teachers": teachers,
            "classes": classes,
            "years": years
        }

    # ================= MURID CRUD =================
    def save_student(self, student_data: Dict[str, Any], operator_name: str) -> bool:
        nis = str(student_data.get("nis", "")).strip()
        if not nis:
            return False

        existing = next((s for s in self.db["murid"] if s.get("nis") == nis), None)
        if existing:
            existing.update(student_data)
            self.log_activity(operator_name, "ADMIN", "Update Murid", f"Memperbarui data murid: {student_data.get('namaLengkap')} ({nis})")
        else:
            self.db["murid"].append(student_data)
            self.log_activity(operator_name, "ADMIN", "Tambah Murid", f"Menambahkan murid baru: {student_data.get('namaLengkap')} ({nis})")

        self._save_local()
        return True

    def delete_student(self, nis: str, operator_name: str) -> bool:
        nis = str(nis).strip()
        idx = next((i for i, s in enumerate(self.db["murid"]) if s.get("nis") == nis), None)
        if idx is not None:
            deleted = self.db["murid"].pop(idx)
            self.log_activity(operator_name, "ADMIN", "Hapus Murid", f"Menghapus murid: {deleted.get('namaLengkap')} ({nis})")
            self._save_local()
            return True
        return False

    def bulk_save_students(self, students: List[Dict[str, Any]], operator_name: str) -> int:
        count = 0
        for s in students:
            nis = str(s.get("nis", "")).strip()
            if not nis:
                continue
            existing = next((x for x in self.db["murid"] if x.get("nis") == nis), None)
            if existing:
                existing.update(s)
            else:
                self.db["murid"].append(s)
            count += 1
        
        self.log_activity(operator_name, "ADMIN", "Import Massal Murid", f"Berhasil mengimpor {count} data murid.")
        self._save_local()
        return count

    # ================= USERS CRUD =================
    def save_teacher(self, user_data: Dict[str, Any], operator_name: str) -> bool:
        user_id = str(user_data.get("userId", "")).strip()
        username = str(user_data.get("username", "")).strip()
        if not username:
            return False

        if user_id:
            existing = next((u for u in self.db["users"] if u.get("userId") == user_id), None)
            if existing:
                # Retain password if empty
                if not user_data.get("password"):
                    user_data["password"] = existing.get("password", "guru123")
                existing.update(user_data)
                self.log_activity(operator_name, "ADMIN", "Update Akun", f"Memperbarui akun: {user_data.get('namaLengkap')} ({username})")
                self._save_local()
                return True

        # New user
        new_id = f"USR-{len(self.db['users']) + 1:03d}"
        user_data["userId"] = new_id
        if not user_data.get("password"):
            user_data["password"] = "guru123"
        self.db["users"].append(user_data)
        self.log_activity(operator_name, "ADMIN", "Tambah Akun", f"Menambahkan akun baru: {user_data.get('namaLengkap')} ({username})")
        self._save_local()
        return True

    def reset_teacher_password(self, user_id: str, new_password: str, operator_name: str) -> bool:
        user_id = str(user_id).strip()
        u = next((x for x in self.db["users"] if x.get("userId") == user_id), None)
        if u:
            u["password"] = str(new_password).strip()
            self.log_activity(operator_name, "ADMIN", "Reset Password Guru", f"Mereset password untuk akun: {u.get('namaLengkap')} ({u.get('username')})")
            self._save_local()
            return True
        return False

    def delete_teacher(self, user_id: str, operator_name: str) -> bool:
        user_id = str(user_id).strip()
        idx = next((i for i, u in enumerate(self.db["users"]) if u.get("userId") == user_id), None)
        if idx is not None:
            deleted = self.db["users"].pop(idx)
            self.log_activity(operator_name, "ADMIN", "Hapus Akun Guru", f"Menghapus akun: {deleted.get('namaLengkap')} ({deleted.get('username')})")
            self._save_local()
            return True
        return False

    # ================= KELOMPOK CRUD =================
    def save_class(self, class_data: Dict[str, Any], operator_name: str) -> bool:
        k_id = str(class_data.get("idKelompok", "")).strip()
        if not k_id:
            return False

        existing = next((c for c in self.db["kelompok"] if c.get("idKelompok") == k_id), None)
        if existing:
            existing.update(class_data)
            self.log_activity(operator_name, "ADMIN", "Update Kelompok", f"Memperbarui kelompok: {class_data.get('namaKelompok')} ({k_id})")
        else:
            self.db["kelompok"].append(class_data)
            self.log_activity(operator_name, "ADMIN", "Tambah Kelompok", f"Menambahkan kelompok baru: {class_data.get('namaKelompok')} ({k_id})")

        self._save_local()
        return True

    def delete_class(self, id_kelompok: str, operator_name: str) -> bool:
        idx = next((i for i, c in enumerate(self.db["kelompok"]) if c.get("idKelompok") == id_kelompok), None)
        if idx is not None:
            deleted = self.db["kelompok"].pop(idx)
            self.log_activity(operator_name, "ADMIN", "Hapus Kelompok", f"Menghapus kelompok: {deleted.get('namaKelompok')} ({id_kelompok})")
            self._save_local()
            return True
        return False

    # ================= TAHUN AJARAN =================
    def set_academic_year_settings(self, id_tahun: str, status_aktif: str, status_akses: str, operator_name: str) -> bool:
        for y in self.db["tahun_ajaran"]:
            if y.get("idTahun") == id_tahun:
                y["statusAktif"] = status_aktif
                y["statusAksesOrtu"] = status_akses
            elif status_aktif == "AKTIF":
                y["statusAktif"] = "NONAKTIF"

        self.log_activity(operator_name, "ADMIN", "Ubah Tahun Pelajaran", f"Mengubah status {id_tahun} -> Aktif: {status_aktif}, Akses Ortu: {status_akses}")
        self._save_local()
        return True

    # ================= KEPALA SEKOLAH WORKFLOW =================
    def get_kepsek_reports_summary(self) -> Dict[str, Any]:
        all_data = self.get_admin_all_data()
        reports = self.db.get("raport", [])
        return {
            "stats": {
                "totalMurid": all_data["summary"]["totalMurid"],
                "diajukan": sum(1 for r in reports if r.get("statusApproval") == "DIAJUKAN"),
                "revisi": sum(1 for r in reports if r.get("statusApproval") == "REVISI"),
                "disetujui": sum(1 for r in reports if r.get("statusApproval") == "DISETUJUI"),
                "draf": sum(1 for r in reports if r.get("statusApproval") == "DRAF")
            },
            "kelompokList": all_data["classes"],
            "activeTA": all_data["summary"]["activeTA"]
        }

    def get_kepsek_reports_list(self, filter_kelompok: str = "SEMUA", filter_status: str = "SEMUA") -> List[Dict[str, Any]]:
        reports = self.db.get("raport", [])
        murid_map = {m["nis"]: m for m in self.db.get("murid", [])}
        kelompok_map = {k["idKelompok"]: k for k in self.db.get("kelompok", [])}

        results = []
        for r in reports:
            # Filter kelompok
            if filter_kelompok != "SEMUA" and r.get("idKelompok") != filter_kelompok:
                continue
            # Filter status
            if filter_status != "SEMUA" and r.get("statusApproval") != filter_status:
                continue

            m = murid_map.get(r.get("nis"), {})
            k = kelompok_map.get(r.get("idKelompok"), {})

            item = dict(r)
            item["namaMurid"] = m.get("namaLengkap", r.get("nis"))
            item["namaPanggilan"] = m.get("namaPanggilan", "-")
            item["jenisKelamin"] = m.get("jenisKelamin", "L")
            item["namaKelompok"] = k.get("namaKelompok", r.get("idKelompok"))
            item["waliKelas"] = k.get("namaWaliKelas", r.get("uploaderUser", "-"))
            results.append(item)

        return results

    def approve_report_kepsek(self, id_raport: str, kepsek_name: str) -> bool:
        r = next((x for x in self.db["raport"] if x.get("idRaport") == id_raport), None)
        if not r:
            return False

        r["statusApproval"] = "DISETUJUI"
        r["reviewedBy"] = kepsek_name
        r["tanggalReview"] = datetime.now().strftime("%d/%m/%Y %H:%M")
        r["catatanRevisi"] = ""
        
        self.log_activity(kepsek_name, "KEPSEK", "ACC Raport", f"Menyetujui & menerbitkan raport murid NIS: {r.get('nis')}")
        self._save_local()
        return True

    def reject_report_kepsek(self, id_raport: str, notes: str, kepsek_name: str) -> bool:
        r = next((x for x in self.db["raport"] if x.get("idRaport") == id_raport), None)
        if not r:
            return False

        r["statusApproval"] = "REVISI"
        r["reviewedBy"] = kepsek_name
        r["tanggalReview"] = datetime.now().strftime("%d/%m/%Y %H:%M")
        r["catatanRevisi"] = notes
        
        self.log_activity(kepsek_name, "KEPSEK", "Revisi Raport", f"Mengembalikan raport murid NIS: {r.get('nis')} dengan catatan: {notes}")
        self._save_local()
        return True

    # ================= TEACHER WORKFLOW =================
    def get_teacher_class_students(self, kelompok_diampu: str) -> Dict[str, Any]:
        classes = self.db.get("kelompok", [])
        k_info = next((k for k in classes if k.get("idKelompok") == kelompok_diampu), {
            "idKelompok": kelompok_diampu or "-",
            "namaKelompok": kelompok_diampu or "Kelompok Belajar",
            "jenjang": "-",
            "namaWaliKelas": "-"
        })

        students = [m for m in self.db.get("murid", []) if m.get("idKelompok") == kelompok_diampu or kelompok_diampu == "SEMUA"]
        reports = self.db.get("raport", [])
        report_map = {r["nis"]: r for r in reports}

        murid_list = []
        stats = {"totalMurid": len(students), "totalDiajukan": 0, "totalRevisi": 0, "totalDisetujui": 0, "totalBelumUpload": 0}

        for s in students:
            nis = s["nis"]
            rap = report_map.get(nis)
            status_rap = rap.get("statusApproval", "BELUM_UPLOAD") if rap else "BELUM_UPLOAD"

            if status_rap == "DIAJUKAN": stats["totalDiajukan"] += 1
            elif status_rap == "REVISI": stats["totalRevisi"] += 1
            elif status_rap == "DISETUJUI": stats["totalDisetujui"] += 1
            elif status_rap == "BELUM_UPLOAD": stats["totalBelumUpload"] += 1

            murid_list.append({
                "nis": nis,
                "namaLengkap": s["namaLengkap"],
                "panggilan": s.get("namaPanggilan", "-"),
                "jenisKelamin": s.get("jenisKelamin", "L"),
                "jenjang": s.get("jenjang", ""),
                "idKelompok": s.get("idKelompok", ""),
                "namaOrtu": f"{s.get('namaAyah', '')} & {s.get('namaIbu', '')}".strip("& "),
                "kontakOrtu": s.get("kontakOrtu", "-"),
                "statusRaport": status_rap,
                "raportData": rap
            })

        active_ta = next((y for y in self.db.get("tahun_ajaran", []) if y.get("statusAktif") == "AKTIF"), {
            "tahun": "2025/2026", "semester": "Ganjil"
        })

        return {
            "infoKelompok": k_info,
            "activeTA": active_ta,
            "stats": stats,
            "muridList": murid_list
        }

    def save_or_upload_report(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        nis = payload.get("nis", "")
        if not nis:
            return {"success": False, "message": "NIS murid diperlukan."}

        existing = next((r for r in self.db["raport"] if r.get("nis") == nis), None)
        id_raport = existing.get("idRaport") if existing else f"RAP-{nis}-{datetime.now().strftime('%m%d%H%M')}"

        new_record = {
            "idRaport": id_raport,
            "nis": nis,
            "idKelompok": payload.get("idKelompok", ""),
            "tahunAjaran": payload.get("tahunAjaran", "2025/2026"),
            "semester": payload.get("semester", "Ganjil"),
            "urlPdf": payload.get("urlPdf", existing.get("urlPdf", "") if existing else ""),
            "fileId": payload.get("fileId", existing.get("fileId", "") if existing else ""),
            "catatanPerkembangan": payload.get("catatan", ""),
            "statusApproval": payload.get("statusApproval", "DIAJUKAN"),
            "catatanRevisi": "",
            "uploaderUser": payload.get("uploaderUser", "Wali Kelas"),
            "reviewedBy": "",
            "tanggalReview": "",
            "tanggalDilihat": "",
            "namaWaliKonfirmasi": "",
            "sudahDilihat": False
        }

        if existing:
            existing.update(new_record)
        else:
            self.db["raport"].append(new_record)

        self.log_activity(payload.get("uploaderUser", "Wali Kelas"), "GURU", "Unggah Raport", f"Mengunggah raport murid NIS: {nis} (Status: {new_record['statusApproval']})")
        self._save_local()
        return {"success": True, "message": "Raport berhasil disimpan & diajukan!", "data": new_record}

    def submit_report_to_kepsek(self, id_raport: str, teacher_name: str) -> bool:
        r = next((x for x in self.db["raport"] if x.get("idRaport") == id_raport), None)
        if not r:
            return False

        r["statusApproval"] = "DIAJUKAN"
        r["uploaderUser"] = teacher_name
        self.log_activity(teacher_name, "GURU", "Ajukan Raport", f"Mengajukan raport NIS: {r.get('nis')} ke Kepala Sekolah")
        self._save_local()
        return True

    # ================= PARENT WORKFLOW =================
    def get_parent_student_reports(self, nis: str) -> Dict[str, Any]:
        murid = next((m for m in self.db.get("murid", []) if m.get("nis") == nis), None)
        if not murid:
            return {"murid": None, "raportList": [], "pendingCount": 0}

        k_info = next((k for k in self.db.get("kelompok", []) if k.get("idKelompok") == murid.get("idKelompok")), {})
        murid_data = dict(murid)
        murid_data["namaKelompok"] = k_info.get("namaKelompok", murid.get("idKelompok"))
        murid_data["namaWaliKelas"] = k_info.get("namaWaliKelas", "-")

        all_reports = [r for r in self.db.get("raport", []) if r.get("nis") == nis]
        approved_reports = [r for r in all_reports if r.get("statusApproval") == "DISETUJUI"]
        pending_count = sum(1 for r in all_reports if r.get("statusApproval") in ["DIAJUKAN", "REVISI", "DRAF"])

        # Format date presentation
        formatted_reports = []
        for r in approved_reports:
            item = dict(r)
            item["tanggalDisetujui"] = r.get("tanggalReview") or "Telah Disetujui"
            formatted_reports.append(item)

        return {
            "murid": murid_data,
            "raportList": formatted_reports,
            "pendingCount": pending_count
        }

    def confirm_report_viewed_by_parent(self, id_raport: str, parent_name: str) -> bool:
        r = next((x for x in self.db["raport"] if x.get("idRaport") == id_raport), None)
        if not r:
            return False

        r["sudahDilihat"] = True
        r["namaWaliKonfirmasi"] = parent_name
        r["tanggalDilihat"] = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.log_activity(parent_name, "ORTU", "Konfirmasi Terima Raport", f"Wali murid mengonfirmasi telah membaca raport NIS: {r.get('nis')}")
        self._save_local()
        return True

    # ================= RESET SIMULASI =================
    def reset_database(self) -> bool:
        self.db["users"] = list(DEFAULT_USERS)
        self.db["murid"] = list(DEFAULT_MURID)
        self.db["kelompok"] = list(DEFAULT_KELOMPOK)
        self.db["tahun_ajaran"] = list(DEFAULT_TAHUN_AJARAN)
        self.db["raport"] = list(DEFAULT_RAPORT)
        self.db["logs"] = [{
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "user": "ADMIN",
            "role": "SYSTEM",
            "aktivitas": "Reset Simulasi",
            "detail": "Data master & raport telah direset untuk simulasi baru."
        }]
        self._save_local()
        return True

# Singleton instance
db_manager = DatabaseManager()
