import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Event, User, UserRole
from app.rate_limit import limiter
from app.schemas.common import ApiResponse

router = APIRouter(tags=["events"])


class EventItem(BaseModel):
    name: str
    properties: dict | None = None


class EventBatch(BaseModel):
    events: list[EventItem]


@router.post("/events", response_model=ApiResponse[dict])
@limiter.limit("120/minute")
def ingest_events(
    request: Request,
    body: EventBatch,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Ingest a batch of product events (client -> server) into the durable store."""
    count = 0
    for item in body.events[:100]:
        db.add(Event(user_id=user.id, name=item.name[:100], properties=item.properties))
        count += 1
    db.commit()
    return ApiResponse(data={"ingested": count})


@router.get("/admin/analytics/export")
def export_events(
    user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
    format: str = "csv",
):
    """Warehouse export trigger (ADMIN). Streams a CSV of recent events."""
    if format == "summary":
        rows = (
            db.query(Event.name, func.count(Event.id))
            .group_by(Event.name)
            .order_by(func.count(Event.id).desc())
            .all()
        )
        return ApiResponse(data={"counts": {name: count for name, count in rows}})

    events = db.query(Event).order_by(Event.created_at.desc()).limit(10000).all()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["id", "user_id", "org_id", "name", "created_at"])
    for e in events:
        writer.writerow([e.id, e.user_id, e.org_id, e.name, e.created_at.isoformat() if e.created_at else ""])
    return Response(
        content=out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="events-export.csv"'},
    )
