from __future__ import annotations

import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.artisans import router as artisans_router
from app.api.auth import router as auth_router
from app.api.catalogue import router as catalogue_router
from app.api.notifications import router as notifications_router
from app.api.orders import router as orders_router
from app.api.products import router as products_router
from app.api.quotes import router as quotes_router
from app.api.search import router as search_router
from app.api.speech import router as speech_router
from app.api.translation import router as translation_router
from app.db.connection import close_db_pool, get_pool_manager, init_db_pool


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle: initialize and tear down database connection pool."""
    await init_db_pool()
    yield
    await close_db_pool()


app = FastAPI(
    title="ShilpSetu Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware configuration
# Conservative development defaults without wildcard credentials or exposed secrets
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Static files for persistent product image storage
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/db")
async def db_health_check() -> JSONResponse:
    """Lightweight database connectivity check (SELECT 1)."""
    pool_manager = get_pool_manager()
    try:
        is_healthy = await pool_manager.check_health()
        if is_healthy:
            return JSONResponse(
                status_code=200,
                content={"status": "ok", "database": "ok"},
            )
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unavailable"},
        )
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unavailable"},
        )


# Register verified feature routers
app.include_router(auth_router, prefix="/api")
app.include_router(catalogue_router)
app.include_router(search_router)
app.include_router(speech_router)
app.include_router(artisans_router)
app.include_router(products_router)
app.include_router(translation_router)
app.include_router(quotes_router)
app.include_router(orders_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")

