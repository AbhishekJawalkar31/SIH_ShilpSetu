-- =============================================================================
-- ShilpSetu — Database Schema Migration
-- Migration: 001_initial_schema.sql
-- Description: Creates the 9 core MVP entities, constraints, foreign keys,
--              triggers, and pgvector semantic search table.
-- Source of Truth: DATABASE_SCHEMA.md & ARCHITECTURE.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------------------------
-- 2. Helper Functions & Triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Table: users
-- Common account information for artisans, buyers, and admins.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('artisan', 'buyer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Table: artisans
-- Artisan profile and capacity-related information.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT,
    craft_type TEXT,
    description TEXT,
    location TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    languages TEXT[] DEFAULT '{}',
    rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_artisans_updated_at ON artisans;
CREATE TRIGGER trg_artisans_updated_at
    BEFORE UPDATE ON artisans
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Table: products
-- Published/draft catalogue information.
-- Price column stores the artisan's final listed price (not AI recommendation).
-- Image stored in Supabase Storage; image_url stores the public reference URL.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    material TEXT,
    craft_type TEXT,
    tags TEXT[] DEFAULT '{}',
    attributes JSONB DEFAULT '{}'::jsonb,
    price NUMERIC(12,2) CHECK (price >= 0),
    currency TEXT DEFAULT 'INR',
    image_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Table: inventory
-- Availability and production capacity for bulk B2B matching.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    available_quantity INTEGER DEFAULT 0 CHECK (available_quantity >= 0),
    production_capacity INTEGER DEFAULT 0 CHECK (production_capacity >= 0),
    unit TEXT DEFAULT 'piece',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory;
CREATE TRIGGER trg_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Table: product_embeddings
-- Semantic-search vectors for pgvector retrieval.
-- The database uses a 768-dimensional pgvector representation. The embedding-
-- generation implementation (search-matching) must request/use 768-dimensional
-- output from the selected embedding model (e.g., gemini-embedding-2).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    embedding_model TEXT NOT NULL,
    source_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 8. Table: quote_requests
-- Buyer bulk requirements and quote requests.
-- product_id is nullable for generic natural-language requirements.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    budget_per_unit NUMERIC(12,2) CHECK (budget_per_unit >= 0),
    total_budget NUMERIC(12,2) CHECK (total_budget >= 0),
    requirement_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'accepted', 'rejected', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER trg_quote_requests_updated_at
    BEFORE UPDATE ON quote_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. Table: quote_request_artisans
-- Candidate artisans matched to satisfy bulk requirements (multi-artisan pool).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_request_artisans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    matched_quantity INTEGER CHECK (matched_quantity >= 0),
    match_score NUMERIC(6,4) CHECK (match_score >= 0 AND match_score <= 1),
    status TEXT DEFAULT 'matched' CHECK (status IN ('matched', 'contacted', 'quoted', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 10. Table: reviews
-- Buyer feedback on artisans and products (optional for 2-day MVP).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 11. Table: orders
-- Finalized purchase records (payment processing excluded from MVP).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 12. Indexes
-- Optimized for foreign keys, common queries, and vector similarity search.
-- -----------------------------------------------------------------------------

-- Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_artisans_user_id ON artisans(user_id);
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON products(artisan_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_product_embeddings_product_id ON product_embeddings(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_buyer_id ON quote_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_product_id ON quote_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_request_artisans_quote_id ON quote_request_artisans(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_request_artisans_artisan_id ON quote_request_artisans(artisan_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_artisan_id ON reviews(artisan_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_artisan_id ON orders(artisan_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- Filter & Marketplace Query Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_artisans_city_state ON artisans(city, state);
CREATE INDEX IF NOT EXISTS idx_artisans_craft_type ON artisans(craft_type);

-- GIN Indexes for Array and JSONB fields
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN(attributes);

-- pgvector Index: HNSW index using cosine distance
CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw 
    ON product_embeddings 
    USING hnsw (embedding vector_cosine_ops);
