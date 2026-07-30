from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import OrgContext, get_current_user, require_org_roles
from app.models import (
    Drive,
    DriveRound,
    Membership,
    MembershipStatus,
    Organization,
    OrgRole,
)
from app.schemas.common import ApiResponse
from app.schemas.org import (
    DriveCreateRequest,
    DriveResponse,
    DriveRoundCreateRequest,
    ImportResponse,
    InviteRequest,
    MembershipResponse,
    OrgCreateRequest,
    OrgDetailResponse,
    OrgResponse,
)
from app.models import User
from app.services import org as org_service

router = APIRouter(prefix="/org", tags=["org"])

_MANAGE_ROLES = (OrgRole.TPO, OrgRole.ORG_ADMIN)


@router.post("", response_model=ApiResponse[OrgResponse])
def create_org(
    body: OrgCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if db.query(Organization).filter(Organization.slug == body.slug).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already taken")
    org = Organization(**body.model_dump())
    db.add(org)
    db.flush()
    # Founder becomes ORG_ADMIN.
    db.add(
        Membership(
            org_id=org.id,
            user_id=user.id,
            email=user.email,
            org_role=OrgRole.ORG_ADMIN,
            status=MembershipStatus.ACTIVE,
        )
    )
    db.commit()
    db.refresh(org)
    return ApiResponse(data=OrgResponse.model_validate(org), message="Organization created")


@router.get("/{org_id}", response_model=ApiResponse[OrgDetailResponse])
def get_org(
    ctx: Annotated[OrgContext, Depends(require_org_roles())],
    db: Annotated[Session, Depends(get_db)],
):
    used = org_service.seats_used(db, ctx.org.id)
    payload = OrgDetailResponse.model_validate(ctx.org)
    payload.seats_used = used
    payload.seats_available = max(0, ctx.org.seat_limit - used)
    return ApiResponse(data=payload)


def _bulk_invite(db: Session, org: Organization, body: InviteRequest) -> ImportResponse:
    rows: list[dict] = []
    errors: list[dict] = []
    if body.csv:
        rows, errors = org_service.parse_member_csv(body.csv)
    if body.members:
        rows.extend([m.model_dump(exclude_none=True) for m in body.members])
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No members provided")

    invited = 0
    skipped = 0
    for row in rows:
        if org_service.seats_used(db, org.id) >= org.seat_limit:
            errors.append({"email": row.get("email"), "error": "seat limit reached"})
            skipped += 1
            continue
        org_service.upsert_invite(db, org.id, row)
        invited += 1
    db.commit()
    used = org_service.seats_used(db, org.id)
    return ImportResponse(
        invited=invited, skipped=skipped, seats_used=used, seat_limit=org.seat_limit, errors=errors
    )


@router.post("/{org_id}/members/invite", response_model=ApiResponse[ImportResponse])
def invite_members(
    body: InviteRequest,
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=_bulk_invite(db, ctx.org, body))


@router.post("/{org_id}/members/import", response_model=ApiResponse[ImportResponse])
def import_members(
    body: InviteRequest,
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=_bulk_invite(db, ctx.org, body))


@router.get("/{org_id}/members", response_model=ApiResponse[list[MembershipResponse]])
def list_members(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Membership).filter(Membership.org_id == ctx.org.id).all()
    return ApiResponse(data=[MembershipResponse.model_validate(r) for r in rows])


@router.delete("/{org_id}/members/{member_user_id}", response_model=ApiResponse[dict])
def remove_member(
    member_user_id: str,
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    membership = (
        db.query(Membership)
        .filter(Membership.org_id == ctx.org.id, Membership.user_id == member_user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    membership.status = MembershipStatus.REMOVED
    db.commit()
    return ApiResponse(data={"removed": True})


# --- Cohort analytics -------------------------------------------------------


@router.get("/{org_id}/analytics/readiness", response_model=ApiResponse[dict])
def analytics_readiness(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=org_service.cohort_readiness(db, ctx.org.id))


@router.get("/{org_id}/analytics/at-risk", response_model=ApiResponse[list[dict]])
def analytics_at_risk(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=org_service.at_risk_students(db, ctx.org.id))


@router.get("/{org_id}/analytics/funnel", response_model=ApiResponse[dict])
def analytics_funnel(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=org_service.placement_funnel(db, ctx.org.id))


# --- Drives (TPO management) ------------------------------------------------


@router.post("/{org_id}/drives", response_model=ApiResponse[DriveResponse])
def create_drive(
    body: DriveCreateRequest,
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    drive = Drive(org_id=ctx.org.id, **body.model_dump())
    db.add(drive)
    db.commit()
    db.refresh(drive)
    return ApiResponse(data=DriveResponse.model_validate(drive))


@router.get("/{org_id}/drives", response_model=ApiResponse[list[DriveResponse]])
def list_org_drives(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    rows = db.query(Drive).filter(Drive.org_id == ctx.org.id).order_by(Drive.created_at.desc()).all()
    return ApiResponse(data=[DriveResponse.model_validate(r) for r in rows])


@router.post("/{org_id}/drives/{drive_id}/rounds", response_model=ApiResponse[DriveResponse])
def add_round(
    drive_id: str,
    body: DriveRoundCreateRequest,
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    drive = db.query(Drive).filter(Drive.id == drive_id, Drive.org_id == ctx.org.id).first()
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found")
    db.add(DriveRound(drive_id=drive.id, **body.model_dump()))
    db.commit()
    db.refresh(drive)
    return ApiResponse(data=DriveResponse.model_validate(drive))


# --- Reporting & exports ----------------------------------------------------


@router.get("/{org_id}/reports/placement", response_model=ApiResponse[dict])
def placement_report(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
):
    return ApiResponse(data=org_service.placement_report(db, ctx.org.id))


@router.get("/{org_id}/reports/export")
def export_report(
    ctx: Annotated[OrgContext, Depends(require_org_roles(*_MANAGE_ROLES))],
    db: Annotated[Session, Depends(get_db)],
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
):
    report = org_service.placement_report(db, ctx.org.id)
    if format == "pdf":
        content = org_service.report_to_pdf(ctx.org.name, report)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{ctx.org.slug}-placement.pdf"'},
        )
    csv_text = org_service.report_to_csv(report)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{ctx.org.slug}-placement.csv"'},
    )


@router.post("/auto-join", response_model=ApiResponse[dict])
def auto_join(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Domain-based auto-join: attaches the user to a matching verified-domain org."""
    membership = org_service.domain_auto_join(db, user)
    if not membership:
        return ApiResponse(data={"joined": False}, message="No matching organization domain")
    return ApiResponse(
        data={"joined": True, "org_id": membership.org_id, "org_role": membership.org_role.value}
    )
