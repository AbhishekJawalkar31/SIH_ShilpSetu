from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.schemas.auth import (
    AuthUser,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services.auth.repository import UserAlreadyExistsError
from app.services.auth.service import (
    AuthService,
    InvalidCredentialsError,
    UserInactiveError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
_service = AuthService()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new artisan or buyer account",
)
async def register(body: UserRegisterRequest) -> TokenResponse:
    try:
        return await _service.register(body)
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": str(exc)},
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during user registration: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred during registration."},
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate credentials and obtain JWT access token",
)
async def login(body: UserLoginRequest) -> TokenResponse:
    try:
        return await _service.login(body)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": str(exc)},
        ) from exc
    except UserInactiveError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_INACTIVE", "message": str(exc)},
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during user login: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred during login."},
        ) from exc


@router.get(
    "/me",
    response_model=AuthUser,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
async def get_me(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Return identity and roles from verified JWT token."""
    return current_user
