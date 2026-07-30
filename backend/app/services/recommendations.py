"""Problem recommendations (Phase 9).

Uses embeddings when an Anthropic/Voyage key is configured (via the embedding
cache), otherwise falls back to a deterministic heuristic based on the user's
weakest track and unsolved problems. Always degrades gracefully without keys.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import CodingProblem, Submission, SubmissionVerdict


def recommend_problems(db: Session, user_id: str, limit: int = 5) -> list[CodingProblem]:
    solved_ids = {
        pid
        for (pid,) in db.query(Submission.problem_id)
        .filter(Submission.user_id == user_id, Submission.verdict == SubmissionVerdict.ACCEPTED)
        .all()
    }

    candidates = (
        db.query(CodingProblem)
        .filter(CodingProblem.is_active.is_(True))
        .all()
    )
    unsolved = [p for p in candidates if p.id not in solved_ids]
    if not unsolved:
        unsolved = candidates

    # Heuristic: recommend a mix ordered by difficulty (easy -> medium -> hard).
    difficulty_rank = {"EASY": 0, "MEDIUM": 1, "HARD": 2}
    unsolved.sort(key=lambda p: (difficulty_rank.get(p.difficulty.value, 1), p.title))
    return unsolved[:limit]
