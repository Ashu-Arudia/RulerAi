"""
Users router — upsert Google user on first login, fetch profile.
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from database import get_db, User

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/upsert", response_model=dict)
def upsert_user(
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Called by the frontend after Google OAuth succeeds.
    Body: { google_id, email, name, picture }
    """
    google_id = body.get("google_id")
    if not google_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="google_id required")

    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        user.email = body.get("email", user.email)
        user.name = body.get("name", user.name)
        user.picture = body.get("picture", user.picture)
        user.updated_at = datetime.utcnow()
    else:
        user = User(
            google_id=google_id,
            email=body.get("email", ""),
            name=body.get("name"),
            picture=body.get("picture"),
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.get("/me", response_model=dict)
def get_me(
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not x_user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(User).filter(User.google_id == x_user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    return _user_out(user)


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "google_id": user.google_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "created_at": user.created_at,
    }
