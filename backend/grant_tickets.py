"""Grant tickets to redteam user directly via DB for autonomous testing."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from db import session_scope, User

EMAIL = "redteam@example.com"

with session_scope() as s:
    u = s.query(User).filter(User.email == EMAIL).first()
    if u is None:
        print(f"user {EMAIL} not found; log in first via API to create")
        sys.exit(1)
    u.ticket_balance = 500
    print(f"ticket_balance set to {u.ticket_balance} for user_id={u.id}")
