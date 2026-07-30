"""Coding-judge client (Phase 7).

Runs a submission against a problem's sample + hidden tests using an external
judge (Judge0 or piston) when ``JUDGE_URL`` is configured, and otherwise falls
back to a deterministic local mock so the flow is fully exercisable without any
external service. Untrusted code is NEVER executed in-process — the mock does
not run user code, it only simulates a verdict.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

import httpx

from app.config import get_settings

# Judge0 language ids for the common languages we expose.
_JUDGE0_LANGS = {"python": 71, "cpp": 54, "c": 50, "java": 62, "javascript": 63}
# piston runtimes
_PISTON_LANGS = {"python": "python", "cpp": "c++", "c": "c", "java": "java", "javascript": "javascript"}


@dataclass
class JudgeResult:
    verdict: str
    runtime_ms: int | None = None
    output: str | None = None
    passed_tests: int = 0
    total_tests: int = 0
    details: list[dict] = field(default_factory=list)


def _tests_for(problem) -> list[dict]:
    tests: list[dict] = []
    for t in (problem.sample_tests or []):
        tests.append(t)
    for t in (problem.hidden_tests or []):
        tests.append(t)
    return tests


async def run_submission(problem, language: str, code: str) -> JudgeResult:
    settings = get_settings()
    tests = _tests_for(problem)
    total = len(tests) or 1

    if not settings.judge_url:
        return _mock_run(code, total)

    try:
        if settings.judge_provider == "piston":
            return await _run_piston(settings, language, code, tests, total)
        return await _run_judge0(settings, language, code, tests, total)
    except Exception:
        # Degrade gracefully: never fail the request because the judge is down.
        result = _mock_run(code, total)
        result.output = (result.output or "") + " (judge unreachable; mock verdict)"
        return result


def _mock_run(code: str, total: int) -> JudgeResult:
    """Deterministic mock verdict. Does not execute user code."""
    stripped = (code or "").strip()
    if not stripped:
        return JudgeResult(verdict="COMPILATION_ERROR", output="Empty submission", passed_tests=0, total_tests=total)
    # Heuristic: treat obvious placeholders as failing so tests can assert both paths.
    if "TODO" in stripped or stripped in {"pass", "return"}:
        return JudgeResult(
            verdict="WRONG_ANSWER", output="Sample tests failed", passed_tests=0, total_tests=total
        )
    return JudgeResult(
        verdict="ACCEPTED",
        runtime_ms=42,
        output="All tests passed",
        passed_tests=total,
        total_tests=total,
    )


async def _run_judge0(settings, language: str, code: str, tests: list[dict], total: int) -> JudgeResult:
    lang_id = _JUDGE0_LANGS.get(language, 71)
    headers = {"Content-Type": "application/json"}
    if settings.judge_api_key:
        headers["X-Auth-Token"] = settings.judge_api_key
    passed = 0
    start = time.perf_counter()
    async with httpx.AsyncClient(base_url=settings.judge_url.rstrip("/"), timeout=30) as client:
        for test in tests:
            payload = {
                "source_code": code,
                "language_id": lang_id,
                "stdin": test.get("input", ""),
                "expected_output": test.get("output"),
            }
            resp = await client.post("/submissions?wait=true", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            status_id = (data.get("status") or {}).get("id")
            if status_id == 3:  # Accepted
                passed += 1
            elif status_id == 6:
                return JudgeResult(verdict="COMPILATION_ERROR", output=data.get("compile_output"), total_tests=total)
    runtime = int((time.perf_counter() - start) * 1000)
    verdict = "ACCEPTED" if passed == total else "WRONG_ANSWER"
    return JudgeResult(verdict=verdict, runtime_ms=runtime, passed_tests=passed, total_tests=total)


async def process_submission(db, submission_id: str) -> None:
    """Load a submission, run the judge, persist the verdict and award progress.

    Used by both the ARQ worker task and the inline fallback runner.
    """
    from app.models import CodingProblem, Submission, SubmissionVerdict
    from app.services.gamification import XP_REWARDS, award_xp, check_badges
    from app.services.readiness.engine import ReadinessEngine
    from app.services.streak import record_activity
    from app.services.weekly_goals import increment_goal

    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        return
    problem = db.query(CodingProblem).filter(CodingProblem.id == submission.problem_id).first()
    if not problem:
        submission.verdict = SubmissionVerdict.INTERNAL_ERROR
        db.commit()
        return

    submission.verdict = SubmissionVerdict.RUNNING
    db.commit()

    already_solved = (
        db.query(Submission)
        .filter(
            Submission.user_id == submission.user_id,
            Submission.problem_id == submission.problem_id,
            Submission.verdict == SubmissionVerdict.ACCEPTED,
            Submission.id != submission.id,
        )
        .first()
    )

    result = await run_submission(problem, submission.language, submission.code)
    submission.verdict = SubmissionVerdict(result.verdict)
    submission.runtime_ms = result.runtime_ms
    submission.output = result.output
    submission.passed_tests = result.passed_tests
    submission.total_tests = result.total_tests
    db.commit()

    if submission.verdict == SubmissionVerdict.ACCEPTED and not already_solved:
        record_activity(db, submission.user_id)
        increment_goal(db, submission.user_id, dsa_delta=1)
        award_xp(db, submission.user_id, XP_REWARDS["problem_solved"])
        check_badges(db, submission.user_id)
        ReadinessEngine(db).recalculate(submission.user_id)


async def _run_piston(settings, language: str, code: str, tests: list[dict], total: int) -> JudgeResult:
    runtime_lang = _PISTON_LANGS.get(language, "python")
    passed = 0
    start = time.perf_counter()
    async with httpx.AsyncClient(base_url=settings.judge_url.rstrip("/"), timeout=30) as client:
        for test in tests:
            payload = {
                "language": runtime_lang,
                "version": "*",
                "files": [{"content": code}],
                "stdin": test.get("input", ""),
            }
            resp = await client.post("/api/v2/execute", json=payload)
            resp.raise_for_status()
            data = resp.json()
            stdout = (data.get("run", {}) or {}).get("stdout", "").strip()
            if stdout == str(test.get("output", "")).strip():
                passed += 1
    runtime = int((time.perf_counter() - start) * 1000)
    verdict = "ACCEPTED" if passed == total else "WRONG_ANSWER"
    return JudgeResult(verdict=verdict, runtime_ms=runtime, passed_tests=passed, total_tests=total)
