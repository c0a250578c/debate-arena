"""
Auth layer: Clerk JWT verification + Local JWT fallback for DEV_MODE.
"""
import os
import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException, status

from db import session_scope, get_or_create_user, User

logger = logging.getLogger("debate-arena.auth")

import base64

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "").strip()
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me").strip()
JWT_ALGO = "HS256"
JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "168"))

DEBUG_LOGS = []

def add_debug_log(message: str):
    global DEBUG_LOGS
    DEBUG_LOGS.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": message
    })
    if len(DEBUG_LOGS) > 100:
        DEBUG_LOGS.pop(0)


def resolve_jwks_url_from_publishable_key(pub_key: str) -> str | None:
    try:
        if not pub_key or not pub_key.startswith("pk_"):
            return None
        b64_part = pub_key.split('_')[-1].rstrip('$')
        missing_padding = len(b64_part) % 4
        if missing_padding:
            b64_part += '=' * (4 - missing_padding)
        domain = base64.b64decode(b64_part).decode('utf-8')
        return f"https://{domain}/.well-known/jwks.json"
    except Exception as e:
        logger.error("Failed to parse Clerk publishable key for JWKS: %s", e)
        return None

# CLERK_JWKS_URLが設定されていない、あるいは古いエンドポイントの場合、Publishable Keyから自動解決を試みる
if not CLERK_JWKS_URL or "api.clerk.com" in CLERK_JWKS_URL:
    pub_key = (os.getenv("CLERK_PUBLISHABLE_KEY") or os.getenv("VITE_CLERK_PUBLISHABLE_KEY") or "").strip()
    resolved = resolve_jwks_url_from_publishable_key(pub_key)
    if resolved:
        logger.info("Automatically resolved CLERK_JWKS_URL: %s", resolved)
        CLERK_JWKS_URL = resolved.strip()

# Clerkの鍵セットのURLが未指定であれば、開発モード（ローカルJWT / ダミー認証許可）
DEV_MODE = not CLERK_JWKS_URL

# PyJWTのJWKClientを初期化（キャッシュなどを自動で行ってくれる）
jwks_client = jwt.PyJWKClient(CLERK_JWKS_URL) if CLERK_JWKS_URL else None


def decode_clerk_jwt(token: str) -> dict:
    """
    Verify and decode Clerk JWT using JWKS.
    """
    if DEV_MODE:
        # 万が一DEV_MODEの時に呼び出された場合のダミー返却
        if token.startswith("dev-"):
            email = token[len("dev-"):] or "dev@example.com"
            return {
                "sub": f"dev-sub-{email}",
                "email": email,
                "name": email.split("@")[0],
            }
        return {
            "sub": "dev-sub-default",
            "email": "dev@example.com",
            "name": "DevUser",
        }

    try:
        # トークンから適切な公開鍵を取得
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        # RS256でデコード・検証（audおよびiss検証はフロントとの整合性維持のため省略、時刻ズレ対策でleewayを設定）
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,
                "verify_iss": False
            },
            leeway=120
        )
        return payload
    except jwt.ExpiredSignatureError as e:
        add_debug_log(f"JWT ExpiredSignatureError: {str(e)}")
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        add_debug_log(f"JWT decode failed: {type(e).__name__}: {str(e)}\n{tb}")
        logger.warning("Clerk token verify failed: %s: %s", type(e).__name__, e)
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def verify_google_id_token(token: str) -> dict:
    """
    Dummy/Dev token verification (original Google verification removed in favor of Clerk).
    Only accepts 'dev-<email>' style tokens.
    """
    if token.startswith("dev-"):
        email = token[len("dev-"):] or "dev@example.com"
        return {
            "sub": f"dev-sub-{email}",
            "email": email,
            "name": email.split("@")[0],
            "picture": None,
        }
    raise HTTPException(status_code=400, detail="Real Google ID Token verification is disabled. Please configure Clerk.")


def issue_jwt(user_id: int, email: str) -> str:
    """Issue a local JWT for development mode."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRES_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_jwt(token: str) -> dict:
    """Decode a local JWT for development mode."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def current_user(authorization: str | None = Header(default=None)) -> User:
    """FastAPI dependency: extract user from Bearer Token (Clerk Token or local JWT)."""
    if not authorization:
        add_debug_log("current_user: Missing Authorization header")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    
    token_parts = authorization.split(" ", 1)
    if len(token_parts) < 2 or token_parts[0].lower() != "bearer":
        add_debug_log(f"current_user: Invalid Authorization format: {authorization[:20]}...")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header format")
        
    token = token_parts[1].strip()
    add_debug_log(f"current_user: Token received (length={len(token)}, prefix={token[:15]}...)")

    if DEV_MODE:
        # 開発モード: ローカルJWTまたは直接のdev-ダミートークンを受け入れる
        try:
            payload = decode_jwt(token)
            user_id = int(payload["sub"])
            with session_scope() as s:
                user = s.query(User).filter_by(id=user_id).one_or_none()
                if not user:
                    raise HTTPException(status_code=401, detail="User not found")
                s.expunge(user)
                return user
        except HTTPException:
            # dev-トークンが直接ヘッダーに渡された場合の自動ログイン用フォールバック
            if token.startswith("dev-"):
                email = token[len("dev-"):] or "dev@example.com"
                with session_scope() as s:
                    user = get_or_create_user(
                        s,
                        google_sub=f"dev-sub-{email}",
                        email=email,
                        name=email.split("@")[0],
                    )
                    s.flush()
                    s.expunge(user)
                    return user
            raise
    else:
        # Clerk有効化モード: ClerkのJWTを検証
        payload = decode_clerk_jwt(token)
        clerk_sub = payload["sub"]
        email = payload.get("email") or ""
        
        # もしトークン内にemail情報が入っていない場合、デフォルト値を作成
        if not email:
            email = f"{clerk_sub}@clerk.local"
            
        name = payload.get("name") or email.split("@")[0] or "Clerk User"
        picture = payload.get("picture")

        with session_scope() as s:
            user = get_or_create_user(
                s,
                google_sub=clerk_sub,  # google_subカラムにClerkのsubを入れる
                email=email,
                name=name,
                picture=picture,
            )
            s.flush()
            s.expunge(user)
            return user


def login_with_google(google_id_token_str: str) -> tuple[str, User]:
    """Verify Google ID token (dev-only), upsert user, issue local JWT."""
    info = verify_google_id_token(google_id_token_str)
    with session_scope() as s:
        user = get_or_create_user(
            s,
            google_sub=info["sub"],
            email=info.get("email", ""),
            name=info.get("name"),
            picture=info.get("picture"),
        )
        s.flush()
        token = issue_jwt(user.id, user.email)
        s.expunge(user)
        return token, user
