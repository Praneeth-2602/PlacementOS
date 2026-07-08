from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import InterviewSession, Project, Resume, User
from app.schemas.common import ApiResponse
from app.schemas.interview_twin import InterviewTwinEndRequest, InterviewTwinRespondRequest, InterviewTwinStartRequest
from app.services.readiness.engine import ReadinessEngine
from app.services.streak import record_activity

router = APIRouter(prefix="/prepare/interview-twin", tags=["interview-twin"])
settings = get_settings()
_sessions: dict[str, dict] = {}


def _fallback_question(turn: int, company: str, role: str) -> str:
    prompts = [
        f"Introduce yourself for the {role} role at {company}.",
        "Describe a project where you solved an algorithmic bottleneck.",
        "How do you design reliable APIs at scale?",
        "Walk me through a tough bug and your debugging process.",
        "What makes you a strong fit for this team?",
    ]
    return prompts[min(turn, len(prompts) - 1)]


def _anthropic_reply(system_prompt: str, messages: list[dict]) -> str | None:
    if not settings.anthropic_api_key:
        return None
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=700,
            system=system_prompt,
            messages=messages,
        )
        if resp.content:
            return resp.content[0].text
    except Exception:
        return None
    return None


@router.post("/start", response_model=ApiResponse[dict])
def start_twin(
    body: InterviewTwinStartRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    resume = db.query(Resume).filter(Resume.user_id == user.id, Resume.is_default.is_(True)).first()
    projects = db.query(Project).filter(Project.user_id == user.id, Project.is_featured.is_(True)).limit(3).all()
    session_id = f"tw-{user.id}-{int(datetime.now(UTC).timestamp())}"
    system_prompt = (
        f"You are a technical interviewer at {body.company}. Candidate role: {body.role}. "
        f"Resume: {resume.json_data if resume else {}}. "
        f"Projects: {[p.name for p in projects]}. Ask 5 relevant questions."
    )
    first_question = _anthropic_reply(system_prompt, [{"role": "user", "content": "Ask the first question now."}])
    first_question = first_question or _fallback_question(0, body.company, body.role)
    _sessions[session_id] = {
        "turn": 0,
        "company": body.company,
        "role": body.role,
        "system_prompt": system_prompt,
        "messages": [{"role": "assistant", "content": first_question}],
    }
    return ApiResponse(data={"session_id": session_id, "question": first_question})


@router.post("/respond", response_model=ApiResponse[dict])
def respond_twin(
    body: InterviewTwinRespondRequest,
    user: Annotated[User, Depends(get_current_user)],
):
    state = _sessions.get(body.session_id)
    if not state:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    state["messages"].append({"role": "user", "content": body.answer})
    state["turn"] += 1
    llm = _anthropic_reply(
        state["system_prompt"],
        [
            {"role": "user", "content": f"Answer from candidate: {body.answer}. Give short feedback and next question."}
        ],
    )
    if llm:
        feedback = llm
        next_question = None if state["turn"] >= 5 else "Continue."
    else:
        feedback = "Solid answer. Add more metrics and mention trade-offs."
        next_question = None if state["turn"] >= 5 else _fallback_question(state["turn"], state["company"], state["role"])
    if next_question:
        state["messages"].append({"role": "assistant", "content": next_question})
    return ApiResponse(data={"feedback": feedback, "next_question": next_question, "done": state["turn"] >= 5})


@router.post("/end", response_model=ApiResponse[dict])
def end_twin(
    body: InterviewTwinEndRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    state = _sessions.pop(body.session_id, None)
    if not state:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    feedback_text = _anthropic_reply(
        state["system_prompt"],
        [{"role": "user", "content": "Provide strengths, weaknesses, score out of 10, and 3 improvements."}],
    )
    summary = (
        feedback_text
        if feedback_text
        else "Strengths: communication and structure. Weaknesses: lacks quantified impact. Score: 7/10. Improve STAR depth."
    )
    session = InterviewSession(
        user_id=user.id,
        session_type="INTERVIEW_TWIN",
        duration_minutes=25,
        questions_answered=min(5, state["turn"]),
        self_score=7.0,
        notes={"transcript": state["messages"], "summary": summary},
    )
    db.add(session)
    db.commit()
    record_activity(db, user.id)
    ReadinessEngine(db).recalculate(user.id)
    return ApiResponse(data={"summary": summary})
