from __future__ import annotations

from typing import Any, Mapping

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.artisans import router as artisans_router
from app.api.auth import router as auth_router
from app.api.catalogue import get_catalogue_service
from app.api.catalogue import router as catalogue_router
from app.api.communications import (
    get_conversation_service,
    router as communications_router,
)
from app.api.notifications import router as notifications_router
from app.api.pricing import get_price_model, router as pricing_router
from app.api.products import (
    get_embedding_service,
    get_product_repository,
    get_storage_service,
)
from app.api.products import router as products_router
from app.api.translation import router as translation_router
from app.api.quotes import get_quote_matching_service, get_quote_repository
from app.api.quotes import router as quotes_router
from app.api.search import get_matching_service, get_search_service
from app.api.search import router as search_router
from app.api.speech import router as speech_router
from app.core.config import settings
from app.db.repository import InMemoryRepository, ProductRepository, SupabaseRepository
from app.services.communications.service import (
    ConversationService,
    SupabaseConversationService,
)
from app.services.catalogue.pricing import ComparableProduct, MvpPricingProvider
from app.services.catalogue.providers.base import CatalogueProvider
from app.services.catalogue.providers.gemini import (
    GeminiCatalogueProvider,
    GeminiProviderError,
)
from app.services.catalogue.service import CatalogueService
from app.services.matching.service import MatchingService
from app.services.embeddings.service import (
    EmbeddingService,
    GeminiEmbeddingProvider,
    HashEmbeddingProvider,
)
from app.services.pricing.model import MarketAwarePricingProvider, MarketPriceModel
from app.services.search.service import SearchService
from app.services.storage.service import LocalStorageService, SupabaseStorageService


class EmptyComparableSource:
    async def get_comparables(
        self, catalogue: Mapping[str, Any]
    ) -> list[ComparableProduct]:
        # The database adapter can replace this with comparable products.
        return [
            ComparableProduct(price=550, category=catalogue.get("category")),
            ComparableProduct(price=600, material=catalogue.get("material")),
            ComparableProduct(price=650, craft_type=catalogue.get("craft_type")),
        ]


class UnavailableCatalogueProvider:
    """Safe local adapter used until an AI provider key is configured."""

    async def generate_catalogue(
        self, image_bytes: bytes, mime_type: str, voice_text: str | None
    ) -> Mapping[str, Any]:
        raise GeminiProviderError(
            "Catalogue provider is not configured. Set GEMINI_API_KEY."
        )


def build_catalogue_service(price_model: MarketPriceModel) -> CatalogueService:
    provider: CatalogueProvider
    if settings.gemini_api_key:
        provider = GeminiCatalogueProvider()
    else:
        provider = UnavailableCatalogueProvider()
    return CatalogueService(
        pricing_provider=MarketAwarePricingProvider(
            price_model,
            MvpPricingProvider(EmptyComparableSource()),
        ),
        catalogue_provider=provider,
    )


def build_repository() -> ProductRepository:
    if settings.supabase_url and settings.supabase_anon_key:
        return SupabaseRepository(settings.supabase_url, settings.supabase_anon_key)
    return InMemoryRepository()


def build_embedding_service(repository: ProductRepository) -> EmbeddingService:
    if settings.gemini_api_key:
        provider = GeminiEmbeddingProvider(settings.gemini_api_key)
    else:
        provider = HashEmbeddingProvider()
    return EmbeddingService(repository, provider)


def build_storage_service():
    if settings.supabase_url and settings.supabase_anon_key:
        return SupabaseStorageService(
            settings.supabase_url,
            settings.supabase_anon_key,
            settings.supabase_storage_bucket,
        )
    return LocalStorageService()


def create_app() -> FastAPI:
    repository = build_repository()
    embedding_service = build_embedding_service(repository)
    search_service = SearchService(repository, embedding_service)
    matching_service = MatchingService(repository)
    price_model = MarketPriceModel(repository)
    catalogue_service = build_catalogue_service(price_model)
    conversation_service = (
        SupabaseConversationService(settings.supabase_url, settings.supabase_anon_key)
        if settings.supabase_url and settings.supabase_anon_key
        else ConversationService()
    )
    storage_service = build_storage_service()

    app = FastAPI(title="ShilpSetu Backend", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            origin.strip()
            for origin in settings.cors_origins.split(",")
            if origin.strip()
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.repository = repository
    app.include_router(catalogue_router)
    app.include_router(speech_router)
    app.include_router(products_router)
    app.include_router(search_router)
    app.include_router(quotes_router)
    app.include_router(artisans_router)
    app.include_router(auth_router)
    app.include_router(communications_router)
    app.include_router(notifications_router)
    app.include_router(pricing_router)
    app.include_router(translation_router)

    app.dependency_overrides[get_product_repository] = lambda: repository
    app.dependency_overrides[get_quote_repository] = lambda: repository
    app.dependency_overrides[get_search_service] = lambda: search_service
    app.dependency_overrides[get_matching_service] = lambda: matching_service
    app.dependency_overrides[get_quote_matching_service] = lambda: matching_service
    app.dependency_overrides[get_catalogue_service] = lambda: catalogue_service
    app.dependency_overrides[get_embedding_service] = lambda: embedding_service
    app.dependency_overrides[get_storage_service] = lambda: storage_service
    app.dependency_overrides[get_conversation_service] = lambda: conversation_service
    app.dependency_overrides[get_price_model] = lambda: price_model

    @app.get("/api/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed.",
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        code = "HTTP_ERROR"
        if exc.status_code == 401:
            code = "AUTHENTICATION_REQUIRED"
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": str(exc.detail),
                }
            },
        )

    return app


app = create_app()