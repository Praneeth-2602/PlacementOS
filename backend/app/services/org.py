"""Organization / multi-tenancy helpers (Phase 8).

Isolation model: **shared schema + org_id scoping**. Every tenant query must be
filtered by ``org_id`` (see ``deps.require_org_roles`` for the auth boundary).
Trade-off vs schema-per-tenant: simpler ops, but a missed filter leaks data, so
scoping is centralised here and enforced by authorization tests.
"""

from __future__ import annotations

import csv
import io
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import (
    Drive,
    Membership,
    MembershipStatus,
    Opportunity,
    OpportunityStatus,
    Organization,
    OrgRole,
    ReadinessScore,
    User,
)

INVITE_TTL_DAYS = 14


def active_member_ids(db: Session, org_id: str) -> list[str]:
    return [
        m.user_id
        for m in db.query(Membership)
        .filter(
            Membership.org_id == org_id,
            Membership.status == MembershipStatus.ACTIVE,
            Membership.user_id.is_not(None),
        )
        .all()
    ]


def seats_used(db: Session, org_id: str) -> int:
    return (
        db.query(Membership)
        .filter(
            Membership.org_id == org_id,
            Membership.status.in_([MembershipStatus.ACTIVE, MembershipStatus.PENDING]),
        )
        .count()
    )


def parse_member_csv(text: str) -> tuple[list[dict], list[dict]]:
    """Parse a member CSV into (valid_rows, errors). Columns: email, branch, graduation_year, cgpa."""
    valid: list[dict] = []
    errors: list[dict] = []
    reader = csv.DictReader(io.StringIO(text))
    for i, raw in enumerate(reader, start=1):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        email = row.get("email")
        if not email or "@" not in email:
            errors.append({"row": i, "error": "invalid or missing email", "data": row})
            continue
        entry: dict = {"email": email.lower(), "branch": row.get("branch") or None}
        year = row.get("graduation_year") or row.get("grad_year")
        if year:
            try:
                entry["graduation_year"] = int(year)
            except ValueError:
                errors.append({"row": i, "error": "invalid graduation_year", "data": row})
                continue
        cgpa = row.get("cgpa")
        if cgpa:
            try:
                entry["cgpa"] = float(cgpa)
            except ValueError:
                entry["cgpa"] = None
        valid.append(entry)
    return valid, errors


def upsert_invite(db: Session, org_id: str, row: dict) -> Membership:
    """Idempotent upsert on (org_id, email). Links user_id if the email exists."""
    membership = (
        db.query(Membership)
        .filter(Membership.org_id == org_id, Membership.email == row["email"])
        .first()
    )
    user = db.query(User).filter(User.email == row["email"]).first()
    if not membership:
        membership = Membership(org_id=org_id, email=row["email"], org_role=OrgRole.STUDENT)
        db.add(membership)
    membership.branch = row.get("branch", membership.branch)
    membership.graduation_year = row.get("graduation_year", membership.graduation_year)
    membership.cgpa = row.get("cgpa", membership.cgpa)
    membership.invite_expires_at = datetime.now(UTC) + timedelta(days=INVITE_TTL_DAYS)
    if user:
        membership.user_id = user.id
        # Existing users auto-activate; keep readiness org-scoped for analytics.
        membership.status = MembershipStatus.ACTIVE
        _tag_readiness_org(db, user.id, org_id)
    else:
        membership.status = MembershipStatus.PENDING
    return membership


def _tag_readiness_org(db: Session, user_id: str, org_id: str) -> None:
    score = db.query(ReadinessScore).filter(ReadinessScore.user_id == user_id).first()
    if score:
        score.org_id = org_id


def domain_auto_join(db: Session, user: User) -> Membership | None:
    """Attach a user to an org whose verified domain matches their email."""
    if not user.email or "@" not in user.email:
        return None
    domain = user.email.split("@", 1)[1].lower()
    orgs = db.query(Organization).all()
    for org in orgs:
        domains = [d.lower() for d in (org.verified_domains or [])]
        if domain in domains:
            existing = (
                db.query(Membership)
                .filter(Membership.org_id == org.id, Membership.user_id == user.id)
                .first()
            )
            if existing:
                return existing
            membership = Membership(
                org_id=org.id,
                user_id=user.id,
                email=user.email.lower(),
                org_role=OrgRole.STUDENT,
                status=MembershipStatus.ACTIVE,
            )
            db.add(membership)
            _tag_readiness_org(db, user.id, org.id)
            db.commit()
            db.refresh(membership)
            return membership
    return None


def is_eligible(drive: Drive, membership: Membership) -> bool:
    rules = drive.eligibility or {}
    branches = rules.get("branches")
    if branches and membership.branch not in branches:
        return False
    min_cgpa = rules.get("min_cgpa")
    if min_cgpa is not None and (membership.cgpa is None or membership.cgpa < float(min_cgpa)):
        return False
    grad_years = rules.get("graduation_years")
    if grad_years and membership.graduation_year not in grad_years:
        return False
    return True


def cohort_readiness(db: Session, org_id: str) -> dict:
    member_ids = active_member_ids(db, org_id)
    scores = (
        db.query(ReadinessScore).filter(ReadinessScore.user_id.in_(member_ids)).all() if member_ids else []
    )
    if not scores:
        return {"cohort_size": len(member_ids), "scored": 0, "average": 0.0, "distribution": {}}
    overall = [s.overall_score for s in scores]
    buckets = {"0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    for v in overall:
        if v < 40:
            buckets["0-40"] += 1
        elif v < 60:
            buckets["40-60"] += 1
        elif v < 80:
            buckets["60-80"] += 1
        else:
            buckets["80-100"] += 1
    return {
        "cohort_size": len(member_ids),
        "scored": len(scores),
        "average": round(sum(overall) / len(overall), 1),
        "distribution": buckets,
    }


def at_risk_students(db: Session, org_id: str, threshold: float = 45.0) -> list[dict]:
    member_ids = active_member_ids(db, org_id)
    if not member_ids:
        return []
    rows = (
        db.query(ReadinessScore, User)
        .join(User, User.id == ReadinessScore.user_id)
        .filter(ReadinessScore.user_id.in_(member_ids), ReadinessScore.overall_score < threshold)
        .all()
    )
    return [
        {"user_id": u.id, "name": u.name, "email": u.email, "overall_score": s.overall_score}
        for s, u in rows
    ]


def placement_funnel(db: Session, org_id: str) -> dict:
    """Applied -> shortlisted -> interviewed -> offered, from org members' opportunities."""
    member_ids = active_member_ids(db, org_id)
    if not member_ids:
        return {"applied": 0, "shortlisted": 0, "interviewed": 0, "offered": 0}
    opps = db.query(Opportunity).filter(Opportunity.user_id.in_(member_ids)).all()
    applied = sum(1 for o in opps if o.status != OpportunityStatus.TRACKING)
    shortlisted = sum(1 for o in opps if o.status in (OpportunityStatus.OA_SCHEDULED, OpportunityStatus.INTERVIEW_SCHEDULED, OpportunityStatus.OFFERED, OpportunityStatus.ACCEPTED))
    interviewed = sum(1 for o in opps if o.status in (OpportunityStatus.INTERVIEW_SCHEDULED, OpportunityStatus.OFFERED, OpportunityStatus.ACCEPTED))
    offered = sum(1 for o in opps if o.status in (OpportunityStatus.OFFERED, OpportunityStatus.ACCEPTED))
    return {"applied": applied, "shortlisted": shortlisted, "interviewed": interviewed, "offered": offered}


def placement_report(db: Session, org_id: str) -> dict:
    member_ids = active_member_ids(db, org_id)
    memberships = (
        db.query(Membership).filter(Membership.org_id == org_id, Membership.user_id.is_not(None)).all()
        if member_ids
        else []
    )
    opps = db.query(Opportunity).filter(Opportunity.user_id.in_(member_ids)).all() if member_ids else []
    offered_user_ids = {o.user_id for o in opps if o.status in (OpportunityStatus.OFFERED, OpportunityStatus.ACCEPTED)}

    by_branch: dict[str, dict] = {}
    by_year: dict[str, dict] = {}
    for m in memberships:
        b = by_branch.setdefault(m.branch or "Unknown", {"total": 0, "placed": 0})
        b["total"] += 1
        if m.user_id in offered_user_ids:
            b["placed"] += 1
        y = by_year.setdefault(str(m.graduation_year or "Unknown"), {"total": 0, "placed": 0})
        y["total"] += 1
        if m.user_id in offered_user_ids:
            y["placed"] += 1

    total = len(member_ids)
    placed = len(offered_user_ids)
    return {
        "total_students": total,
        "offers": placed,
        "placement_percent": round((placed / total) * 100, 1) if total else 0.0,
        "by_branch": by_branch,
        "by_year": by_year,
    }


def report_to_csv(report: dict) -> str:
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["metric", "value"])
    writer.writerow(["total_students", report["total_students"]])
    writer.writerow(["offers", report["offers"]])
    writer.writerow(["placement_percent", report["placement_percent"]])
    writer.writerow([])
    writer.writerow(["branch", "total", "placed"])
    for branch, data in report["by_branch"].items():
        writer.writerow([branch, data["total"], data["placed"]])
    writer.writerow([])
    writer.writerow(["graduation_year", "total", "placed"])
    for year, data in report["by_year"].items():
        writer.writerow([year, data["total"], data["placed"]])
    return out.getvalue()


def report_to_pdf(org_name: str, report: dict) -> bytes:
    """Render a simple placement-report PDF via reportlab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 60
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, f"Placement Report — {org_name}")
    y -= 30
    pdf.setFont("Helvetica", 11)
    for label, key in (("Total students", "total_students"), ("Offers", "offers"), ("Placement %", "placement_percent")):
        pdf.drawString(50, y, f"{label}: {report[key]}")
        y -= 18
    y -= 10
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "By branch")
    y -= 18
    pdf.setFont("Helvetica", 10)
    for branch, data in report["by_branch"].items():
        pdf.drawString(60, y, f"{branch}: {data['placed']}/{data['total']} placed")
        y -= 14
        if y < 60:
            pdf.showPage()
            y = height - 60
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
