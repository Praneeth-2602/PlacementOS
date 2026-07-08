from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.config import get_settings
from app.main import app
from app.models import LeetCodeIntegration, LeetCodeStats, UserRole
from app.services.auth import AuthService
from app.services.readiness.scorers import DSAScorer, DSAScorerInput, ProjectsScorer, ProjectsScorerInput
from conftest import TestingSessionLocal

client = TestClient(app)
settings = get_settings()


def _make_token(user_id: str, role: UserRole) -> str:
    from datetime import UTC, datetime, timedelta

    expire = datetime.now(UTC) + timedelta(minutes=15)
    return jwt.encode(
        {"sub": user_id, "role": role.value, "type": "access", "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_auth_me_unauthenticated_returns_401():
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_admin_ping_requires_admin_role():
    user_token = _make_token("user-1", UserRole.USER)
    client.cookies.set(AuthService.ACCESS_COOKIE, user_token)
    response = client.get("/admin/ping")
    assert response.status_code == 403
    client.cookies.clear()

    admin_token = _make_token("admin-1", UserRole.ADMIN)
    client.cookies.set(AuthService.ACCESS_COOKIE, admin_token)
    response = client.get("/admin/ping")
    assert response.status_code == 200


def test_dsa_scorer_compute():
    score = DSAScorer.compute(
        DSAScorerInput(total_solved=250, medium_solved=100, hard_solved=25, current_streak=15, ranking=10000)
    )
    assert 0 < score <= 100


def test_projects_scorer_compute():
    score = ProjectsScorer.compute(
        ProjectsScorerInput(featured_count=2, deployed_count=1, commits_this_month=10, total_stars=5)
    )
    assert 0 < score <= 100


@pytest.mark.asyncio
async def test_leetcode_sync_enqueues_job():
    mock_profile = {
        "submitStats": {
            "acSubmissionNum": [
                {"difficulty": "All", "count": 120},
                {"difficulty": "Easy", "count": 50},
                {"difficulty": "Medium", "count": 60},
                {"difficulty": "Hard", "count": 10},
            ]
        },
        "profile": {"ranking": 25000},
        "userCalendar": {"submissionCalendar": "{}"},
        "tagProblemCounts": {"advanced": [], "intermediate": [], "fundamental": []},
    }

    with patch("app.routers.leetcode.enqueue_job", new=AsyncMock(return_value="job-123")):
        token = _make_token("user-1", UserRole.USER)
        client.cookies.set(AuthService.ACCESS_COOKIE, token)
        response = client.post("/leetcode/sync", json={"username": "testuser"})
        assert response.status_code == 200
        assert response.json()["data"]["job_id"] == "job-123"

    with patch("app.services.leetcode.fetch_leetcode_profile", new=AsyncMock(return_value=mock_profile)):
        from app.services.leetcode import run_leetcode_sync

        db = TestingSessionLocal()
        integration = db.query(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == "user-1").first()
        if not integration:
            integration = LeetCodeIntegration(user_id="user-1")
            db.add(integration)
            db.commit()
        await run_leetcode_sync(db, "user-1", "testuser")
        stats = db.query(LeetCodeStats).join(LeetCodeIntegration).filter(LeetCodeIntegration.user_id == "user-1").first()
        assert stats is not None
        assert stats.total_solved == 120
        db.close()
