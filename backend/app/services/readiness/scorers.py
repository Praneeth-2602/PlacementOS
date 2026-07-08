from dataclasses import dataclass


DSA_TARGETS = {
  "easy": 100,
  "medium": 200,
  "hard": 50,
  "total": 500,
  "streak": 30,
  "ranking": 50000,
}


@dataclass
class DSAScorerInput:
  total_solved: int = 0
  medium_solved: int = 0
  hard_solved: int = 0
  current_streak: int = 0
  ranking: int | None = None


class DSAScorer:
  @staticmethod
  def compute(data: DSAScorerInput) -> float:
    total_pts = min(data.total_solved / DSA_TARGETS["total"], 1.0) * 40
    medium_pts = min(data.medium_solved / DSA_TARGETS["medium"], 1.0) * 25
    hard_pts = min(data.hard_solved / DSA_TARGETS["hard"], 1.0) * 15
    streak_pts = min(data.current_streak / DSA_TARGETS["streak"], 1.0) * 10
    if data.ranking is None or data.ranking <= 0:
      ranking_pts = 0.0
    elif data.ranking <= DSA_TARGETS["ranking"]:
      ranking_pts = 10.0
    else:
      ranking_pts = min(DSA_TARGETS["ranking"] / data.ranking, 1.0) * 10
    return round(total_pts + medium_pts + hard_pts + streak_pts + ranking_pts, 1)


@dataclass
class ProjectsScorerInput:
  featured_count: int = 0
  deployed_count: int = 0
  commits_this_month: int = 0
  total_stars: int = 0


class ProjectsScorer:
  @staticmethod
  def compute(data: ProjectsScorerInput) -> float:
    featured_pts = min(data.featured_count / 3, 1.0) * 40
    deployed_pts = min(data.deployed_count / 2, 1.0) * 30
    commits_pts = min(data.commits_this_month / 20, 1.0) * 20
    stars_pts = min(data.total_stars / 10, 1.0) * 10
    return round(featured_pts + deployed_pts + commits_pts + stars_pts, 1)


@dataclass
class CSFundamentalsScorerInput:
  completed_topics: int = 0
  total_topics: int = 0
  avg_confidence: float = 0.0


class CSFundamentalsScorer:
  @staticmethod
  def compute(data: CSFundamentalsScorerInput) -> float:
    if data.total_topics <= 0:
      return 0.0
    completion_component = (data.completed_topics / data.total_topics) * 70
    confidence_component = (max(0.0, min(data.avg_confidence, 100.0)) / 100.0) * 30
    return round(min(100.0, completion_component + confidence_component), 1)


@dataclass
class InterviewScorerInput:
  sessions_last_30_days: int = 0
  avg_self_score: float = 0.0
  has_hr_sessions: bool = False


class InterviewScorer:
  @staticmethod
  def compute(data: InterviewScorerInput) -> float:
    frequency = min(100.0, data.sessions_last_30_days * 15)
    quality = (max(0.0, min(data.avg_self_score, 10.0)) / 10.0) * 40
    hr_bonus = 20.0 if data.has_hr_sessions else 0.0
    return round(min(100.0, frequency + quality + hr_bonus), 1)


@dataclass
class ResumeScorerInput:
  has_default_resume: bool = False
  ats_score: float | None = None


class ResumeScorer:
  @staticmethod
  def compute(data: ResumeScorerInput) -> float:
    if not data.has_default_resume:
      return 0.0
    return round(max(0.0, min(data.ats_score or 0.0, 100.0)), 1)


@dataclass
class OpportunityScorerInput:
  applied_count: int = 0


class OpportunityScorer:
  @staticmethod
  def compute(data: OpportunityScorerInput) -> float:
    return round(min(100.0, data.applied_count * 20), 1)
