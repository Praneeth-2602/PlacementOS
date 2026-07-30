"""Feature-gating / entitlement resolution (Phase 9).

Entitlements are resolved from the caller's active ``Subscription`` (personal
or via an org they belong to). When no active subscription exists the user
receives the default free entitlements. Centralising this here keeps the
feature-gating dependency in ``deps.py`` thin and default-deny safe.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Membership, MembershipStatus, Subscription, SubscriptionStatus

FREE_ENTITLEMENTS: dict = {
    "tier": "free",
    "pro_ai": False,
    "unlimited_practice": False,
    "study_plan": False,
    "resume_rewrite": False,
    "recommendations": True,
    "max_daily_submissions": 20,
}

_ACTIVE_STATUSES = (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING)


def _merge(base: dict, override: dict | None) -> dict:
    merged = dict(base)
    if override:
        merged.update(override)
    return merged


def resolve_entitlements(db: Session, user_id: str) -> dict:
    """Return the effective entitlements dict for a user."""
    personal = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status.in_(_ACTIVE_STATUSES))
        .order_by(Subscription.updated_at.desc())
        .first()
    )
    if personal and personal.plan:
        return _merge(FREE_ENTITLEMENTS, personal.plan.entitlements)

    # Institutional per-seat: any org the user actively belongs to with an active sub.
    org_ids = [
        m.org_id
        for m in db.query(Membership)
        .filter(Membership.user_id == user_id, Membership.status == MembershipStatus.ACTIVE)
        .all()
    ]
    if org_ids:
        org_sub = (
            db.query(Subscription)
            .filter(Subscription.org_id.in_(org_ids), Subscription.status.in_(_ACTIVE_STATUSES))
            .order_by(Subscription.updated_at.desc())
            .first()
        )
        if org_sub and org_sub.plan:
            return _merge(FREE_ENTITLEMENTS, org_sub.plan.entitlements)

    return dict(FREE_ENTITLEMENTS)


def has_entitlement(db: Session, user_id: str, key: str) -> bool:
    return bool(resolve_entitlements(db, user_id).get(key))
