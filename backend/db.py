"""
SQLite database layer for DEBATE ARENA.
- users: Google SSOで認証されたユーザー
- tickets: ユーザーごとのチケット残高（users.ticket_balance に集約）
- purchases: Webhook経由で記録される購入履歴（冪等性のため purchase_id を一意に）
- consumptions: チケット消費履歴（監査用）
"""
import os
import logging
from datetime import datetime, timezone
from contextlib import contextmanager

from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, text, Boolean
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

logger = logging.getLogger("debate-arena.db")

# --- DBパスの動的設定 ---
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "arena.db")
DB_PATH = os.getenv("SQLITE_DB_PATH", DEFAULT_DB_PATH)

# 親ディレクトリが存在しない場合は自動作成（Renderの永続ディスクマウント用）
db_dir = os.path.dirname(DB_PATH)
use_fallback = False

if db_dir:
    try:
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        # Test write capability in target database directory
        test_file = os.path.join(db_dir, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
    except Exception as e:
        logger.error("Database directory %s is not writeable: %s. Falling back to default path.", db_dir, e)
        use_fallback = True

if use_fallback:
    DB_PATH = DEFAULT_DB_PATH
    logger.info("Using fallback database path: %s", DB_PATH)

DB_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def _utcnow():
    return datetime.now(timezone.utc)


def is_user_premium(user: 'User') -> bool:
    """プレミアム会員かつ有効期限内であるか判定"""
    if not user.is_premium:
        return False
    if user.premium_until is None:
        return True # 無期限（通常ありえないが）
    
    now = _utcnow()
    # タイムゾーン考慮
    until = user.premium_until
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
        
    return until > now


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    google_sub = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=False)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    ticket_balance = Column(Integer, nullable=False, default=0)
    last_ticket_reset = Column(DateTime(timezone=True), default=_utcnow)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    
    # Premium fields
    is_premium = Column(Boolean, default=False)
    premium_until = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id = Column(String, nullable=True)

    purchases = relationship("Purchase", back_populates="user")
    consumptions = relationship("Consumption", back_populates="user")
    battles = relationship("Battle", back_populates="user", cascade="all, delete-orphan")


class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    purchase_id = Column(String, nullable=False, unique=True)  # 外部サイトの注文ID（冪等化キー）
    tickets = Column(Integer, nullable=False)
    amount_jpy = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="purchases")

    __table_args__ = (UniqueConstraint("purchase_id", name="uq_purchase_id"),)


class Consumption(Base):
    __tablename__ = "consumptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String, nullable=False)  # "battle_start"
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="consumptions")


class Battle(Base):
    __tablename__ = "battles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    character_id = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    result = Column(String, nullable=True) # win, lose, draw, leak_blocked, etc
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="battles")
    turns = relationship(
        "BattleTurn",
        back_populates="battle",
        order_by="BattleTurn.turn_index",
        cascade="all, delete-orphan",
    )


class BattleTurn(Base):
    __tablename__ = "battle_turns"
    id = Column(Integer, primary_key=True)
    battle_id = Column(Integer, ForeignKey("battles.id"), nullable=False, index=True)
    turn_index = Column(Integer, nullable=False)
    role = Column(String, nullable=False)  # user or model
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    battle = relationship("Battle", back_populates="turns")


def init_db():
    Base.metadata.create_all(engine)
    # Migration for newly added columns
    try:
        with engine.begin() as conn:
            for col, type_ in [
                ("is_premium", "BOOLEAN DEFAULT 0"),
                ("premium_until", "DATETIME"),
                ("stripe_customer_id", "TEXT"),
                ("last_ticket_reset", "DATETIME")
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {type_}"))
                except Exception:
                    pass  # Column already exists
    except Exception as e:
        logger.warning("Migration during init_db had issues (normal if DB is fresh): %s", e)
    
    logger.info("DB initialized at %s", DB_PATH)


@contextmanager
def session_scope():
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


# --- Domain helpers ---

INITIAL_FREE_TICKETS = int(os.getenv("INITIAL_FREE_TICKETS", "6"))


def get_or_create_user(s, google_sub: str, email: str, name: str | None, picture: str | None) -> User:
    user = s.query(User).filter_by(google_sub=google_sub).one_or_none()
    if user:
        # Refresh profile info on each login
        user.email = email
        if name:
            user.name = name
        if picture:
            user.picture = picture
            
        # Ticket daily reset logic (24 hours)
        now = _utcnow()
        if user.last_ticket_reset is None:
            user.last_ticket_reset = now
            
        # もし前回のリセットから24時間以上経過しているか、現在のチケットが設定値より少ないならリセット
        delta = now - user.last_ticket_reset.replace(tzinfo=timezone.utc)
        if delta.total_seconds() >= 24 * 3600 or user.ticket_balance < INITIAL_FREE_TICKETS:
            if user.ticket_balance < INITIAL_FREE_TICKETS:
                user.ticket_balance = INITIAL_FREE_TICKETS
                logger.info("User %s tickets reset to %d", user.id, INITIAL_FREE_TICKETS)
            user.last_ticket_reset = now
            
        return user
    user = User(
        google_sub=google_sub,
        email=email,
        name=name,
        picture=picture,
        ticket_balance=INITIAL_FREE_TICKETS,
        last_ticket_reset=_utcnow(),
    )
    s.add(user)
    s.flush()
    logger.info("New user created: id=%s email=%s free_tickets=%d", user.id, email, INITIAL_FREE_TICKETS)
    return user


def consume_ticket(s, user_id: int, reason: str = "battle_start") -> bool:
    """Atomically consume 1 ticket. Returns True if consumed, False if no balance."""
    user = s.query(User).filter_by(id=user_id).with_for_update().one_or_none()
    if not user or user.ticket_balance <= 0:
        return False
    user.ticket_balance -= 1
    s.add(Consumption(user_id=user_id, reason=reason))
    return True


def add_tickets_idempotent(s, user_id: int, purchase_id: str, tickets: int, amount_jpy: int | None) -> bool:
    """Add tickets via a purchase. Returns False if purchase_id was already processed."""
    existing = s.query(Purchase).filter_by(purchase_id=purchase_id).one_or_none()
    if existing:
        return False
    user = s.query(User).filter_by(id=user_id).with_for_update().one_or_none()
    if not user:
        return False
    user.ticket_balance += tickets
    s.add(Purchase(
        user_id=user_id,
        purchase_id=purchase_id,
        tickets=tickets,
        amount_jpy=amount_jpy,
    ))
    return True
