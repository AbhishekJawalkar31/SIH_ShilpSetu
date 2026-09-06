from __future__ import annotations

from typing import Protocol
from uuid import UUID, uuid4

import httpx

from app.core.config import settings
from app.schemas.api import NotificationRequest, NotificationResponse


class NotificationProvider(Protocol):
    channel: str
    provider_name: str

    def send(self, request: NotificationRequest) -> NotificationResponse: ...


class LocalNotificationProvider:
    def __init__(self, channel: str):
        self.channel = channel
        self.provider_name = "local-queued"

    def send(self, request: NotificationRequest) -> NotificationResponse:
        return NotificationResponse(
            id=uuid4(),
            channel=request.channel,
            status="queued",
            provider=self.provider_name,
        )


class TwilioNotificationProvider:
    """Twilio SMS and WhatsApp adapter with server-side credentials."""

    def __init__(
        self,
        channel: str,
        account_sid: str,
        auth_token: str,
        from_number: str,
        *,
        client: httpx.Client | None = None,
    ) -> None:
        self.channel = channel
        self.provider_name = "twilio"
        self.account_sid = account_sid
        self.from_number = from_number
        self.client = client or httpx.Client(
            auth=(account_sid, auth_token), timeout=15
        )

    def send(self, request: NotificationRequest) -> NotificationResponse:
        from_number = self.from_number
        to = request.recipient
        if self.channel == "whatsapp":
            from_number = (
                from_number
                if from_number.startswith("whatsapp:")
                else f"whatsapp:{from_number}"
            )
            to = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
        response = self.client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json",
            data={"From": from_number, "To": to, "Body": request.message},
        )
        response.raise_for_status()
        return NotificationResponse(
            id=uuid4(),
            channel=request.channel,
            status="sent",
            provider=self.provider_name,
        )


class FcmPushProvider:
    def __init__(self, server_key: str, *, client: httpx.Client | None = None):
        self.channel = "push"
        self.provider_name = "firebase-cloud-messaging"
        self.server_key = server_key
        self.client = client or httpx.Client(timeout=15)

    def send(self, request: NotificationRequest) -> NotificationResponse:
        response = self.client.post(
            "https://fcm.googleapis.com/fcm/send",
            headers={
                "Authorization": f"key={self.server_key}",
                "Content-Type": "application/json",
            },
            json={
                "to": request.recipient,
                "notification": {"body": request.message},
                "data": request.data,
            },
        )
        response.raise_for_status()
        return NotificationResponse(
            id=uuid4(),
            channel=request.channel,
            status="sent",
            provider=self.provider_name,
        )


class NotificationService:
    def __init__(self, providers: dict[str, NotificationProvider]):
        self.providers = providers

    def send(self, request: NotificationRequest) -> NotificationResponse:
        return self.providers[request.channel].send(request)


def build_notification_service() -> NotificationService:
    providers: dict[str, NotificationProvider] = {
        "sms": LocalNotificationProvider("sms"),
        "whatsapp": LocalNotificationProvider("whatsapp"),
        "push": LocalNotificationProvider("push"),
    }
    if (
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_from_number
    ):
        providers["sms"] = TwilioNotificationProvider(
            "sms",
            settings.twilio_account_sid,
            settings.twilio_auth_token,
            settings.twilio_from_number,
        )
    if (
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_whatsapp_from
    ):
        providers["whatsapp"] = TwilioNotificationProvider(
            "whatsapp",
            settings.twilio_account_sid,
            settings.twilio_auth_token,
            settings.twilio_whatsapp_from,
        )
    if settings.fcm_server_key:
        providers["push"] = FcmPushProvider(settings.fcm_server_key)
    return NotificationService(providers)