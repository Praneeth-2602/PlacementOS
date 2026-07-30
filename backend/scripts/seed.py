import json
from pathlib import Path

from app.database import SessionLocal
from app.models import (
    AptitudeProgress,
    Badge,
    CodingProblem,
    Course,
    CSProgress,
    CompanyProfile,
    Lesson,
    Question,
    QuestionDifficulty,
    QuestionType,
    StarTemplate,
    TopicStatus,
    User,
)
from app.services.billing import ensure_plans
from app.services.gamification import BADGE_CATALOG

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


_COURSES = [
    {
        "slug": "dsa-foundations",
        "title": "DSA Foundations",
        "track": "DSA",
        "order": 1,
        "description": "Arrays, hashing, two pointers, and sliding window fundamentals.",
        "lessons": [
            {"title": "Arrays & Hashing", "estimated_minutes": 30, "resource_url": "https://neetcode.io/roadmap"},
            {"title": "Two Pointers", "estimated_minutes": 25},
            {"title": "Sliding Window", "estimated_minutes": 25},
        ],
    },
    {
        "slug": "cs-fundamentals",
        "title": "CS Fundamentals",
        "track": "CS",
        "order": 2,
        "description": "Operating systems, DBMS, and networking essentials for interviews.",
        "lessons": [
            {"title": "OS: Processes & Threads", "estimated_minutes": 40},
            {"title": "DBMS: Transactions & Indexes", "estimated_minutes": 40},
            {"title": "Networking: TCP/IP & HTTP", "estimated_minutes": 35},
        ],
    },
    {
        "slug": "system-design-basics",
        "title": "System Design Basics",
        "track": "SYSTEM_DESIGN",
        "order": 3,
        "description": "Scaling, caching, and designing a URL shortener end to end.",
        "lessons": [
            {"title": "Scaling & Load Balancing", "estimated_minutes": 45},
            {"title": "Caching Strategies", "estimated_minutes": 30},
        ],
    },
]

_PROBLEMS = [
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": QuestionDifficulty.EASY,
        "topic": "arrays",
        "statement": "Return indices of the two numbers that add up to target.",
        "constraints": "2 <= n <= 10^4",
        "sample_tests": [{"input": "2 7 11 15\n9", "output": "0 1"}],
        "hidden_tests": [{"input": "3 2 4\n6", "output": "1 2"}],
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": QuestionDifficulty.EASY,
        "topic": "stack",
        "statement": "Determine if the input string of brackets is valid.",
        "constraints": "1 <= n <= 10^4",
        "sample_tests": [{"input": "()[]{}", "output": "true"}],
        "hidden_tests": [{"input": "(]", "output": "false"}],
    },
    {
        "slug": "longest-substring",
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": QuestionDifficulty.MEDIUM,
        "topic": "sliding-window",
        "statement": "Find the length of the longest substring without repeating characters.",
        "constraints": "0 <= n <= 5*10^4",
        "sample_tests": [{"input": "abcabcbb", "output": "3"}],
        "hidden_tests": [{"input": "bbbbb", "output": "1"}],
    },
]


def _seed_courses(db) -> None:
    for c in _COURSES:
        course = db.query(Course).filter(Course.slug == c["slug"]).first()
        if not course:
            course = Course(
                slug=c["slug"],
                title=c["title"],
                track=c["track"],
                order=c["order"],
                description=c.get("description"),
                published=True,
            )
            db.add(course)
            db.flush()
        for i, lesson in enumerate(c["lessons"]):
            exists = (
                db.query(Lesson)
                .filter(Lesson.course_id == course.id, Lesson.title == lesson["title"])
                .first()
            )
            if not exists:
                db.add(
                    Lesson(
                        course_id=course.id,
                        title=lesson["title"],
                        order=i,
                        estimated_minutes=lesson.get("estimated_minutes", 15),
                        resource_url=lesson.get("resource_url"),
                    )
                )


def _seed_problems(db) -> None:
    for p in _PROBLEMS:
        if not db.query(CodingProblem).filter(CodingProblem.slug == p["slug"]).first():
            db.add(CodingProblem(**p, is_active=True))


def _seed_badges(db) -> None:
    for b in BADGE_CATALOG:
        if not db.query(Badge).filter(Badge.code == b["code"]).first():
            db.add(Badge(**b))


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

        _seed_courses(db)
        _seed_problems(db)
        _seed_badges(db)

        db.commit()

        # Plans use their own commit (idempotent upsert on plan.code).
        ensure_plans(db)

        print("Seeding complete")
    finally:
        db.close()


if __name__ == "__main__":
    run()
