from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.schemas.api import (
    ConversationCreateRequest,
    ConversationResponse,
    MessageCreateRequest,
    MessageResponse,
)
from app.services.communications.service import ConversationService


router = APIRouter(prefix="/api/conversations", tags=["communications"])


def get_conversation_service() -> ConversationService:
    raise RuntimeError("Conversation service has not been configured.")


def not_found(code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": {"code": code, "message": message}},
    )


@router.post("", response_model=ConversationResponse, status_code=201)
def create_conversation(
    request: ConversationCreateRequest,
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationResponse:
    return service.create(request)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: UUID,
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationResponse | JSONResponse:
    conversation = service.get(conversation_id)
    return conversation or not_found(
        "CONVERSATION_NOT_FOUND", "Conversation was not found."
    )


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=201)
def send_message(
    conversation_id: UUID,
    request: MessageCreateRequest,
    service: ConversationService = Depends(get_conversation_service),
) -> MessageResponse | JSONResponse:
    message = service.send(conversation_id, request)
    return message or not_found(
        "MESSAGE_NOT_ALLOWED", "Conversation was not found or sender is not a participant."
    )


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: UUID,
    service: ConversationService = Depends(get_conversation_service),
) -> list[MessageResponse] | JSONResponse:
    messages = service.list_messages(conversation_id)
    return messages if messages is not None else not_found(
        "CONVERSATION_NOT_FOUND", "Conversation was not found."
    )