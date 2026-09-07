from __future__ import annotations


class DatabaseError(Exception):
    """Base exception for all database operations."""


class DatabaseConfigurationError(DatabaseError):
    """Raised when database configuration or connection parameters are missing."""


class DatabaseConnectionError(DatabaseError):
    """Raised when establishing a connection to PostgreSQL fails."""


class DatabaseQueryError(DatabaseError):
    """Raised when an error occurs during SQL query execution."""


class InvalidVectorDimensionError(DatabaseError, ValueError):
    """Raised when a vector does not match the configured embedding dimension."""


class InvalidLimitError(DatabaseError, ValueError):
    """Raised when an invalid limit is supplied for semantic search."""
