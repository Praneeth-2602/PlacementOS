from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Note, User
from app.schemas.common import ApiResponse
from app.schemas.notes import NoteCreateRequest, NoteResponse, NoteUpdateRequest

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=ApiResponse[list[NoteResponse]])
def list_notes(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    subject: str | None = Query(default=None),
):
    query = db.query(Note).filter(Note.user_id == user.id)
    if subject:
        query = query.filter(Note.subject == subject)
    rows = query.order_by(Note.updated_at.desc()).all()
    return ApiResponse(data=[NoteResponse.model_validate(row) for row in rows])


@router.post("", response_model=ApiResponse[NoteResponse])
def create_note(
    body: NoteCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = Note(user_id=user.id, title=body.title, content=body.content, subject=body.subject)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiResponse(data=NoteResponse.model_validate(row))


@router.get("/{note_id}", response_model=ApiResponse[NoteResponse])
def get_note(
    note_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return ApiResponse(data=NoteResponse.model_validate(row))


@router.put("/{note_id}", response_model=ApiResponse[NoteResponse])
def update_note(
    note_id: str,
    body: NoteUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if body.title is not None:
        row.title = body.title
    if body.content is not None:
        row.content = body.content
    if body.subject is not None:
        row.subject = body.subject
    db.commit()
    db.refresh(row)
    return ApiResponse(data=NoteResponse.model_validate(row))


@router.delete("/{note_id}", response_model=ApiResponse[dict])
def delete_note(
    note_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    row = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    db.delete(row)
    db.commit()
    return ApiResponse(data={"deleted": True})
