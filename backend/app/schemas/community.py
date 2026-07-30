from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ThreadCreateRequest(BaseModel):
    title: str
    category: str = "GENERAL"
    body: str | None = None


class PostCreateRequest(BaseModel):
    body: str


class VoteRequest(BaseModel):
    value: int  # +1 or -1


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    thread_id: str
    author_id: str
    body: str
    score: int
    is_hidden: bool
    created_at: datetime | None = None


class ThreadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    author_id: str
    title: str
    category: str
    score: int
    is_hidden: bool
    created_at: datetime | None = None


class ThreadDetailResponse(ThreadResponse):
    posts: list[PostResponse] = []
