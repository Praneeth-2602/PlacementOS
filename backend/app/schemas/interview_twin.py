from pydantic import BaseModel


class InterviewTwinStartRequest(BaseModel):
    company: str
    role: str


class InterviewTwinRespondRequest(BaseModel):
    session_id: str
    answer: str


class InterviewTwinEndRequest(BaseModel):
    session_id: str
