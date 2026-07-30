from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.entities import LessonStatus


class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    title: str
    body: str | None = None
    resource_url: str | None = None
    order: int
    estimated_minutes: int


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    slug: str
    description: str | None = None
    track: str
    order: int
    published: bool


class CourseDetailResponse(CourseResponse):
    lessons: list[LessonResponse] = []


class LessonProgressUpdateRequest(BaseModel):
    status: LessonStatus


class LessonProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    lesson_id: str
    status: LessonStatus
    completed_at: datetime | None = None
