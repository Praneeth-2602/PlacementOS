from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from app.models import GitHubActivityStats, GitHubIntegration, GitHubRepo, OAuthAccount, OAuthProvider
from app.models.entities import NotificationType
from app.services.cache import CacheService
from app.services.encryption import decrypt_token, encrypt_token
from app.services.notifications import create_notification
from app.services.readiness.engine import ReadinessEngine
from app.services.sync_status import SyncStatusService

GITHUB_GRAPHQL = "https://api.github.com/graphql"
SYNC_COOLDOWN_MINUTES = 15

CONTRIBUTIONS_QUERY = """
query($login: String!) {
  user(login: $login) {
  contributionsCollection {
    contributionCalendar {
      totalContributions
      weeks {
        contributionDays { date contributionCount }
      }
    }
  }
  }
}
"""


def get_github_token(db: Session, user_id: str) -> tuple[str, GitHubIntegration]:
    integration = db.query(GitHubIntegration).filter(GitHubIntegration.user_id == user_id).first()
    if not integration:
        raise ValueError("GitHub integration not found")

    token: str | None = None
    if integration.access_token:
        try:
            token = decrypt_token(integration.access_token)
        except Exception:
            token = integration.access_token

    if not token:
        oauth = (
            db.query(OAuthAccount)
            .filter(OAuthAccount.user_id == user_id, OAuthAccount.provider == OAuthProvider.GITHUB)
            .first()
        )
        token = oauth.access_token if oauth else None

    if not token:
        raise ValueError("GitHub not connected. Sign in with GitHub first.")

    return token, integration


def can_sync(integration: GitHubIntegration | None) -> bool:
    if not integration or not integration.last_synced_at:
        return True
    elapsed = datetime.now(UTC) - integration.last_synced_at.replace(tzinfo=UTC)
    return elapsed >= timedelta(minutes=SYNC_COOLDOWN_MINUTES)


async def run_github_sync(db: Session, user_id: str) -> None:
    SyncStatusService.set("github", user_id, "syncing", 10)
    token, integration = get_github_token(db, user_id)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            SyncStatusService.set("github", user_id, "syncing", 25)
            user_resp = await client.get("https://api.github.com/user", headers=headers)
            user_resp.raise_for_status()
            gh_user = user_resp.json()
            login = gh_user["login"]

            SyncStatusService.set("github", user_id, "syncing", 45)
            repos_resp = await client.get(
                "https://api.github.com/user/repos",
                headers=headers,
                params={"per_page": 100, "sort": "pushed"},
            )
            repos_resp.raise_for_status()
            repos_data = repos_resp.json()

            SyncStatusService.set("github", user_id, "syncing", 65)
            gql_resp = await client.post(
                GITHUB_GRAPHQL,
                headers=headers,
                json={"query": CONTRIBUTIONS_QUERY, "variables": {"login": login}},
            )
            gql_resp.raise_for_status()
            gql_payload = gql_resp.json()

        existing = {
            row.github_repo_id: row
            for row in db.query(GitHubRepo).filter(GitHubRepo.integration_id == integration.id).all()
        }

        for repo in repos_data:
            repo_id = repo["id"]
            pushed_at = None
            if repo.get("pushed_at"):
                pushed_at = datetime.fromisoformat(repo["pushed_at"].replace("Z", "+00:00"))
            row = existing.get(repo_id)
            if row:
                row.name = repo["name"]
                row.full_name = repo["full_name"]
                row.description = repo.get("description")
                row.stars = repo.get("stargazers_count", 0)
                row.forks = repo.get("forks_count", 0)
                row.language = repo.get("language")
                row.topics = repo.get("topics", [])
                row.pushed_at = pushed_at
            else:
                db.add(
                    GitHubRepo(
                        integration_id=integration.id,
                        github_repo_id=repo_id,
                        name=repo["name"],
                        full_name=repo["full_name"],
                        description=repo.get("description"),
                        stars=repo.get("stargazers_count", 0),
                        forks=repo.get("forks_count", 0),
                        language=repo.get("language"),
                        topics=repo.get("topics", []),
                        pushed_at=pushed_at,
                    )
                )

        calendar: dict[str, int] = {}
        total_contributions = 0
        user_data = gql_payload.get("data", {}).get("user")
        if user_data:
            collection = user_data["contributionsCollection"]["contributionCalendar"]
            total_contributions = collection.get("totalContributions", 0)
            for week in collection.get("weeks", []):
                for day in week.get("contributionDays", []):
                    calendar[day["date"]] = day["contributionCount"]

        activity = integration.activity_stats
        if not activity:
            activity = GitHubActivityStats(integration_id=integration.id)
            db.add(activity)
        activity.total_contributions = total_contributions
        activity.contribution_calendar = calendar

        integration.username = login
        integration.is_connected = True
        integration.access_token = encrypt_token(token)
        integration.last_synced_at = datetime.now(UTC)
        integration.sync_status = "complete"
        db.commit()

        CacheService.delete(CacheService.dashboard_key(user_id))
        ReadinessEngine(db).recalculate(user_id)
        create_notification(
            db,
            user_id=user_id,
            title="GitHub sync complete",
            message=f"Successfully synced GitHub profile @{login}",
            notification_type=NotificationType.SYNC_COMPLETE,
        )
        SyncStatusService.set("github", user_id, "complete", 100)
    except Exception:
        integration.sync_status = "failed"
        db.commit()
        SyncStatusService.set("github", user_id, "failed", 0)
        raise
