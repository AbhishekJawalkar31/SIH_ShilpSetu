from __future__ import annotations


class CatalogueServiceError(Exception):
    """Base error for catalogue service failures."""


class CatalogueProviderError(CatalogueServiceError):
    """Raised when catalogue generation cannot complete through a provider."""


class CatalogueDataValidationError(CatalogueServiceError):
    """Raised when generated catalogue data does not match the API schema."""


class CataloguePricingError(CatalogueServiceError):
    """Raised when a pricing dependency cannot return a valid recommendation."""


class ComparableDataUnavailableError(CataloguePricingError):
    """Raised when no comparable products are available for pricing."""


class InsufficientComparableDataError(CataloguePricingError):
    """Raised when too few valid comparable prices are available for pricing."""
