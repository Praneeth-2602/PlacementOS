import io
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Resume, User
from app.schemas.common import ApiResponse
from app.schemas.resume import ResumeAnalyzeV2Request, ResumeCreateRequest, ResumeResponse, ResumeUpdateRequest
from app.services.ats import analyze_v2, extract_pdf_text, score_resume_v1
from app.services.readiness.engine import ReadinessEngine
from app.services.storage import StorageService

router = APIRouter(prefix="/resume", tags=["resume"])


@router.get("", response_model=ApiResponse[list[ResumeResponse]])
def list_resumes(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.updated_at.desc()).all()
    return ApiResponse(data=[ResumeResponse.model_validate(row) for row in rows])


@router.get("/{resume_id}", response_model=ApiResponse[ResumeResponse])
def get_resume(
    resume_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return ApiResponse(data=ResumeResponse.model_validate(row))


@router.post("", response_model=ApiResponse[ResumeResponse])
def create_resume(
    body: ResumeCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = Resume(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ResumeResponse.model_validate(row))


@router.put("/{resume_id}", response_model=ApiResponse[ResumeResponse])
def update_resume(
    resume_id: str,
    body: ResumeUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ResumeResponse.model_validate(row))


@router.delete("/{resume_id}", response_model=ApiResponse[dict])
def delete_resume(
    resume_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    StorageService().delete(row.file_url)
    db.delete(row)
    db.commit()
    return ApiResponse(data={"deleted": True})


@router.put("/{resume_id}/default", response_model=ApiResponse[ResumeResponse])
def set_default_resume(
    resume_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    db.query(Resume).filter(Resume.user_id == user.id, Resume.is_default.is_(True)).update({"is_default": False})
    row.is_default = True
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ResumeResponse.model_validate(row))


@router.post("/upload", response_model=ApiResponse[ResumeResponse])
async def upload_resume(
    file: UploadFile = File(...),
    user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(get_db)] = None,
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large, max size is 5MB")
    row = Resume(user_id=user.id, version_name=file.filename or "Uploaded Resume")
    db.add(row)
    db.commit()
    db.refresh(row)
    key = f"resumes/{user.id}/{row.id}.pdf"
    row.file_url = StorageService().save_bytes(key, content, content_type="application/pdf")
    db.commit()
    db.refresh(row)
    return ApiResponse(data=ResumeResponse.model_validate(row))


@router.post("/{resume_id}/analyze", response_model=ApiResponse[dict])
def analyze_resume(
    resume_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row or not row.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded resume not found")
    if not Path(row.file_url).exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume file not available for local analysis")
    file_bytes = Path(row.file_url).read_bytes()
    text, pages = extract_pdf_text(file_bytes)
    result = score_resume_v1(text, pages)
    row.ats_score = result.score
    row.ats_analysis = result.breakdown
    db.commit()
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data={"ats_score": row.ats_score, "ats_analysis": row.ats_analysis})


@router.post("/{resume_id}/analyze-v2", response_model=ApiResponse[dict])
def analyze_resume_v2(
    resume_id: str,
    body: ResumeAnalyzeV2Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    if row.file_url and row.file_url.startswith("/"):
        file_bytes = Path(row.file_url).read_bytes()
        text, pages = extract_pdf_text(file_bytes)
    else:
        text = str(row.json_data or "").lower()
        pages = 1
    result = analyze_v2(text, pages, body.job_description_text)
    row.ats_analysis = {**(row.ats_analysis or {}), "v2": result}
    db.commit()
    return ApiResponse(data=result)


@router.post("/{resume_id}/export", response_model=ApiResponse[dict])
def export_resume(
    resume_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    data = row.json_data or {}
    content = io.BytesIO()
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        c = canvas.Canvas(content, pagesize=A4)
        c.setFont("Helvetica", 11)
        y = 800
        c.drawString(40, y, data.get("name", row.version_name))
        y -= 20
        c.drawString(40, y, data.get("headline", row.target_role or "Resume"))
        y -= 24
        for line in str(data).splitlines():
            c.drawString(40, y, line[:110])
            y -= 14
            if y < 60:
                c.showPage()
                c.setFont("Helvetica", 11)
                y = 800
        c.save()
    except Exception:
        raise HTTPException(status_code=500, detail="Resume export failed")
    key = f"resumes/{user.id}/{row.id}-export.pdf"
    file_url = StorageService().save_bytes(key, content.getvalue(), content_type="application/pdf")
    return ApiResponse(data={"file_url": file_url})
