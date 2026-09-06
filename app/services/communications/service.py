from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import httpx

from app.schemas.api import (
    ConversationCreateRequest,
    ConversationResponse,
    MessageCreateRequest,
    MessageResponse,
)


class ConversationService:
    """Conversation boundary; production persistence can use a messages table."""

    def __init__(self) -> None:
        self.conversations: dict[UUID, ConversationResponse] = {}
        self.messages: dict[UUID, list[MessageResponse]] = {}

    def create(self, request: ConversationCreateRequest) -> ConversationResponse:
        conversation = ConversationResponse(
            id=uuid4(),
            participant_ids=request.participant_ids,
            quote_id=request.quote_id,
            created_at=datetime.now(timezone.utc),
        )
        self.conversations[conversation.id] = conversation
        self.messages[conversation.id] = []
        return conversation

    def get(self, conversation_id: UUID) -> ConversationResponse | None:
        return self.conversations.get(conversation_id)

    def send(
        self, conversation_id: UUID, request: MessageCreateRequest
    ) -> MessageResponse | None:
        conversation = self.conversations.get(conversation_id)
        if conversation is None or request.sender_id not in conversation.participant_ids:
            return None
        message = MessageResponse(
            id=uuid4(),
            conversation_id=conversation_id,
            sender_id=request.sender_id,
            body=request.body,
            created_at=datetime.now(timezone.utc),
        )
        self.messages[conversation_id].append(message)
        return message

    def list_messages(self, conversation_id: UUID) -> list[MessageResponse] | None:
        if conversation_id not in self.conversations:
            return None
        return self.messages[conversation_id]


class SupabaseConversationService(ConversationService):
    """PostgREST-backed conversation store.

    Expected tables are ``conversations`` and ``messages`` with the fields
    represented by the API schemas. The in-memory implementation remains the
    local fallback when those tables are not configured.
    """

    def __init__(
        self,
        url: str,
        key: str,
        *,
        client: httpx.Client | None = None,
    ) -> None:
        super().__init__()
        self.client = client or httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )

    def _request(
        self, method: str, table: str, *, params: dict[str, str] | None = None, json=None
    ) -> list[dict]:
        try:
            response = self.client.request(
                method,
                f"/{table}",
                params=params,
                json=json,
                headers={"Prefer": "return=representation"},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError("Conversation persistence failed.") from exc
        data = response.json() if response.content else []
        return data if isinstance(data, list) else [data]

    def create(self, request: ConversationCreateRequest) -> ConversationResponse:
        rows = self._request(
            "POST",
            "conversations",
            json={
                "participant_ids": [str(value) for value in request.participant_ids],
                "quote_id": str(request.quote_id) if request.quote_id else None,
            },
        )
        if not rows:
            raise RuntimeError("Conversation was not persisted.")
        return ConversationResponse.model_validate(rows[0])

    def get(self, conversation_id: UUID) -> ConversationResponse | None:
        rows = self._request(
            "GET",
            "conversations",
            params={"id": f"eq.{conversation_id}", "limit": "1"},
        )
        return ConversationResponse.model_validate(rows[0]) if rows else None

    def send(
        self, conversation_id: UUID, request: MessageCreateRequest
    ) -> MessageResponse | None:
        if self.get(conversation_id) is None:
            return None
        rows = self._request(
            "POST",
            "messages",
            json={
                "conversation_id": str(conversation_id),
                "sender_id": str(request.sender_id),
                "body": request.body,
            },
        )
        return MessageResponse.model_validate(rows[0]) if rows else None

    def list_messages(self, conversation_id: UUID) -> list[MessageResponse] | None:
        if self.get(conversation_id) is None:
            return None
        rows = self._request(
            "GET",
            "messages",
            params={
                "conversation_id": f"eq.{conversation_id}",
                "order": "created_at.asc",
            },
        )
        return [MessageResponse.model_validate(row) for row in rows]