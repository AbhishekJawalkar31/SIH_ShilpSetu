-- ShilpSetu Database Migration: 001_pgvector_init.sql
-- Enables pgvector extension and creates product_embeddings table.
-- Note: 'products' table schema is owned and created by the database branch (DATABASE_SCHEMA.md §5).

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Product embeddings table with vector(768)
CREATE TABLE IF NOT EXISTS product_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL,
    embedding_model TEXT NOT NULL,
    source_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Cosine similarity index for semantic search
CREATE INDEX IF NOT EXISTS idx_product_embeddings_cosine
ON product_embeddings
USING hnsw (embedding vector_cosine_ops);
