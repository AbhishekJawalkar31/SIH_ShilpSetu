from __future__ import annotations

import logging
from typing import Any, Mapping, Sequence

from psycopg.rows import dict_row

from app.db.connection import DatabasePoolManager, get_pool_manager
from app.db.exceptions import DatabaseConfigurationError, DatabaseConnectionError
from app.services.catalogue.pricing import ComparableProduct, ComparableProductSource

logger = logging.getLogger(__name__)

# Curated prototype dataset based on database/seeds/002_prototype_dataset.sql
# Spanning Indian handicraft sectors: Jute, Woodcraft, Cane/Bamboo, Textiles, and Pottery.
PROTOTYPE_COMPARABLES: list[ComparableProduct] = [
    # Jute & Natural Fibre
    ComparableProduct(price=290.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=320.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=360.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=430.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=470.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=510.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=550.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=580.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=620.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=660.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=670.0, category="Jute & Natural Fibre", material="Jute", craft_type="Jute Craft"),
    ComparableProduct(price=480.0, category="Jute & Natural Fibre", material="Natural Fibre", craft_type="Grass Work"),
    ComparableProduct(price=520.0, category="Jute & Natural Fibre", material="Natural Fibre", craft_type="Grass Work"),
    ComparableProduct(price=590.0, category="Jute & Natural Fibre", material="Natural Fibre", craft_type="Natural Fibre"),

    # Wooden Utility & Decor
    ComparableProduct(price=420.0, category="Wooden Utility & Decor", material="Mango wood", craft_type="Wood Carving"),
    ComparableProduct(price=690.0, category="Wooden Utility & Decor", material="Mango wood", craft_type="Wood Carving"),
    ComparableProduct(price=760.0, category="Wooden Utility & Decor", material="Mango wood", craft_type="Wood Carving"),
    ComparableProduct(price=1000.0, category="Wooden Utility & Decor", material="Mango wood", craft_type="Wood Carving"),
    ComparableProduct(price=1090.0, category="Wooden Utility & Decor", material="Mango wood", craft_type="Wood Carving"),
    ComparableProduct(price=550.0, category="Wooden Utility & Decor", material="Sheesham wood", craft_type="Wood Carving"),
    ComparableProduct(price=850.0, category="Wooden Utility & Decor", material="Sheesham wood", craft_type="Wood Carving"),

    # Wooden Animals & Figurines
    ComparableProduct(price=620.0, category="Wooden Animals & Figurines", material="Sheesham wood", craft_type="Wood Carving"),
    ComparableProduct(price=910.0, category="Wooden Animals & Figurines", material="Sheesham wood", craft_type="Wood Carving"),
    ComparableProduct(price=970.0, category="Wooden Animals & Figurines", material="Sheesham wood", craft_type="Wood Carving"),
    ComparableProduct(price=1110.0, category="Wooden Animals & Figurines", material="Sheesham wood", craft_type="Wood Carving"),

    # Cane & Bamboo
    ComparableProduct(price=350.0, category="Cane & Bamboo", material="Bamboo", craft_type="Cane & Bamboo"),
    ComparableProduct(price=520.0, category="Cane & Bamboo", material="Bamboo", craft_type="Cane & Bamboo"),
    ComparableProduct(price=680.0, category="Cane & Bamboo", material="Bamboo", craft_type="Cane & Bamboo"),
    ComparableProduct(price=817.0, category="Cane & Bamboo", material="Bamboo", craft_type="Cane & Bamboo"),
    ComparableProduct(price=950.0, category="Cane & Bamboo", material="Cane", craft_type="Cane & Bamboo"),

    # Textiles & Embroidery
    ComparableProduct(price=325.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=437.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=518.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=574.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=655.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=711.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=848.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=985.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=1122.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=1259.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=1396.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=1533.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),
    ComparableProduct(price=1670.0, category="Textiles & Embroidery", material="Textile", craft_type="Textile (Handloom)"),

    # Pottery & Clay Objects
    ComparableProduct(price=220.0, category="Pottery & Clay Objects", material="Terracotta Clay", craft_type="Terracotta & Pottery"),
    ComparableProduct(price=340.0, category="Pottery & Clay Objects", material="Clay", craft_type="Pottery & Clay Objects"),
    ComparableProduct(price=450.0, category="Pottery & Clay Objects", material="Blue Pottery Clay", craft_type="Terracotta & Pottery"),
    ComparableProduct(price=580.0, category="Pottery & Clay Objects", material="Terracotta Clay", craft_type="Terracotta & Pottery"),
    ComparableProduct(price=720.0, category="Pottery & Clay Objects", material="Ceramic", craft_type="Pottery & Clay Objects"),
]


class DatabaseComparableProductSource:
    """Retrieves comparable products from PostgreSQL with graceful prototype seed fallback."""

    def __init__(self, pool_manager: DatabasePoolManager | None = None) -> None:
        self._pool_manager = pool_manager or get_pool_manager()

    async def get_comparables(
        self,
        catalogue: Mapping[str, Any],
    ) -> Sequence[ComparableProduct]:
        """Fetch matching products from database or prototype dataset."""
        cat = catalogue.get("category")
        mat = catalogue.get("material")
        craft = catalogue.get("craft_type")

        # 1. Attempt PostgreSQL database query if available
        db_comparables = await self._fetch_from_db(category=cat, material=mat, craft_type=craft)
        if len(db_comparables) >= 3:
            return db_comparables

        # 2. Fallback to prototype dataset
        return self._filter_prototype_dataset(category=cat, material=mat, craft_type=craft)

    async def _fetch_from_db(
        self,
        category: str | None,
        material: str | None,
        craft_type: str | None,
    ) -> list[ComparableProduct]:
        query = """
            SELECT price, category, material, craft_type
            FROM products
            WHERE status = 'published' AND price > 0
            ORDER BY
                (CASE WHEN category = %(category)s THEN 3 ELSE 0 END +
                 CASE WHEN craft_type = %(craft_type)s THEN 2 ELSE 0 END +
                 CASE WHEN material = %(material)s THEN 2 ELSE 0 END) DESC
            LIMIT 30;
        """
        try:
            async with self._pool_manager.connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cursor:
                    await cursor.execute(
                        query,
                        {
                            "category": category,
                            "material": material,
                            "craft_type": craft_type,
                        },
                    )
                    rows = await cursor.fetchall()
                    return [
                        ComparableProduct(
                            price=float(row["price"]),
                            category=row.get("category"),
                            material=row.get("material"),
                            craft_type=row.get("craft_type"),
                        )
                        for row in rows
                        if row.get("price") is not None
                    ]
        except (DatabaseConfigurationError, DatabaseConnectionError):
            logger.debug("Database is not configured or reachable; using prototype seed comparables.")
            return []
        except Exception as exc:
            logger.warning("Failed to query comparable products from database: %s", exc)
            return []

    def _filter_prototype_dataset(
        self,
        category: str | None,
        material: str | None,
        craft_type: str | None,
    ) -> list[ComparableProduct]:
        """Rank and return the most relevant comparables from the prototype seed dataset."""
        def score(p: ComparableProduct) -> int:
            s = 0
            if category and p.category:
                if category.lower() in p.category.lower() or p.category.lower() in category.lower():
                    s += 4
            if craft_type and p.craft_type:
                if craft_type.lower() in p.craft_type.lower() or p.craft_type.lower() in craft_type.lower():
                    s += 3
            if material and p.material:
                if material.lower() in p.material.lower() or p.material.lower() in material.lower():
                    s += 2
            return s

        scored = [(score(p), p) for p in PROTOTYPE_COMPARABLES]
        # Sort by score descending, maintaining deterministic order
        scored.sort(key=lambda x: x[0], reverse=True)

        # Get all positive matches
        matches = [p for s, p in scored if s > 0]
        if len(matches) >= 3:
            return matches

        # If fewer than 3 match category/material/craft_type, return top scored followed by remaining
        result = [p for _, p in scored]
        return result[:15]
