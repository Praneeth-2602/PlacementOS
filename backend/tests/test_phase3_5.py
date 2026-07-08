from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.config import get_settings
from app.main import app
from app.models import Question, QuestionDifficulty, QuestionType, UserRole
from app.models.entities import OpportunityStatus
from app.services.opportunities import ensure_valid_transition
from app.services.readiness.scorers import (
    CSFundamentalsScorer,
    CSFundamentalsScorerInput,
    InterviewScorer,
    InterviewScorerInput,
)
from app.services.auth import AuthService
from conftest import TestingSessionLocal

client = TestClient(app)
settings = get_settings()


def _token(user_id: str, role: UserRole = UserRole.USER) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=15)
    return jwt.encode(
        {"sub": user_id, "role": role.value, "type": "access", "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def test_cs_fundamentals_scorer_formula():
    score = CSFundamentalsScorer.compute(
        CSFundamentalsScorerInput(completed_topics=70, total_topics=100, avg_confidence=80)
    )
    assert score == 73.0


def test_interview_scorer_formula():
    score = InterviewScorer.compute(
        InterviewScorerInput(sessions_last_30_days=3, avg_self_score=8.0, has_hr_sessions=True)
    )
    assert score == 97.0


def test_opportunity_transition_state_machine():
    ensure_valid_transition(OpportunityStatus.TRACKING, OpportunityStatus.APPLIED)
    ensure_valid_transition(OpportunityStatus.OFFERED, OpportunityStatus.ACCEPTED)
    with pytest.raises(Exception):
        ensure_valid_transition(OpportunityStatus.TRACKING, OpportunityStatus.OFFERED)


def test_prepare_questions_filter():
    db = TestingSessionLocal()
    db.add(
        Question(
            type=QuestionType.TECHNICAL,
            question="Two sum approach?",
            answer="Hash map",
            company="Google",
            difficulty=QuestionDifficulty.EASY,
            topic="Arrays",
            is_active=True,
        )
    )
    db.add(
        Question(
            type=QuestionType.HR,
            question="Why this company?",
            answer="Mission fit",
            company="Google",
            difficulty=QuestionDifficulty.MEDIUM,
            topic="Behavioral",
            is_active=True,
        )
    )
    db.commit()
    db.close()

    client.cookies.set(AuthService.ACCESS_COOKIE, _token("user-1"))
    resp = client.get("/prepare/questions", params={"type": "TECHNICAL", "company": "Google"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["type"] == "TECHNICAL"
