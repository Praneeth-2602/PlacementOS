from datetime import UTC, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import GitHubIntegration, GitHubRepo, LeetCodeIntegration, LeetCodeStats, ReadinessScore
from app.models import (
  CSProgress,
  CompanyProfile,
  InterviewSession,
  LessonProgress,
  Opportunity,
  OpportunityStatus,
  Profile,
  Resume,
  ScoreHistory,
  Submission,
  SubmissionVerdict,
  NotificationType,
)
from app.models.entities import LessonStatus, TopicStatus
from app.services.notifications import create_notification
from app.services.readiness.scorers import (
  CSFundamentalsScorer,
  CSFundamentalsScorerInput,
  DSAScorer,
  DSAScorerInput,
  InterviewScorer,
  InterviewScorerInput,
  OpportunityScorer,
  OpportunityScorerInput,
  ProjectsScorer,
  ProjectsScorerInput,
  ResumeScorer,
  ResumeScorerInput,
)


class ReadinessEngine:
  WEIGHTS = {
    "dsa": 0.30,
    "cs": 0.20,
    "projects": 0.20,
    "interview": 0.15,
    "resume": 0.10,
    "opportunities": 0.05,
  }

  def __init__(self, db: Session):
    self.db = db

  def recalculate(self, user_id: str) -> ReadinessScore:
    lc = (
      self.db.query(LeetCodeIntegration)
      .options(joinedload(LeetCodeIntegration.stats))
      .filter(LeetCodeIntegration.user_id == user_id)
      .first()
    )
    gh = (
      self.db.query(GitHubIntegration)
      .options(joinedload(GitHubIntegration.repos))
      .filter(GitHubIntegration.user_id == user_id)
      .first()
    )

    stats: LeetCodeStats | None = lc.stats if lc else None
    # In-app judge: count distinct problems the user has solved (Phase 7) and
    # fold them into the DSA signal alongside LeetCode data.
    solved_in_app = (
      self.db.query(func.count(func.distinct(Submission.problem_id)))
      .filter(Submission.user_id == user_id, Submission.verdict == SubmissionVerdict.ACCEPTED)
      .scalar()
      or 0
    )
    dsa_score = DSAScorer.compute(
      DSAScorerInput(
        total_solved=(stats.total_solved if stats else 0) + solved_in_app,
        medium_solved=(stats.medium_solved if stats else 0) + solved_in_app,
        hard_solved=stats.hard_solved if stats else 0,
        current_streak=stats.current_streak if stats else 0,
        ranking=stats.ranking if stats else None,
      )
    )

    repos: list[GitHubRepo] = gh.repos if gh else []
    featured = [r for r in repos if r.is_featured]
    deployed = [r for r in repos if r.description and "deploy" in (r.description or "").lower()]
    total_stars = sum(r.stars for r in repos)
    commits_this_month = 0
    if gh and gh.activity_stats and gh.activity_stats.contribution_calendar:
      commits_this_month = sum(gh.activity_stats.contribution_calendar.values())

    projects_score = ProjectsScorer.compute(
      ProjectsScorerInput(
        featured_count=len(featured),
        deployed_count=len(deployed),
        commits_this_month=commits_this_month,
        total_stars=total_stars,
      )
    )

    cs_rows = self.db.query(CSProgress).filter(CSProgress.user_id == user_id).all()
    cs_completed = sum(1 for row in cs_rows if row.status == TopicStatus.COMPLETED)
    cs_conf = sum(row.confidence for row in cs_rows) / len(cs_rows) if cs_rows else 0.0
    # Roadmap/lesson completion (Phase 7) contributes to the CS signal.
    lessons_completed = (
      self.db.query(func.count(LessonProgress.id))
      .filter(LessonProgress.user_id == user_id, LessonProgress.status == LessonStatus.COMPLETED)
      .scalar()
      or 0
    )
    cs_score = CSFundamentalsScorer.compute(
      CSFundamentalsScorerInput(
        completed_topics=cs_completed + lessons_completed,
        total_topics=len(cs_rows) + lessons_completed,
        avg_confidence=cs_conf,
      )
    )

    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    interview_rows = (
      self.db.query(InterviewSession)
      .filter(InterviewSession.user_id == user_id, InterviewSession.created_at >= thirty_days_ago)
      .all()
    )
    interview_avg = (
      sum(float(row.self_score or 0.0) for row in interview_rows) / len(interview_rows) if interview_rows else 0.0
    )
    interview_score = InterviewScorer.compute(
      InterviewScorerInput(
        sessions_last_30_days=len(interview_rows),
        avg_self_score=interview_avg,
        has_hr_sessions=any((row.session_type or "").upper() == "HR" for row in interview_rows),
      )
    )

    default_resume = (
      self.db.query(Resume).filter(Resume.user_id == user_id, Resume.is_default.is_(True)).order_by(Resume.updated_at.desc()).first()
    )
    resume_score = ResumeScorer.compute(
      ResumeScorerInput(
        has_default_resume=bool(default_resume),
        ats_score=default_resume.ats_score if default_resume else None,
      )
    )

    applied_count = (
      self.db.query(Opportunity)
      .filter(
        Opportunity.user_id == user_id,
        Opportunity.status.in_(
          [
            OpportunityStatus.APPLIED,
            OpportunityStatus.OA_SCHEDULED,
            OpportunityStatus.INTERVIEW_SCHEDULED,
            OpportunityStatus.OFFERED,
            OpportunityStatus.ACCEPTED,
          ]
        ),
      )
      .count()
    )
    opportunities_score = OpportunityScorer.compute(OpportunityScorerInput(applied_count=applied_count))

    overall = round(
      dsa_score * self.WEIGHTS["dsa"]
      + cs_score * self.WEIGHTS["cs"]
      + projects_score * self.WEIGHTS["projects"]
      + interview_score * self.WEIGHTS["interview"]
      + resume_score * self.WEIGHTS["resume"]
      + opportunities_score * self.WEIGHTS["opportunities"],
      1,
    )

    record = self.db.query(ReadinessScore).filter(ReadinessScore.user_id == user_id).first()
    previous_overall = record.overall_score if record else 0.0
    if not record:
      record = ReadinessScore(user_id=user_id)
      self.db.add(record)

    record.dsa_score = dsa_score
    record.cs_score = cs_score
    record.projects_score = projects_score
    record.interview_score = interview_score
    record.resume_score = resume_score
    record.opportunities_score = opportunities_score
    record.overall_score = overall
    self.db.add(
      ScoreHistory(
        user_id=user_id,
        dsa_score=dsa_score,
        cs_score=cs_score,
        projects_score=projects_score,
        interview_score=interview_score,
        resume_score=resume_score,
        opportunities_score=opportunities_score,
        overall_score=overall,
      )
    )
    self.db.commit()
    self.db.refresh(record)
    if overall - previous_overall >= 5:
      create_notification(
        self.db,
        user_id=user_id,
        title="Readiness score improved",
        message=f"Your readiness score increased to {overall}",
        notification_type=NotificationType.SCORE_UPDATE,
        extra_data={"previous": previous_overall, "current": overall},
      )
    return record

  def get_or_recalculate(self, user_id: str) -> ReadinessScore:
    record = self.db.query(ReadinessScore).filter(ReadinessScore.user_id == user_id).first()
    if record:
      return record
    return self.recalculate(user_id)

  def recommendations(self, user_id: str) -> list[dict]:
    record = self.get_or_recalculate(user_id)
    categories = [
      ("dsa", record.dsa_score, "Solve 2 medium DSA problems today"),
      ("cs", record.cs_score, "Complete one CS fundamentals topic with confidence >= 70"),
      ("projects", record.projects_score, "Ship one project update and link deployment"),
      ("interview", record.interview_score, "Log one mock interview session this week"),
      ("resume", record.resume_score, "Run ATS analysis on your default resume"),
      ("opportunities", record.opportunities_score, "Apply to one tracked opportunity"),
    ]
    weakest = sorted(categories, key=lambda x: x[1])[:3]
    return [{"category": name, "score": score, "action": action} for name, score, action in weakest]

  def readiness_by_company(self, user_id: str, company_name: str) -> dict:
    score = self.get_or_recalculate(user_id)
    profile = (
      self.db.query(CompanyProfile)
      .filter(func.lower(CompanyProfile.name) == company_name.strip().lower())
      .first()
    )
    defaults = {
      "google": {"dsa": 0.40, "projects": 0.25, "cs": 0.20, "interview": 0.10, "resume": 0.03, "opportunities": 0.02},
      "meta": {"dsa": 0.45, "projects": 0.30, "cs": 0.15, "interview": 0.06, "resume": 0.02, "opportunities": 0.02},
      "startup": {"dsa": 0.20, "projects": 0.35, "cs": 0.10, "interview": 0.10, "resume": 0.25, "opportunities": 0.0},
    }
    weights = profile.weights if profile else defaults.get(company_name.strip().lower(), self.WEIGHTS)
    weighted = round(
      score.dsa_score * weights.get("dsa", 0.0)
      + score.cs_score * weights.get("cs", 0.0)
      + score.projects_score * weights.get("projects", 0.0)
      + score.interview_score * weights.get("interview", 0.0)
      + score.resume_score * weights.get("resume", 0.0)
      + score.opportunities_score * weights.get("opportunities", 0.0),
      1,
    )
    return {
      "company": company_name,
      "weights": weights,
      "score": weighted,
      "breakdown": {
        "dsa": score.dsa_score,
        "cs": score.cs_score,
        "projects": score.projects_score,
        "interview": score.interview_score,
        "resume": score.resume_score,
        "opportunities": score.opportunities_score,
      },
    }

  def benchmarks(self, user_id: str) -> dict:
    profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile or profile.graduation_year is None:
      return {"available": False, "reason": "Graduation year missing"}
    cohort_user_ids = [u for (u,) in self.db.query(Profile.user_id).filter(Profile.graduation_year == profile.graduation_year).all()]
    if len(cohort_user_ids) < 10:
      return {"available": False, "reason": "Not enough cohort data", "cohort": {"year": profile.graduation_year, "size": len(cohort_user_ids)}}

    scores = self.db.query(ReadinessScore).filter(ReadinessScore.user_id.in_(cohort_user_ids)).all()
    current = self.get_or_recalculate(user_id)
    if not scores:
      return {"available": False, "reason": "No scores yet"}

    def percentiles(values: list[float]) -> dict:
      ordered = sorted(values)
      n = len(ordered)
      return {
        "p25": ordered[max(0, int((n - 1) * 0.25))],
        "p50": ordered[max(0, int((n - 1) * 0.5))],
        "p75": ordered[max(0, int((n - 1) * 0.75))],
      }

    def user_percentile(value: float, values: list[float]) -> int:
      if not values:
        return 0
      less_or_equal = sum(1 for v in values if v <= value)
      return int(round((less_or_equal / len(values)) * 100))

    overall_values = [s.overall_score for s in scores]
    dsa_values = [s.dsa_score for s in scores]
    cs_values = [s.cs_score for s in scores]
    return {
      "available": True,
      "cohort": {"year": profile.graduation_year, "size": len(scores)},
      "percentile": {
        "overall": user_percentile(current.overall_score, overall_values),
        "dsa": user_percentile(current.dsa_score, dsa_values),
        "cs": user_percentile(current.cs_score, cs_values),
      },
      "benchmarks": {
        "overall": percentiles(overall_values),
        "dsa": percentiles(dsa_values),
        "cs": percentiles(cs_values),
      },
    }
