from pydantic import BaseModel


class ProfileUpdateRequest(BaseModel):
    university: str | None = None
    graduation_year: int | None = None
    target_role: str | None = None
    bio: str | None = None


class UserSettingsRequest(BaseModel):
    email_deadline_reminders: bool | None = None
    email_weekly_digest: bool | None = None
    theme: str | None = None
