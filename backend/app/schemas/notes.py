from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteCreateRequest(BaseModel):
    title: str
    content: str | None = None
    subject: str | None = None


class NoteUpdateRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    subject: str | None = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    content: str | None = None
    subject: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
