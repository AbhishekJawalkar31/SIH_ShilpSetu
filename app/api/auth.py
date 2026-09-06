from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from app.schemas.api import AuthUserResponse
from app.services.auth.service import AuthService, AuthenticationError, build_auth_service


router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_auth_service() -> AuthService:
    return build_auth_service()


def get_current_user(
    authorization: str | None = Header(default=None),
    service: AuthService = Depends(get_auth_service),
) -> AuthUserResponse | None:
    try:
        return service.authenticate(authorization)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/me", response_model=AuthUserResponse)
def current_user(
    user: AuthUserResponse | None = Depends(get_current_user),
) -> AuthUserResponse | JSONResponse:
    if user is None:
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "AUTHENTICATION_REQUIRED",
                    "message": "Authentication is required.",
                }
            },
        )
    return user
