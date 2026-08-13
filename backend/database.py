from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./fireflies.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    """Authenticated Google users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    picture = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    # NULL = demo data (shared, seeded). A google_id = owned by that user.
    user_id = Column(String(100), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    date = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, default=0)
    host = Column(String(100), nullable=False)
    participants = Column(Text, default="[]")  # JSON array
    status = Column(String(50), default="completed")  # completed, processing, failed
    audio_url = Column(String(500), nullable=True)
    thumbnail_color = Column(String(20), default="#6938ef")
    channel = Column(String(100), default="My Meetings")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transcript_lines = relationship("TranscriptLine", back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptLine.start_time")
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    tags = relationship("MeetingTag", back_populates="meeting", cascade="all, delete-orphan")


class TranscriptLine(Base):
    __tablename__ = "transcript_lines"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    speaker = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    start_time = Column(Float, nullable=False)  # seconds
    end_time = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="transcript_lines")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, unique=True)
    overview = Column(Text, nullable=False)
    key_topics = Column(Text, default="[]")     # JSON array of strings
    chapters = Column(Text, default="[]")        # JSON array of {title, timestamp, description}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="summary")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    text = Column(Text, nullable=False)
    assignee = Column(String(100), nullable=True)
    due_date = Column(String(50), nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="action_items")


class MeetingTag(Base):
    __tablename__ = "meeting_tags"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    tag = Column(String(100), nullable=False)

    meeting = relationship("Meeting", back_populates="tags")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
    _migrate_add_user_id_column()


def _migrate_add_user_id_column():
    """Safely add user_id column to meetings if it doesn't exist (SQLite migration)."""
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    columns = [c["name"] for c in insp.get_columns("meetings")]
    if "user_id" not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN user_id VARCHAR(100) NULL"))
            conn.commit()
