from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import DiscussionThread, Post, User, UserRole, Vote
from app.rate_limit import limiter
from app.schemas.common import ApiResponse
from app.schemas.community import (
    PostCreateRequest,
    PostResponse,
    ThreadCreateRequest,
    ThreadDetailResponse,
    ThreadResponse,
    VoteRequest,
)

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/threads", response_model=ApiResponse[list[ThreadResponse]])
def list_threads(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    sort: str = Query(default="new", pattern="^(hot|new|top)$"),
    category: str | None = Query(default=None),
):
    query = db.query(DiscussionThread).filter(DiscussionThread.is_hidden.is_(False))
    if category:
        query = query.filter(DiscussionThread.category == category.upper())
    if sort == "top":
        query = query.order_by(DiscussionThread.score.desc(), DiscussionThread.created_at.desc())
    elif sort == "hot":
        # Simple hotness: score weighted, recent first.
        query = query.order_by(DiscussionThread.score.desc(), DiscussionThread.created_at.desc())
    else:
        query = query.order_by(DiscussionThread.created_at.desc())
    rows = query.limit(100).all()
    return ApiResponse(data=[ThreadResponse.model_validate(r) for r in rows])


@router.post("/threads", response_model=ApiResponse[ThreadResponse])
@limiter.limit("10/minute")
def create_thread(
    request: Request,
    body: ThreadCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    thread = DiscussionThread(author_id=user.id, title=body.title, category=body.category.upper())
    db.add(thread)
    db.flush()
    if body.body:
        db.add(Post(thread_id=thread.id, author_id=user.id, body=body.body))
    db.commit()
    db.refresh(thread)
    return ApiResponse(data=ThreadResponse.model_validate(thread))


@router.get("/threads/{thread_id}", response_model=ApiResponse[ThreadDetailResponse])
def get_thread(
    thread_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
    if not thread or thread.is_hidden:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    payload = ThreadDetailResponse.model_validate(thread)
    payload.posts = [
        PostResponse.model_validate(p)
        for p in sorted(thread.posts, key=lambda x: x.created_at or 0)
        if not p.is_hidden
    ]
    return ApiResponse(data=payload)


@router.post("/threads/{thread_id}/posts", response_model=ApiResponse[PostResponse])
@limiter.limit("20/minute")
def reply(
    request: Request,
    thread_id: str,
    body: PostCreateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
    if not thread or thread.is_hidden:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    post = Post(thread_id=thread_id, author_id=user.id, body=body.body)
    db.add(post)
    db.commit()
    db.refresh(post)
    return ApiResponse(data=PostResponse.model_validate(post))


@router.post("/posts/{post_id}/vote", response_model=ApiResponse[PostResponse])
def vote(
    post_id: str,
    body: VoteRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if body.value not in (1, -1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vote must be +1 or -1")
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = db.query(Vote).filter(Vote.post_id == post_id, Vote.user_id == user.id).first()
    if existing:
        # Idempotent per user: adjust score by the delta of the vote value.
        post.score += body.value - existing.value
        existing.value = body.value
    else:
        db.add(Vote(post_id=post_id, user_id=user.id, value=body.value))
        post.score += body.value
    db.commit()
    db.refresh(post)
    return ApiResponse(data=PostResponse.model_validate(post))


@router.post("/posts/{post_id}/report", response_model=ApiResponse[dict])
def report_post(
    post_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.report_count += 1
    # Auto-hide once a report threshold is crossed; ADMIN can still review.
    if post.report_count >= 5:
        post.is_hidden = True
    db.commit()
    return ApiResponse(data={"reported": True, "report_count": post.report_count}, message="Reported for moderation")


@router.post("/posts/{post_id}/moderate", response_model=ApiResponse[dict])
def moderate_post(
    post_id: str,
    user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
    hide: bool = Query(default=True),
):
    """ADMIN hide/remove content (moderation)."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.is_hidden = hide
    db.commit()
    return ApiResponse(data={"post_id": post_id, "is_hidden": post.is_hidden})
