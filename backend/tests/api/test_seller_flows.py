from __future__ import annotations

import base64
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.schemas.auth import AuthUser, TokenResponse
from app.schemas.catalogue import CatalogueGenerationResponse
from app.schemas.notification import NotificationListResponse
from app.schemas.order import OrderItemResponse, OrderListResponse, OrderResponse
from app.schemas.product import ProductListResponse, ProductResponse

VALID_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# =============================================================================
# FLOW A — AUTH: Register -> Login -> Token -> /api/auth/me
# =============================================================================

def test_flow_a_seller_registration_and_authentication(client: TestClient) -> None:
    """Verify that an artisan can register, log in, and retrieve profile from /api/auth/me."""
    artisan_user_id = uuid4()
    artisan_profile_id = uuid4()

    mock_auth_user = AuthUser(
        id=artisan_user_id,
        name="Sunita Devi",
        email="sunita@shilpsetu.in",
        role="artisan",
        artisan_id=artisan_profile_id,
        is_active=True,
    )
    token = create_access_token({
        "sub": str(artisan_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_profile_id),
    })
    mock_token_response = TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=3600,
        user=mock_auth_user,
    )

    with patch("app.api.auth._service.register", new=AsyncMock(return_value=mock_token_response)):
        reg_response = client.post(
            "/api/auth/register",
            json={
                "name": "Sunita Devi",
                "email": "sunita@shilpsetu.in",
                "password": "securepassword123",
                "role": "artisan",
                "business_name": "Devi Jute Works",
                "craft_type": "Jute Craft",
                "city": "Kolkata",
                "state": "West Bengal",
            },
        )
        assert reg_response.status_code == 201
        data = reg_response.json()
        assert data["access_token"] == token
        assert data["user"]["role"] == "artisan"
        assert data["user"]["artisan_id"] == str(artisan_profile_id)

    # Login flow
    with patch("app.api.auth._service.login", new=AsyncMock(return_value=mock_token_response)):
        login_response = client.post(
            "/api/auth/login",
            json={"email": "sunita@shilpsetu.in", "password": "securepassword123"},
        )
        assert login_response.status_code == 200
        assert login_response.json()["access_token"] == token

    # Current user /me flow
    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["id"] == str(artisan_user_id)
    assert me_data["role"] == "artisan"
    assert me_data["artisan_id"] == str(artisan_profile_id)


# =============================================================================
# FLOW B — AI CATALOGUE: Image + Context -> Structured Metadata + Pricing
# =============================================================================

def test_flow_b_catalogue_generation_and_distinct_pricing(client: TestClient) -> None:
    """Verify image upload + optional voice context yields structured catalogue metadata and distinct price ranges."""
    artisan_id = uuid4()

    from app.api.catalogue import get_catalogue_service
    from app.services.catalogue.pricing import MvpPricingProvider
    from app.services.catalogue.repository import DatabaseComparableProductSource
    from app.services.catalogue.service import CatalogueService

    class MockMultimodalProvider:
        def __init__(self, cat_dict: dict) -> None:
            self._cat = cat_dict

        async def generate_catalogue(self, image_bytes: bytes, mime_type: str, voice_text: str | None) -> dict:
            result = dict(self._cat)
            if voice_text:
                result["description"] = f"{result['description']} Context: {voice_text}"
            return result

    # Test Product A: Jute Tote Bag
    jute_ai_data = {
        "title": "Eco-friendly Handwoven Jute Tote Bag",
        "description": "Natural woven jute bag with strong handles.",
        "category": "Jute & Natural Fibre",
        "material": "Jute",
        "craft_type": "Jute Craft",
        "tags": ["jute", "handwoven", "bag", "eco-friendly"],
        "attributes": {"color": "natural tan", "capacity": "15L"},
    }
    jute_service = CatalogueService(
        pricing_provider=MvpPricingProvider(DatabaseComparableProductSource()),
        catalogue_provider=MockMultimodalProvider(jute_ai_data),
    )

    app.dependency_overrides[get_catalogue_service] = lambda: jute_service
    try:
        response = client.post(
            "/api/catalogue/generate",
            files={"image": ("jute_bag.png", VALID_PNG, "image/png")},
            data={"artisan_id": str(artisan_id), "voice_text": "Made using local Bengal jute fibers"},
        )
        assert response.status_code == 200
        res_a = response.json()
        assert res_a["title"] == "Eco-friendly Handwoven Jute Tote Bag"
        assert res_a["material"] == "Jute"
        assert "Context: Made using local Bengal jute fibers" in res_a["description"]
        assert res_a["recommended_price_min"] > 0
        assert res_a["recommended_price_max"] >= res_a["recommended_price_min"]
        jute_price_range = (res_a["recommended_price_min"], res_a["recommended_price_max"])

        # Test Product B: Wooden Jewelry Box (must receive different pricing)
        wood_ai_data = {
            "title": "Carved Sheesham Wood Jewelry Box",
            "description": "Hand-carved wooden storage box with brass latch.",
            "category": "Wooden Utility & Decor",
            "material": "Mango wood",
            "craft_type": "Wood Carving",
            "tags": ["wooden", "carving", "jewelry-box", "traditional"],
            "attributes": {"wood_type": "mango", "finish": "matte"},
        }
        wood_service = CatalogueService(
            pricing_provider=MvpPricingProvider(DatabaseComparableProductSource()),
            catalogue_provider=MockMultimodalProvider(wood_ai_data),
        )
        app.dependency_overrides[get_catalogue_service] = lambda: wood_service

        response_b = client.post(
            "/api/catalogue/generate",
            files={"image": ("wood_box.png", VALID_PNG, "image/png")},
            data={"artisan_id": str(artisan_id)},
        )
        assert response_b.status_code == 200
        res_b = response_b.json()
        assert res_b["title"] == "Carved Sheesham Wood Jewelry Box"
        wood_price_range = (res_b["recommended_price_min"], res_b["recommended_price_max"])

        # Assert pricing is genuinely product-specific
        assert jute_price_range != wood_price_range
    finally:
        app.dependency_overrides.pop(get_catalogue_service, None)


# =============================================================================
# FLOW C — PRODUCT CREATION: Image Upload -> Product Create -> Persistence
# =============================================================================

def test_flow_c_product_creation_and_listing(client: TestClient) -> None:
    """Verify image upload followed by authenticated product creation and listing."""
    artisan_user_id = uuid4()
    artisan_id = uuid4()
    product_id = uuid4()
    now = datetime.now(timezone.utc)

    token = create_access_token({
        "sub": str(artisan_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_id),
    })

    # 1. Upload Product Image
    upload_res = client.post(
        "/api/products/upload-image",
        files={"image": ("product.png", VALID_PNG, "image/png")},
    )
    assert upload_res.status_code == 201
    image_url = upload_res.json()["image_url"]
    assert image_url.startswith("/uploads/products/")

    # 2. Create Product
    mock_product = ProductResponse(
        id=product_id,
        artisan_id=artisan_id,
        title="Handcrafted Terracotta Vase",
        description="Traditional earthenware vase.",
        category="Pottery & Clay Objects",
        material="Terracotta Clay",
        craft_type="Terracotta & Pottery",
        tags=["pottery", "terracotta", "vase"],
        attributes={"height": "25cm"},
        price=450.0,
        currency="INR",
        image_url=image_url,
        status="published",
        available_quantity=20,
        production_capacity=50,
        unit="piece",
        created_at=now,
        updated_at=now,
    )

    from app.api.products import get_embedding_sync_service, get_product_repository, get_product_write_repository

    mock_write_repo = AsyncMock()
    mock_write_repo.create_product = AsyncMock(return_value=mock_product)

    mock_sync = AsyncMock()
    mock_sync.sync_product = AsyncMock()

    mock_read_repo = AsyncMock()
    mock_read_repo.list_products = AsyncMock(
        return_value=ProductListResponse(products=[mock_product], total=1, limit=50, offset=0)
    )

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    app.dependency_overrides[get_embedding_sync_service] = lambda: mock_sync
    app.dependency_overrides[get_product_repository] = lambda: mock_read_repo

    try:
        create_res = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "artisan_id": str(artisan_id),
                "title": "Handcrafted Terracotta Vase",
                "description": "Traditional earthenware vase.",
                "category": "Pottery & Clay Objects",
                "material": "Terracotta Clay",
                "craft_type": "Terracotta & Pottery",
                "tags": ["pottery", "terracotta", "vase"],
                "attributes": {"height": "25cm"},
                "price": 450.0,
                "currency": "INR",
                "image_url": image_url,
                "status": "published",
                "available_quantity": 20,
                "production_capacity": 50,
                "unit": "piece",
            },
        )
        assert create_res.status_code == 201
        created_data = create_res.json()
        assert created_data["id"] == str(product_id)
        assert created_data["image_url"] == image_url
        assert created_data["available_quantity"] == 20

        # 3. List Artisan Products
        list_res = client.get(
            f"/api/products?artisan_id={artisan_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_res.status_code == 200
        products = list_res.json()["products"]
        assert len(products) == 1
        assert products[0]["id"] == str(product_id)
        assert products[0]["title"] == "Handcrafted Terracotta Vase"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)
        app.dependency_overrides.pop(get_embedding_sync_service, None)
        app.dependency_overrides.pop(get_product_repository, None)


# =============================================================================
# FLOW D — INVENTORY: Update Own Product Inventory
# =============================================================================

def test_flow_d_inventory_update(client: TestClient) -> None:
    """Verify an artisan can update available stock and production capacity for their product."""
    artisan_user_id = uuid4()
    artisan_id = uuid4()
    product_id = uuid4()
    now = datetime.now(timezone.utc)

    token = create_access_token({
        "sub": str(artisan_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_id),
    })

    mock_updated_product = ProductResponse(
        id=product_id,
        artisan_id=artisan_id,
        title="Handcrafted Terracotta Vase",
        description="Traditional earthenware vase.",
        category="Pottery & Clay Objects",
        material="Terracotta Clay",
        craft_type="Terracotta & Pottery",
        tags=["pottery"],
        attributes={},
        price=450.0,
        currency="INR",
        image_url="/uploads/products/sample.png",
        status="published",
        available_quantity=35,
        production_capacity=75,
        unit="piece",
        created_at=now,
        updated_at=now,
    )

    from app.api.products import get_product_write_repository
    mock_write_repo = AsyncMock()
    mock_write_repo.update_inventory = AsyncMock(return_value=mock_updated_product)

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        response = client.put(
            f"/api/products/{product_id}/inventory",
            headers={"Authorization": f"Bearer {token}"},
            json={"available_quantity": 35, "production_capacity": 75, "unit": "piece"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["available_quantity"] == 35
        assert data["production_capacity"] == 75
        mock_write_repo.update_inventory.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


# =============================================================================
# FLOW E — AUTHORIZATION / IDOR REJECTION
# =============================================================================

def test_flow_e_idor_rejection(client: TestClient) -> None:
    """Verify that Artisan A cannot create products or update inventory on behalf of Artisan B."""
    artisan_a_user_id = uuid4()
    artisan_a_id = uuid4()
    artisan_b_id = uuid4()
    product_b_id = uuid4()

    token_a = create_access_token({
        "sub": str(artisan_a_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_a_id),
    })

    # 1. Artisan A tries to create a product for Artisan B
    create_res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "artisan_id": str(artisan_b_id),  # Belongs to Artisan B!
            "title": "Malicious Product",
            "description": "Unauthorized attempt",
        },
    )
    assert create_res.status_code == 403
    assert create_res.json()["error"]["code"] == "FORBIDDEN"

    # 2. Artisan A tries to update Artisan B's inventory
    from app.api.products import get_product_write_repository
    from app.services.product.write_repository import ProductNotFoundError

    mock_write_repo = AsyncMock()
    # Write repository checks expected_artisan_id and raises ProductNotFoundError if not matched
    mock_write_repo.update_inventory = AsyncMock(side_effect=ProductNotFoundError("Product was not found or access denied."))

    app.dependency_overrides[get_product_write_repository] = lambda: mock_write_repo
    try:
        inv_res = client.put(
            f"/api/products/{product_b_id}/inventory",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"available_quantity": 999, "production_capacity": 999},
        )
        assert inv_res.status_code == 404
        assert inv_res.json()["error"]["code"] == "PRODUCT_NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_product_write_repository, None)


# =============================================================================
# FLOW F — ORDERS & NOTIFICATIONS: Scoped Access Only
# =============================================================================

def test_flow_f_artisan_orders_and_notifications_scoping(client: TestClient) -> None:
    """Verify that order listings and notifications are automatically scoped to the authenticated seller."""
    artisan_user_id = uuid4()
    artisan_id = uuid4()
    unrelated_order_id = uuid4()
    now = datetime.now(timezone.utc)

    token = create_access_token({
        "sub": str(artisan_user_id),
        "role": "artisan",
        "artisan_id": str(artisan_id),
    })

    # 1. Orders Listing Scoping
    with patch("app.api.orders._service.list_orders", new=AsyncMock(return_value=OrderListResponse(items=[], total=0, limit=50, offset=0))) as mock_list_orders:
        res = client.get("/api/orders", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        # Verify artisan_id in service query was forced to current_user.artisan_id
        mock_list_orders.assert_awaited_once_with(
            buyer_id=None,
            artisan_id=artisan_id,
            status=None,
            limit=50,
            offset=0,
        )

    # 2. Order Details Access Denied for Unrelated Order
    unrelated_order = OrderResponse(
        id=unrelated_order_id,
        buyer_id=uuid4(),
        artisan_id=uuid4(),  # Different artisan
        quantity=5,
        unit_price=100.0,
        total_price=500.0,
        status="confirmed",
        created_at=now,
        updated_at=now,
        items=[
            OrderItemResponse(
                id=uuid4(),
                order_id=unrelated_order_id,
                product_id=uuid4(),
                artisan_id=uuid4(),  # Different artisan
                quantity=5,
                unit_price=100.0,
                total_price=500.0,
                created_at=now,
            )
        ],
    )

    with patch("app.api.orders._service.get_order", new=AsyncMock(return_value=unrelated_order)):
        order_res = client.get(
            f"/api/orders/{unrelated_order_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert order_res.status_code == 403
        assert order_res.json()["detail"]["code"] == "FORBIDDEN"

    # 3. Notifications Scoping
    with patch("app.api.notifications._service.list_notifications", new=AsyncMock(return_value=NotificationListResponse(items=[], total=0, unread_count=0))) as mock_list_notif:
        notif_res = client.get(
            "/api/notifications",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert notif_res.status_code == 200
        mock_list_notif.assert_awaited_once_with(
            user_id=artisan_user_id,
            unread_only=False,
            limit=50,
            offset=0,
        )
