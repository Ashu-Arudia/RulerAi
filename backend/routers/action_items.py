from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db, Meeting, ActionItem
from models import ActionItemCreate, ActionItemUpdate

router = APIRouter(prefix="/action-items", tags=["action-items"])


def _get_scoped_meeting(db: Session, meeting_id: int, user_id: Optional[str]):
    query = db.query(Meeting).filter(Meeting.id == meeting_id)
    if user_id:
        query = query.filter(Meeting.user_id == user_id)
    else:
        query = query.filter(Meeting.user_id == None)  # noqa: E711
    return query.first()


@router.get("/meeting/{meeting_id}", response_model=List[dict])
def get_action_items(
    meeting_id: int,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    meeting = _get_scoped_meeting(db, meeting_id, x_user_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    items = (
        db.query(ActionItem)
        .filter(ActionItem.meeting_id == meeting_id)
        .order_by(ActionItem.created_at)
        .all()
    )
    return [_item_out(item) for item in items]


@router.post("/meeting/{meeting_id}", response_model=dict, status_code=201)
def create_action_item(
    meeting_id: int,
    data: ActionItemCreate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    meeting = _get_scoped_meeting(db, meeting_id, x_user_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    item = ActionItem(
        meeting_id=meeting_id,
        text=data.text,
        assignee=data.assignee,
        due_date=data.due_date,
        completed=data.completed,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.put("/{item_id}", response_model=dict)
def update_action_item(
    item_id: int,
    data: ActionItemUpdate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    # Verify the meeting belongs to the right scope
    meeting = _get_scoped_meeting(db, item.meeting_id, x_user_id)
    if not meeting:
        raise HTTPException(status_code=403, detail="Forbidden")

    if data.text is not None:
        item.text = data.text
    if data.assignee is not None:
        item.assignee = data.assignee
    if data.due_date is not None:
        item.due_date = data.due_date
    if data.completed is not None:
        item.completed = data.completed

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.delete("/{item_id}", status_code=204)
def delete_action_item(
    item_id: int,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    meeting = _get_scoped_meeting(db, item.meeting_id, x_user_id)
    if not meeting:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(item)
    db.commit()


def _item_out(item: ActionItem) -> dict:
    return {
        "id": item.id,
        "meeting_id": item.meeting_id,
        "text": item.text,
        "assignee": item.assignee,
        "due_date": item.due_date,
        "completed": item.completed,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }
