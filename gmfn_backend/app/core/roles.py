from fastapi import Depends, HTTPException, status
from app.core.auth import get_current_user
from app.db.models import User

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if getattr(current_user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
