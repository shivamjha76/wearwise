import os
import tempfile
from pathlib import Path


def get_upload_dir() -> Path:
    """
    Returns a writable directory for uploaded files.
    On Vercel (or any read-only lambda environment), uses /tmp/wearwise_uploads.
    In local development, uses backend/uploads.
    """
    if os.getenv("VERCEL"):
        upload_dir = Path(tempfile.gettempdir()) / "wearwise_uploads"
    else:
        local_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
        try:
            local_dir.mkdir(parents=True, exist_ok=True)
            test_file = local_dir / ".write_test"
            test_file.touch()
            test_file.unlink()
            return local_dir
        except (PermissionError, OSError):
            upload_dir = Path(tempfile.gettempdir()) / "wearwise_uploads"

    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir
