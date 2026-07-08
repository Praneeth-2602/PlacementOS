import json
from pathlib import Path

from app.database import SessionLocal
from app.models import (
    AptitudeProgress,
    CSProgress,
    CompanyProfile,
    Question,
    QuestionDifficulty,
    QuestionType,
    StarTemplate,
    TopicStatus,
    User,
)

ROOT = Path(__file__).resolve().parent
SEEDS = ROOT / "seeds"


def _load(name: str) -> list[dict]:
    with (SEEDS / name).open("r", encoding="utf-8") as f:
        return json.load(f)


def _expand(base: list[dict], target: int, key: str) -> list[dict]:
    if not base:
        return []
    out = []
    idx = 0
    while len(out) < target:
        row = dict(base[idx % len(base)])
        if len(out) >= len(base):
            row[key] = f"{row[key]} #{(len(out) // len(base)) + 1}"
        out.append(row)
        idx += 1
    return out


def run() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).all()
        cs_topics = _expand(_load("cs_topics.json"), 120, "topic")
        aptitude_topics = _expand(_load("aptitude_topics.json"), 30, "topic")
        technical_questions = _expand(_load("technical_questions.json"), 150, "question")
        hr_questions = _expand(_load("hr_questions.json"), 50, "question")

        for user in users:
            for row in cs_topics:
                exists = (
                    db.query(CSProgress)
                    .filter(
                        CSProgress.user_id == user.id,
                        CSProgress.subject == row["subject"],
                        CSProgress.topic == row["topic"],
                    )
                    .first()
                )
                if not exists:
                    db.add(
                        CSProgress(
                            user_id=user.id,
                            subject=row["subject"],
                            topic=row["topic"],
                            status=TopicStatus.NOT_STARTED,
                            confidence=0,
                        )
                    )
            for row in aptitude_topics:
                exists = (
                    db.query(AptitudeProgress)
                    .filter(
                        AptitudeProgress.user_id == user.id,
                        AptitudeProgress.section == row["section"],
                        AptitudeProgress.topic == row["topic"],
                    )
                    .first()
                )
                if not exists:
                    db.add(
                        AptitudeProgress(
                            user_id=user.id,
                            section=row["section"],
                            topic=row["topic"],
                            attempted=0,
                            correct=0,
                        )
                    )

        for row in technical_questions + hr_questions:
            exists = db.query(Question).filter(Question.question == row["question"]).first()
            if not exists:
                db.add(
                    Question(
                        type=QuestionType(row.get("type", "TECHNICAL")),
                        question=row["question"],
                        answer=row.get("answer"),
                        company=row.get("company"),
                        difficulty=QuestionDifficulty(row.get("difficulty", "MEDIUM")),
                        topic=row.get("topic"),
                        tags=row.get("tags"),
                        is_active=True,
                    )
                )

        curated_templates = [
            {
                "title": "Conflict Resolution",
                "prompt": "Tell me about a conflict at work",
                "situation": "Cross-team ownership ambiguity",
                "task": "Align stakeholders and ship on time",
                "action": "Scheduled syncs, clarified responsibilities, tracked blockers daily",
                "result": "Delivered one week early with zero rollbacks",
            },
            {
                "title": "Leadership",
                "prompt": "Tell me about a time you led a team",
                "situation": "Hackathon project with unclear scope",
                "task": "Set scope and assign modules",
                "action": "Defined milestones, mentored teammates, handled integrations",
                "result": "Won 2nd place and productionized MVP",
            },
        ]
        for row in curated_templates:
            exists = db.query(StarTemplate).filter(StarTemplate.is_curated.is_(True), StarTemplate.title == row["title"]).first()
            if not exists:
                db.add(StarTemplate(is_curated=True, user_id=None, **row))

        company_profiles = [
            {
                "name": "Google",
                "weights": {"dsa": 0.40, "projects": 0.25, "cs": 0.20, "interview": 0.10, "resume": 0.03, "opportunities": 0.02},
                "round_structure": ["OA", "Tech 1", "Tech 2", "Hiring Manager"],
            },
            {
                "name": "Meta",
                "weights": {"dsa": 0.45, "projects": 0.30, "cs": 0.15, "interview": 0.06, "resume": 0.02, "opportunities": 0.02},
                "round_structure": ["Phone", "Virtual Onsite", "Behavioral"],
            },
            {
                "name": "Startup",
                "weights": {"dsa": 0.20, "projects": 0.35, "cs": 0.10, "interview": 0.10, "resume": 0.25, "opportunities": 0.0},
                "round_structure": ["Screening", "Assignment", "Founder Round"],
            },
        ]
        for row in company_profiles:
            exists = db.query(CompanyProfile).filter(CompanyProfile.name == row["name"]).first()
            if not exists:
                db.add(CompanyProfile(**row))

        db.commit()
        print("Seeding complete")
    finally:
        db.close()


if __name__ == "__main__":
    run()
