from __future__ import annotations

from typing import Protocol
from uuid import UUID

import httpx


class StorageService(Protocol):
    def upload_product_image(
        self, product_id: UUID, image_bytes: bytes, mime_type: str
    ) -> str: ...


class LocalStorageService:
    """Safe local adapter used when Supabase Storage is not configured."""

    def upload_product_image(
        self, product_id: UUID, image_bytes: bytes, mime_type: str
    ) -> str:
        return f"local://product-images/{product_id}"


class SupabaseStorageService:
    def __init__(
        self,
        url: str,
        key: str,
        bucket: str = "product-images",
        *,
        timeout: float = 20.0,
        client: httpx.Client | None = None,
    ) -> None:
        self.url = url.rstrip("/")
        self.bucket = bucket
        self.client = client or httpx.Client(timeout=timeout)
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/octet-stream",
            "x-upsert": "true",
        }

    def upload_product_image(
        self, product_id: UUID, image_bytes: bytes, mime_type: str
    ) -> str:
        path = f"{product_id}/original"
        response = self.client.post(
            f"{self.url}/storage/v1/object/{self.bucket}/{path}",
            content=image_bytes,
            headers={**self.headers, "Content-Type": mime_type},
        )
        response.raise_for_status()
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{path}"