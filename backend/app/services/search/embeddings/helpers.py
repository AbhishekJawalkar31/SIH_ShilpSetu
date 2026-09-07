from __future__ import annotations

from typing import Any, Mapping

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.search import SearchIntent


class ProductEmbeddingInput(BaseModel):
    """Input representation of a product for deterministic embedding source text generation."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: str | None = None
    craft_type: str | None = None
    material: str | None = None
    tags: list[str] | None = None
    attributes: Mapping[str, Any] | None = None


def build_product_source_text(product: ProductEmbeddingInput) -> str:
    """Construct deterministic searchable text from documented product fields.

    Format:
        Title: {title}
        Category: {category}
        Craft: {craft_type}
        Material: {material}
        Description: {description}
        Tags: {tag_1, tag_2, ...}
        Attributes: {key_1: val_1, key_2: val_2, ...}
    """
    lines: list[str] = []

    title = product.title.strip()
    if title:
        lines.append(f"Title: {title}")

    if product.category and product.category.strip():
        lines.append(f"Category: {product.category.strip()}")

    if product.craft_type and product.craft_type.strip():
        lines.append(f"Craft: {product.craft_type.strip()}")

    if product.material and product.material.strip():
        lines.append(f"Material: {product.material.strip()}")

    description = product.description.strip()
    if description:
        lines.append(f"Description: {description}")

    if product.tags:
        cleaned_tags = [t.strip() for t in product.tags if t and t.strip()]
        if cleaned_tags:
            lines.append(f"Tags: {', '.join(cleaned_tags)}")

    if product.attributes:
        # Deterministically sort attribute keys to guarantee reproducible output
        sorted_attr_items = sorted(
            (k.strip(), str(v).strip())
            for k, v in product.attributes.items()
            if k and k.strip() and v is not None and str(v).strip()
        )
        if sorted_attr_items:
            formatted_attrs = ", ".join(f"{k}: {v}" for k, v in sorted_attr_items)
            lines.append(f"Attributes: {formatted_attrs}")

    return "\n".join(lines)


def build_query_embedding_text(intent: SearchIntent) -> str:
    """Construct the semantic portion of a buyer query for vector embedding.

    Extracts product and use_case. Strips non-semantic numeric constraints
    (quantity, budget) which are handled downstream as filters.
    """
    product = intent.product.strip()
    if not product:
        raise ValueError("SearchIntent product must not be empty.")

    if intent.use_case and intent.use_case.strip():
        return f"{product} for {intent.use_case.strip()}"

    return product
