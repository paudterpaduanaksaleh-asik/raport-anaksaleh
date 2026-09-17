"""
Storage Manager for Raport Digital PG - TK - DAYCARE Anak Saleh
Supports Google Drive API (Drive v3) with auto-fallback to local storage for PDF files.
"""

import os
import io
import base64
import uuid
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("drive_storage")

class StorageManager:
    def __init__(self):
        default_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
        try:
            os.makedirs(default_dir, exist_ok=True)
            self.upload_dir = default_dir
        except Exception:
            self.upload_dir = "/tmp/uploads"
            try:
                os.makedirs(self.upload_dir, exist_ok=True)
            except Exception:
                pass

        self.drive_service = None
        self.folder_id = os.getenv("DRIVE_FOLDER_ID", "")
        self._init_drive()

    def _init_drive(self):
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
        if os.path.exists(creds_path):
            try:
                from googleapiclient.discovery import build
                from google.oauth2 import service_account
                creds = service_account.Credentials.from_service_account_file(
                    creds_path,
                    scopes=['https://www.googleapis.com/auth/drive']
                )
                self.drive_service = build('drive', 'v3', credentials=creds)
                logger.info("Connected to Google Drive API")
            except Exception as e:
                logger.warning(f"Google Drive initialization skipped/failed: {e}")

    def save_pdf(self, file_base64: str, file_name: str, nis: str) -> Dict[str, Any]:
        """Save base64 PDF to Google Drive or local storage fallback"""
        try:
            # Strip base64 prefix if present
            if "," in file_base64:
                file_base64 = file_base64.split(",", 1)[1]

            file_bytes = base64.b64decode(file_base64)
            safe_name = f"Raport_{nis}_{uuid.uuid4().hex[:6]}.pdf"

            # 1. Save to local fallback first
            local_path = os.path.join(self.upload_dir, safe_name)
            with open(local_path, "wb") as f:
                f.write(file_bytes)

            local_url = f"/static/uploads/{safe_name}"

            # 2. Upload to Google Drive if connected
            if self.drive_service and self.folder_id:
                try:
                    from googleapiclient.http import MediaIoBaseUpload
                    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='application/pdf', resumable=True)
                    file_metadata = {
                        'name': f"Raport_{nis}_{file_name}",
                        'parents': [self.folder_id]
                    }
                    file = self.drive_service.files().create(
                        body=file_metadata,
                        media_body=media,
                        fields='id, webViewLink, webContentLink'
                    ).execute()

                    # Set public view permission
                    self.drive_service.permissions().create(
                        fileId=file['id'],
                        body={'type': 'anyone', 'role': 'reader'}
                    ).execute()

                    drive_url = f"https://drive.google.com/file/d/{file['id']}/preview"
                    return {
                        "success": True,
                        "fileId": file['id'],
                        "urlPdf": drive_url,
                        "localUrl": local_url,
                        "fileName": safe_name
                    }
                except Exception as drive_err:
                    logger.warning(f"Drive upload error, using local url: {drive_err}")

            return {
                "success": True,
                "fileId": f"local_{safe_name}",
                "urlPdf": local_url,
                "localUrl": local_url,
                "fileName": safe_name
            }

        except Exception as e:
            logger.error(f"Failed to process PDF upload: {e}")
            return {"success": False, "message": f"Gagal memproses file PDF: {str(e)}"}

storage_manager = StorageManager()
