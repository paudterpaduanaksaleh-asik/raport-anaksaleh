"""
FastAPI Server for Raport Digital PG - TK - DAYCARE Anak Saleh
"""

import os
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from services.sheets_db import db_manager
from services.drive_storage import storage_manager

app = FastAPI(
    title="Raport Digital Anak Saleh API",
    description="Backend Server & Bridge untuk Raport Digital PG - TK - DAYCARE Anak Saleh",
    version="2.0.0"
)

# CORS Middleware for Universal Client Connection (GitHub Pages, Localhost, Mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files directory
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
try:
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "uploads"), exist_ok=True)
except Exception:
    pass

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ================= DATA MODELS =================
class LoginRequest(BaseModel):
    role: str
    identifier: str
    secret: str

class StudentModel(BaseModel):
    nis: str
    namaLengkap: str
    namaPanggilan: Optional[str] = ""
    jenisKelamin: Optional[str] = "L"
    jenjang: Optional[str] = "TK-A"
    idKelompok: Optional[str] = "TK-A1"
    tempatLahir: Optional[str] = ""
    tanggalLahir: Optional[str] = ""
    namaAyah: Optional[str] = ""
    namaIbu: Optional[str] = ""
    kontakOrtu: Optional[str] = ""
    pin: Optional[str] = ""
    status: Optional[str] = "AKTIF"
    alamat: Optional[str] = ""

class TeacherModel(BaseModel):
    userId: Optional[str] = ""
    username: str
    password: Optional[str] = ""
    namaLengkap: str
    role: Optional[str] = "WALI_KELAS"
    kelompokDiampu: Optional[str] = ""
    kontakWa: Optional[str] = ""
    status: Optional[str] = "AKTIF"

class ClassModel(BaseModel):
    idKelompok: str
    namaKelompok: str
    jenjang: str
    idWaliKelas: Optional[str] = ""
    namaWaliKelas: Optional[str] = ""
    kapasitas: Optional[int] = 15
    tahunAjaran: Optional[str] = "2025/2026"
    status: Optional[str] = "AKTIF"

# ================= ROOT & HEALTH =================
@app.get("/")
async def serve_frontend():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Raport Digital Anak Saleh API is running. static/index.html not found."}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "Raport Digital Anak Saleh",
        "version": "2.0.0",
        "storage": "Google Sheets & Drive Ready"
    }

# ================= AUTH ENDPOINTS =================
@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = db_manager.authenticate_user(req.role, req.identifier, req.secret)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Identitas atau kata sandi / PIN tidak sesuai."}
        )
    return {
        "success": True,
        "message": f"Selamat datang, {user.get('namaLengkap') or user.get('namaMurid') or 'Pengguna'}!",
        "data": user
    }

# ================= ADMIN ENDPOINTS =================
@app.get("/api/admin/all-data")
async def get_admin_all_data():
    data = db_manager.get_admin_all_data()
    return {"success": True, "data": data, "message": "Data admin berhasil dimuat."}

@app.post("/api/admin/students")
async def save_student(student: StudentModel, operator: Optional[str] = "ADMIN"):
    success = db_manager.save_student(student.model_dump(), operator)
    if success:
        return {"success": True, "message": "Data murid berhasil disimpan."}
    raise HTTPException(status_code=400, detail="Gagal menyimpan murid.")

@app.delete("/api/admin/students/{nis}")
async def delete_student(nis: str, operator: Optional[str] = "ADMIN"):
    success = db_manager.delete_student(nis, operator)
    if success:
        return {"success": True, "message": f"Data murid NIS: {nis} berhasil dihapus."}
    raise HTTPException(status_code=404, detail="Murid tidak ditemukan.")

@app.post("/api/admin/students/bulk")
async def bulk_save_students(payload: Dict[str, Any]):
    students = payload.get("students", [])
    operator = payload.get("operator", "ADMIN")
    count = db_manager.bulk_save_students(students, operator)
    return {"success": True, "message": f"Berhasil mengimpor {count} data murid.", "count": count}

@app.post("/api/admin/teachers")
async def save_teacher(teacher: TeacherModel, operator: Optional[str] = "ADMIN"):
    success = db_manager.save_teacher(teacher.model_dump(), operator)
    if success:
        return {"success": True, "message": "Data akun berhasil disimpan."}
    raise HTTPException(status_code=400, detail="Gagal menyimpan akun.")

@app.post("/api/admin/classes")
async def save_class(cls: ClassModel, operator: Optional[str] = "ADMIN"):
    success = db_manager.save_class(cls.model_dump(), operator)
    if success:
        return {"success": True, "message": "Data kelompok berhasil disimpan."}
    raise HTTPException(status_code=400, detail="Gagal menyimpan kelompok.")

@app.delete("/api/admin/classes/{id_kelompok}")
async def delete_class(id_kelompok: str, operator: Optional[str] = "ADMIN"):
    success = db_manager.delete_class(id_kelompok, operator)
    if success:
        return {"success": True, "message": "Kelompok berhasil dihapus."}
    raise HTTPException(status_code=404, detail="Kelompok tidak ditemukan.")

@app.post("/api/admin/years/settings")
async def update_year_settings(payload: Dict[str, Any]):
    id_tahun = payload.get("idTahun", "")
    status_aktif = payload.get("statusAktif", "AKTIF")
    status_akses = payload.get("statusAksesOrtu", "DIBUKA")
    operator = payload.get("operator", "ADMIN")
    success = db_manager.set_academic_year_settings(id_tahun, status_aktif, status_akses, operator)
    return {"success": success, "message": "Pengaturan tahun pelajaran berhasil disimpan."}

@app.post("/api/admin/reset")
async def reset_simulation():
    success = db_manager.reset_database()
    return {"success": success, "message": "Database berhasil direset untuk simulasi baru!"}

# ================= KEPALA SEKOLAH ENDPOINTS =================
@app.get("/api/kepsek/summary")
async def get_kepsek_summary():
    data = db_manager.get_kepsek_reports_summary()
    return {"success": True, "data": data}

@app.get("/api/kepsek/reports")
async def get_kepsek_reports(kelompok: str = "SEMUA", status: str = "SEMUA"):
    reports = db_manager.get_kepsek_reports_list(kelompok, status)
    return {"success": True, "data": reports}

@app.post("/api/kepsek/approve")
async def approve_report(payload: Dict[str, Any]):
    id_raport = payload.get("idRaport", "")
    kepsek_name = payload.get("kepsekName", "Kepala Sekolah")
    success = db_manager.approve_report_kepsek(id_raport, kepsek_name)
    if success:
        return {"success": True, "message": "Raport berhasil di-ACC & diterbitkan ke Wali Murid!"}
    raise HTTPException(status_code=404, detail="Raport tidak ditemukan.")

@app.post("/api/kepsek/reject")
async def reject_report(payload: Dict[str, Any]):
    id_raport = payload.get("idRaport", "")
    notes = payload.get("notes", "")
    kepsek_name = payload.get("kepsekName", "Kepala Sekolah")
    success = db_manager.reject_report_kepsek(id_raport, notes, kepsek_name)
    if success:
        return {"success": True, "message": "Catatan revisi berhasil dikirimkan ke Wali Kelas!"}
    raise HTTPException(status_code=404, detail="Raport tidak ditemukan.")

# ================= WALI KELAS (TEACHER) ENDPOINTS =================
@app.get("/api/teacher/class-students")
async def get_teacher_students(kelompok: str = "SEMUA"):
    data = db_manager.get_teacher_class_students(kelompok)
    return {"success": True, "data": data}

@app.post("/api/teacher/upload-report")
async def upload_student_report(payload: Dict[str, Any]):
    file_base64 = payload.get("fileBase64", "")
    file_name = payload.get("fileName", "raport.pdf")
    nis = payload.get("nis", "")

    # Upload PDF if base64 provided
    if file_base64:
        upload_res = storage_manager.save_pdf(file_base64, file_name, nis)
        if not upload_res.get("success"):
            return upload_res
        payload["urlPdf"] = upload_res.get("urlPdf", "")
        payload["fileId"] = upload_res.get("fileId", "")

    res = db_manager.save_or_upload_report(payload)
    return res

@app.post("/api/teacher/submit-report")
async def submit_report(payload: Dict[str, Any]):
    id_raport = payload.get("idRaport", "")
    teacher_name = payload.get("teacherName", "Wali Kelas")
    success = db_manager.submit_report_to_kepsek(id_raport, teacher_name)
    if success:
        return {"success": True, "message": "Raport berhasil diajukan ke Kepala Sekolah!"}
    raise HTTPException(status_code=404, detail="Raport tidak ditemukan.")

# ================= WALI MURID (PARENT) ENDPOINTS =================
@app.get("/api/parent/student-reports")
async def get_parent_reports(nis: str):
    data = db_manager.get_parent_student_reports(nis)
    return {"success": True, "data": data}

@app.post("/api/parent/confirm-viewed")
async def confirm_viewed(payload: Dict[str, Any]):
    id_raport = payload.get("idRaport", "")
    parent_name = payload.get("parentName", "Wali Murid")
    success = db_manager.confirm_report_viewed_by_parent(id_raport, parent_name)
    if success:
        return {"success": True, "message": "Konfirmasi tanda terima berhasil dicatat."}
    raise HTTPException(status_code=404, detail="Raport tidak ditemukan.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
