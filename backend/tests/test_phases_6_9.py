"""Focused coverage for Phase 6-9 endpoints (onboarding, org, practice, billing, content).

These exercise the critical new surfaces added across phases 6-9 and assert the
graceful-degradation paths (mock judge / mock billing provider) so the suite runs
without any external services or API keys.
"""

import json
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.config import get_settings
from app.main import app
from app.models import (
    CodingProblem,
    Course,
    Lesson,
    Membership,
    MembershipStatus,
    Organization,
    OrgRole,
    Plan,
    Profile,
    QuestionDifficulty,
    ReadinessScore,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
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


def _auth(user_id: str, role: UserRole = UserRole.USER):
    client.cookies.set(AuthService.ACCESS_COOKIE, _token(user_id, role))


def _make_user(db, user_id: str, email: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id, email=email, role=UserRole.USER)
        db.add(user)
        db.commit()
    return user


# --- Phase 6: onboarding ----------------------------------------------------


def test_onboarding_persists_profile_and_seeds_readiness():
    _auth("user-1")
    resp = client.post(
        "/users/onboarding",
        json={
            "university": "IIT Bombay",
            "graduation_year": 2027,
            "target_role": "SWE",
            "target_companies": ["Google", "Meta"],
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["completed"] is True

    db = TestingSessionLocal()
    profile = db.query(Profile).filter(Profile.user_id == "user-1").first()
    assert profile is not None
    assert profile.university == "IIT Bombay"
    assert profile.onboarded_at is not None
    score = db.query(ReadinessScore).filter(ReadinessScore.user_id == "user-1").first()
    assert score is not None
    db.close()

    status = client.get("/users/onboarding/status")
    assert status.status_code == 200
    assert status.json()["data"]["completed"] is True
    client.cookies.clear()


def test_onboarding_status_incomplete_lists_missing_fields():
    _auth("user-1")
    resp = client.get("/users/onboarding/status")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["completed"] is False
    assert "university" in body["missingFields"]
    client.cookies.clear()


# --- Phase 8: org creation + cross-tenant isolation -------------------------


def test_create_org_makes_founder_org_admin():
    _auth("user-1")
    resp = client.post("/org", json={"name": "Test College", "slug": "test-college"})
    assert resp.status_code == 200, resp.text
    org_id = resp.json()["data"]["id"]

    db = TestingSessionLocal()
    membership = (
        db.query(Membership)
        .filter(Membership.org_id == org_id, Membership.user_id == "user-1")
        .first()
    )
    assert membership is not None
    assert membership.org_role == OrgRole.ORG_ADMIN
    assert membership.status == MembershipStatus.ACTIVE
    db.close()
    client.cookies.clear()


def test_org_scoping_blocks_cross_tenant_access():
    db = TestingSessionLocal()
    _make_user(db, "user-2", "user2@test.com")
    # user-1 owns org A; user-2 owns org B.
    org_a = Organization(name="A College", slug="a-college")
    org_b = Organization(name="B College", slug="b-college")
    db.add_all([org_a, org_b])
    db.flush()
    db.add(
        Membership(
            org_id=org_a.id, user_id="user-1", email="user@test.com",
            org_role=OrgRole.ORG_ADMIN, status=MembershipStatus.ACTIVE,
        )
    )
    db.add(
        Membership(
            org_id=org_b.id, user_id="user-2", email="user2@test.com",
            org_role=OrgRole.ORG_ADMIN, status=MembershipStatus.ACTIVE,
        )
    )
    db.commit()
    org_b_id = org_b.id
    db.close()

    _auth("user-1")
    # user-1 cannot read org B's members.
    resp = client.get(f"/org/{org_b_id}/members")
    assert resp.status_code == 403
    client.cookies.clear()


# --- Phase 7: content + lesson progress -------------------------------------


def _seed_course(db) -> tuple[str, str]:
    course = Course(title="DSA", slug="dsa-test", track="DSA", order=1, published=True)
    db.add(course)
    db.flush()
    lesson = Lesson(course_id=course.id, title="Arrays", order=0, estimated_minutes=20)
    db.add(lesson)
    db.commit()
    return course.id, lesson.id


def test_content_list_and_lesson_progress_awards_xp():
    db = TestingSessionLocal()
    course_id, lesson_id = _seed_course(db)
    db.close()

    _auth("user-1")
    courses = client.get("/content/courses")
    assert courses.status_code == 200
    assert any(c["slug"] == "dsa-test" for c in courses.json()["data"])

    detail = client.get(f"/content/courses/{course_id}")
    assert detail.status_code == 200
    assert len(detail.json()["data"]["lessons"]) == 1

    resp = client.post(f"/content/lessons/{lesson_id}/progress", json={"status": "COMPLETED"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["status"] == "COMPLETED"

    db = TestingSessionLocal()
    profile = db.query(Profile).filter(Profile.user_id == "user-1").first()
    assert profile is not None and profile.xp >= 20  # lesson_completed reward
    db.close()
    client.cookies.clear()


# --- Phase 7: practice submit (mock judge) ----------------------------------


def test_practice_submit_enqueues_and_mock_judge_accepts():
    db = TestingSessionLocal()
    problem = CodingProblem(
        title="Two Sum",
        slug="two-sum-test",
        difficulty=QuestionDifficulty.EASY,
        topic="arrays",
        statement="return indices",
        sample_tests=[{"input": "1", "output": "1"}],
        is_active=True,
    )
    db.add(problem)
    db.commit()
    problem_id = problem.id
    db.close()

    _auth("user-1")
    with patch("app.routers.practice.enqueue_job", new=AsyncMock(return_value="job-9")):
        resp = client.post(
            f"/practice/problems/{problem_id}/submit",
            json={"language": "python", "code": "print(1)"},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["job_id"] == "job-9"
    submission_id = data["submission_id"]

    # Run the judge inline (no JUDGE_URL configured -> deterministic mock ACCEPT).
    import asyncio

    from app.services.judge import process_submission

    db = TestingSessionLocal()
    asyncio.get_event_loop().run_until_complete(process_submission(db, submission_id))
    db.close()

    got = client.get(f"/practice/submissions/{submission_id}")
    assert got.status_code == 200
    assert got.json()["data"]["verdict"] == "ACCEPTED"
    client.cookies.clear()


# --- Phase 9: billing (mock provider) + feature gating ----------------------


def test_billing_checkout_webhook_activates_subscription_and_gates_features():
    _auth("user-1")
    plans = client.get("/billing/plans")
    assert plans.status_code == 200
    codes = {p["code"] for p in plans.json()["data"]}
    assert {"free", "student_pro"}.issubset(codes)

    checkout = client.post("/billing/checkout", json={"plan_code": "student_pro"})
    assert checkout.status_code == 200, checkout.text
    sub_id = checkout.json()["data"]["subscription_id"]

    db = TestingSessionLocal()
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    provider_sub_id = sub.provider_sub_id
    assert sub.status == SubscriptionStatus.INCOMPLETE
    db.close()

    # Mock provider webhook: JSON body reconciles subscription to active.
    payload = json.dumps({"type": "checkout.completed", "provider_sub_id": provider_sub_id, "status": "active"})
    hook = client.post("/billing/webhook", content=payload)
    assert hook.status_code == 200, hook.text

    db = TestingSessionLocal()
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    assert sub.status == SubscriptionStatus.ACTIVE
    db.close()

    sub_resp = client.get("/billing/subscription")
    assert sub_resp.status_code == 200
    ent = sub_resp.json()["data"]["entitlements"]
    assert ent["pro_ai"] is True
    assert ent["tier"] == "pro"
    client.cookies.clear()


def test_free_user_has_default_entitlements():
    from app.services.entitlements import resolve_entitlements

    db = TestingSessionLocal()
    ent = resolve_entitlements(db, "admin-1")
    assert ent["tier"] == "free"
    assert ent["pro_ai"] is False
    db.close()
